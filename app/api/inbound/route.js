import { redis } from '@/lib/apikey'
import { NextResponse } from 'next/server'

// Pakai Node.js runtime (lebih stabil untuk multipart/form-data)
export const runtime = 'nodejs'

/** Extract pure email dari format "Name <email@domain.com>" atau raw email */
function extractEmail(raw = '') {
  const str = String(raw).trim().toLowerCase()
  if (!str) return ''

  const angle = str.match(/<([^>]+)>/)
  if (angle) return angle[1].trim().toLowerCase()

  // Ambil email pertama jika ada
  const email = str.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  return email ? email[0].toLowerCase() : str
}

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('📧 Brevo Inbound:', body)

<<<<<<< HEAD
    // Debug: log semua field yang dikirim SendGrid
    const allFields = {}
    for (const [k, v] of formData.entries()) {
      // Jangan log attachment binary
      if (typeof v === 'string') allFields[k] = v.substring(0, 200)
      else allFields[k] = `[File: ${v.name || 'unknown'}]`
    }
    console.log('📦 SendGrid fields:', Object.keys(allFields))

    const fromRaw = formData.get('from') || ''
    const subject = formData.get('subject') || '(Tanpa Subjek)'
    const text = formData.get('text') || ''
    const html = formData.get('html') || ''
    const envelopeRaw = formData.get('envelope') || ''

    // 1) Prioritas: envelope.to (paling akurat dari SendGrid)
    // 2) Fallback: field "to"
    let to = ''
    let from = extractEmail(fromRaw)

    if (envelopeRaw) {
      try {
        const envelope = JSON.parse(envelopeRaw)
        // envelope.to biasanya array: ["user@pro.fawk.biz.id"]
        if (Array.isArray(envelope.to) && envelope.to.length > 0) {
          to = extractEmail(envelope.to[0])
        }
        if (envelope.from) {
          from = extractEmail(envelope.from)
        }
      } catch (e) {
        console.warn('⚠️ Gagal parse envelope:', e.message, envelopeRaw?.substring?.(0, 100))
      }
    }

    // Fallback ke field "to" biasa
    if (!to) {
      to = extractEmail(formData.get('to') || '')
    }

    console.log('📧 Parsed:', { from, to, subject: subject.substring(0, 80) })

    if (!to) {
      console.error('❌ Missing "to" address. Fields:', allFields)
      // Tetap return 200 agar SendGrid tidak retry terus
      return NextResponse.json(
        { success: false, error: 'Missing to field' },
        { status: 200 }
      )
=======
    // Brevo mengirim data dalam format JSON
    const to = body.to[0]?.email?.toLowerCase()
    const from = body.from?.email
    const subject = body.subject || '(No Subject)'
    const html = body.htmlContent || ''
    const text = body.textContent || ''

    if (!to) {
      return NextResponse.json({ error: 'Recipient missing' }, { status: 400 })
>>>>>>> 4b9c07b2aa30acb535dfe41c7f4345a3d68987c8
    }

    // Validasi domain (opsional, sesuaikan)
    // if (!to.endsWith('@pro.fawk.biz.id')) {
    //   console.warn('⚠️ Domain tidak dikenali:', to)
    // }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const key = `mail:${to}:${id}`

<<<<<<< HEAD
    // Extract links dari text + html
    const searchArea = (String(text) + ' ' + String(html)).replace(/&amp;/g, '&')
    const links = [
      ...new Set(
        [...searchArea.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((m) =>
          m[0].replace(/[.,;:!?)]+$/, '') // trim trailing punctuation
        )
      ),
    ]

    const data = {
      id,
      from: from || fromRaw || 'unknown',
      to,
      subject: String(subject).substring(0, 500),
      body: String(text).substring(0, 15000),
      html: String(html).substring(0, 30000),
      links,
      time: new Date().toISOString(),
    }

    // Simpan ke Redis
    await redis.set(key, data, { ex: 86400 }) // 24 jam
    await redis.sadd(setKey, id)
    await redis.expire(setKey, 86400)

    console.log('✅ Email disimpan:', { key, setKey, id, to })

    return NextResponse.json({ success: true, id, to })
  } catch (err) {
    console.error('❌ Error inbound:', err)
    // Return 200 biar SendGrid tidak spam retry (kecuali Anda ingin retry)
    // Ganti ke 500 jika ingin SendGrid retry otomatis
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
=======
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
>>>>>>> 4b9c07b2aa30acb535dfe41c7f4345a3d68987c8
  }
}
