import { NextResponse } from 'next/server'
import {
  redis,
  API_KEY_PREFIX,
  API_KEY_SET,
  generateApiKey,
  getExpiryTimestamp,
  safeParse,
} from '@/lib/redis'

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
    // Ambil semua key dari Set (BUKAN pakai keys())
    const keyList = await redis.smembers(API_KEY_SET)
    const data = []
    const expiredKeys = []

    for (const apiKey of keyList) {
      const val = await redis.get(`${API_KEY_PREFIX}${apiKey}`)
      if (val) {
        const obj = safeParse(val)
        data.push({
          key: apiKey,
          ...obj,
        })
      } else {
        // Key sudah expired/dihapus dari Redis, hapus dari Set
        expiredKeys.push(apiKey)
      }
    }

    // Bersihkan key yang sudah tidak ada
    if (expiredKeys.length > 0) {
      await redis.srem(API_KEY_SET, ...expiredKeys)
    }

    data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    return NextResponse.json({ success: true, keys: data })
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
    const data = {
      name,
      durationDays: dur,
      expiry: getExpiryTimestamp(dur),
      createdAt: Date.now(),
      active: true,
    }

    // Simpan data key dengan TTL
    await redis.set(`${API_KEY_PREFIX}${apiKey}`, data, {
      ex: dur * 24 * 60 * 60,
    })

    // Tambahkan ke Set untuk tracking
    await redis.sadd(API_KEY_SET, apiKey)

    return NextResponse.json({
      success: true,
      apiKey,
      data,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}