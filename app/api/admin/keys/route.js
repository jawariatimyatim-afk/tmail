import { NextResponse } from 'next/server'
import {
  redis,
  API_KEY_PREFIX,
  generateApiKey,
  getExpiryTimestamp,
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
    const keys = await redis.keys(`${API_KEY_PREFIX}*`)
    const data = []

    for (const k of keys) {
      const val = await redis.get(k)
      if (val) {
        data.push({
          key: k.replace(API_KEY_PREFIX, ''),
          ...(typeof val === 'string' ? JSON.parse(val) : val),
        })
      }
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

    await redis.set(`${API_KEY_PREFIX}${apiKey}`, data, {
      ex: dur * 24 * 60 * 60,
    })

    return NextResponse.json({
      success: true,
      apiKey,
      data,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}