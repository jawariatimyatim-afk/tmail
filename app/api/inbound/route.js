import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    
    // Postmark format
    const to = formData.get('ToFull') || formData.get('To')
    const from = formData.get('FromFull') || formData.get('From')
    const subject = formData.get('Subject') || '(No Subject)'
    const textBody = formData.get('TextBody') || ''
    const htmlBody = formData.get('HtmlBody') || ''

    console.log('📧 Email from Postmark:', { to, from, subject })

    if (!to) {
      return NextResponse.json({ error: 'No recipient' }, { status: 400 })
    }

    // Parse "Name <email@domain.com>" format
    const emailMatch = to.match(/<([^>]+)>/)
    const recipientEmail = emailMatch ? emailMatch[1] : to.toLowerCase().trim()

    const emailData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      from,
      subject,
      body: textBody,
      html: htmlBody,
      date: new Date().toISOString()
    }

    // Get existing emails
    const existing = await redis.get(`email:${recipientEmail}`)
    const emails = Array.isArray(existing) ? existing : []

    // Add new email
    emails.push(emailData)

    // Save with 1 hour expiry
    await redis.set(`email:${recipientEmail}`, JSON.stringify(emails), { ex: 3600 })

    console.log('✅ Email saved to Redis:', recipientEmail)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
