import { NextResponse } from 'next/server'
import { redis, MAIL_SET_PREFIX, safeParse } from '@/lib/redis'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, messages: [] },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase()
    const setKey = `${MAIL_SET_PREFIX}${emailLower}`

    // Ambil ID email dari Set (BUKAN pakai keys())
    const mailIds = await redis.smembers(setKey)
    const messages = []
    const expiredIds = []

    for (const id of mailIds) {
      const value = await redis.get(`mail:${emailLower}:${id}`)
      const msg = safeParse(value)
      if (msg) {
        messages.push(msg)
      } else {
        expiredIds.push(id)
      }
    }

    // Bersihkan email yang sudah expired
    if (expiredIds.length > 0) {
      await redis.srem(setKey, ...expiredIds)
    }

    messages.sort((a, b) => new Date(b.time) - new Date(a.time))

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages,
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, messages: [] },
      { status: 500 }
    )
  }
}