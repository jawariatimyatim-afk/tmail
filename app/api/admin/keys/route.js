import { NextResponse } from 'next/server'
import {
  redis,
  API_KEY_PREFIX,
  API_KEY_SET,
  generateApiKey,
  getExpiryTimestamp,
  safeParse,
} from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function checkAuth(req) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  const [user, pass] = auth ? auth.split(':') : []
  return user === process.env.ADMIN_USERNAME && pass === process.env.ADMIN_PASSWORD
}

export async function GET(req) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const keyList = await redis.smembers(API_KEY_SET)
    const data = []
    const toRemove = []
    const now = Date.now() // SERVER TIME

    for (const apiKey of keyList) {
      const val = await redis.get(`${API_KEY_PREFIX}${apiKey}`)

      if (val) {
        const obj = safeParse(val)

        // Cek apakah sudah expired
        if (now >= obj.expiry) {
          // Hapus key expired dari Redis & Set
          await redis.del(`${API_KEY_PREFIX}${apiKey}`)
          toRemove.push(apiKey)
        } else {
          // Key masih aktif
          data.push({
            key: apiKey,
            ...obj,
            serverTime: now, // kirim server time
          })
        }
      } else {
        // Key sudah tidak ada di Redis (auto-expired TTL)
        toRemove.push(apiKey)
      }
    }

    // Bersihkan semua key expired dari Set sekaligus
    if (toRemove.length > 0) {
      await redis.srem(API_KEY_SET, ...toRemove)
    }

    data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    return NextResponse.json({
      success: true,
      keys: data,
      serverTime: now,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, duration } = await req.json()
    const dur = Number(duration)

    if (!name || ![3, 7, 30].includes(dur)) {
      return NextResponse.json(
        { error: 'Duration harus 3, 7, atau 30 hari' },
        { status: 400 }
      )
    }

    const apiKey = generateApiKey()
    const now = Date.now()
    const data = {
      name,
      durationDays: dur,
      expiry: getExpiryTimestamp(dur), // timestamp absolut
      createdAt: now,
      active: true,
    }

    // Simpan dengan TTL (auto-delete saat expired)
    await redis.set(`${API_KEY_PREFIX}${apiKey}`, data, {
      ex: dur * 24 * 60 * 60,
    })

    // Tambah ke Set untuk tracking
    await redis.sadd(API_KEY_SET, apiKey)

    return NextResponse.json({
      success: true,
      apiKey,
      data,
      serverTime: now,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}