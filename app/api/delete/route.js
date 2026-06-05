import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const id = searchParams.get('id')

    if (!email || !id) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    await redis.del(`mail:${email.toLowerCase()}:${id}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}