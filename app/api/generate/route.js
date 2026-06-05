import { NextResponse } from 'next/server'

export async function GET() {
  const domain = process.env.DOMAIN || 'pro.fawk.biz.id'

  // Random unik dengan timestamp
  const random =
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString(36).substring(4, 8)

  return NextResponse.json(
    {
      success: true,
      email: `${random}@${domain}`,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}