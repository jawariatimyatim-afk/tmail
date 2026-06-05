import { NextResponse } from 'next/server'
import { redis, MAIL_SET_PREFIX } from '@/lib/redis'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const id = searchParams.get('id')

    if (!email || !id) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const emailLower = email.toLowerCase()

    // Hapus email
    await redis.del(`mail:${emailLower}:${id}`)

    // Hapus dari Set inbox
    await redis.srem(`${MAIL_SET_PREFIX}${emailLower}`, id)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}