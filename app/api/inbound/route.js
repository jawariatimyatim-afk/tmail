import { redis } from '@/lib/apikey'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('📧 Brevo Inbound:', body)

    // Brevo mengirim data dalam format JSON
    const to = body.to[0]?.email?.toLowerCase()
    const from = body.from?.email
    const subject = body.subject || '(No Subject)'
    const html = body.htmlContent || ''
    const text = body.textContent || ''

    if (!to) {
      return NextResponse.json({ error: 'Recipient missing' }, { status: 400 })
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const key = `mail:${to}:${id}`

    const emailData = {
      id,
      from,
      subject,
      body: text,
      html,
      time: new Date().toISOString()
    }

    // Get existing emails
    const existing = await redis.get(`email:${to}`)
    const emails = existing ? JSON.parse(existing) : []

    // Add new
    emails.push(emailData)

    // Save with 24h expiry
    await redis.set(`email:${to}`, JSON.stringify(emails), { ex: 86400 })

    console.log('✅ Email saved:', emailData.id)
    return NextResponse.json({ success: true, id: emailData.id })
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
