import { NextResponse } from 'next/server'
import { redis, API_KEY_PREFIX, safeParse } from '@/lib/redis'

export async function POST(request) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'API Key wajib diisi' },
        { status: 400 }
      )
    }

    const data = await redis.get(`${API_KEY_PREFIX}${apiKey}`)
    if (!data) {
      return NextResponse.json({ valid: false, error: 'Key tidak ditemukan' })
    }

    const obj = safeParse(data)
    const now = Date.now()

    if (!obj.active || now > obj.expiry) {
      return NextResponse.json({
        valid: false,
        error: 'Key expired / tidak aktif',
      })
    }

    const daysRemaining = Math.ceil((obj.expiry - now) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      valid: true,
      name: obj.name,
      durationDays: obj.durationDays || null,
      daysRemaining,
      expiryDate: obj.expiry,
    })
  } catch (e) {
    return NextResponse.json(
      { valid: false, error: e.message },
      { status: 500 }
    )
  }
}