import { NextResponse } from 'next/server'
import { redis, MAIL_SET_PREFIX } from '@/lib/redis'

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
    const formData = await request.formData()

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
    }

    // Validasi domain (opsional, sesuaikan)
    // if (!to.endsWith('@pro.fawk.biz.id')) {
    //   console.warn('⚠️ Domain tidak dikenali:', to)
    // }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const key = `mail:${to}:${id}`
    const setKey = `${MAIL_SET_PREFIX}${to}`

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
  }
}