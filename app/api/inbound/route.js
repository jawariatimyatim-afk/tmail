import { NextResponse } from 'next/server'
import { redis, MAIL_SET_PREFIX } from '@/lib/redis'

export async function POST(request) {
  try {
    const formData = await request.formData()

    // SendGrid kirim field standar
    let to = (formData.get('to') || '').toLowerCase().trim()
    let from = (formData.get('from') || '').trim()
    const subject = (formData.get('subject') || '(Tanpa Subjek)').trim()
    const text = (formData.get('text') || '').trim()
    const html = (formData.get('html') || '').trim()

    // ✅ FIX PENTING: SendGrid kirim "envelope" sebagai JSON string
    // Ini lebih reliable daripada field "to" karena berisi email tujuan sebenarnya
    const envelope = formData.get('envelope')
    if (envelope) {
      try {
        const env = JSON.parse(envelope)
        if (env.to && Array.isArray(env.to) && env.to.length > 0) {
          to = env.to[0].toLowerCase().trim() // Ambil recipient pertama
        }
        if (env.from) {
          from = env.from.trim()
        }
      } catch (e) {
        console.log('Gagal parse envelope:', e.message)
      }
    }

    // ✅ Extract email dari format: "Nama <email@domain.com>"
    const extractEmail = (str) => {
      const match = str.match(/<([^>]+)>/)
      return match ? match[1].toLowerCase().trim() : str.toLowerCase().trim()
    }

    to = extractEmail(to)
    from = extractEmail(from)

    if (!to || !to.includes('@')) {
      console.log('❌ Invalid to field:', to)
      return NextResponse.json(
        { success: false, error: 'Missing or invalid to field' },
        { status: 400 }
      )
    }

    console.log('📧 Email masuk untuk:', to)

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const key = `mail:${to}:${id}`
    const setKey = `${MAIL_SET_PREFIX}${to}`

    // Extract links dari text + html
    const searchArea = (text + ' ' + html).replace(/&amp;/g, '&')
    const links = [
      ...new Set(
        [...searchArea.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((m) => m[0])
      ),
    ]

    const data = {
      id,
      from,
      subject,
      body: text.substring(0, 15000),
      html: html.substring(0, 30000),
      links,
      time: new Date().toISOString(),
    }

    // Simpan ke Redis
    await redis.set(key, data, { ex: 86400 })
    await redis.sadd(setKey, id)
    await redis.expire(setKey, 86400)

    console.log('✅ Email tersimpan:', { to, id, subject })

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('❌ Error inbound webhook:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}