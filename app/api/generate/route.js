import { NextResponse } from 'next/server'

export async function GET() {
  const domain = process.env.DOMAIN || 'pro.fawk.biz.id'
  const random = Math.random().toString(36).substring(2, 10)

  return NextResponse.json({
    success: true,
    email: `${random}@${domain}`,
  })
}