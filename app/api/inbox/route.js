import { NextResponse } from 'next/server'
import { redis, safeParse } from '@/lib/redis'

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

    const keys = await redis.keys(`mail:${email.toLowerCase()}:*`)
    const messages = []

    for (const key of keys) {
      const value = await redis.get(key)
      const msg = safeParse(value)
      if (msg) messages.push(msg)
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