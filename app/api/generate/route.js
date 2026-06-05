import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const domain = process.env.DOMAIN || 'pro.fawk.biz.id'

  // Generate random yang BENAR-BENAR unik
  const part1 = Math.random().toString(36).substring(2, 10)
  const part2 = Date.now().toString(36).slice(-4)
  const random = part1 + part2

  return NextResponse.json(
    {
      success: true,
      email: `${random}@${domain}`,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  )
}