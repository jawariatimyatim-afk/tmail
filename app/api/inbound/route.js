import { NextResponse } from 'next/server'
import { redis, MAIL_SET_PREFIX } from '@/lib/redis'

export async function POST(request) {
  try {
    const formData = await request.formData()

    // SendGrid mengirim field "to", "from", "subject", "text", "html"
    let to = (formData.get('to') || '').toLowerCase()
    const from = formData.get('from') || ''
    const subject = formData.get('subject') || '(Tanpa Subjek)'
    const text = formData.get('text') || ''
    const html = formData.get('html') || ''

    // SendGrid kadang kirim "to" dalam format: "Name <email@domain.com>"
    // Extract email saja
    const emailMatch = to.match(/<([^>]+)>/)
    if (emailMatch) {
      to = emailMatch[1].toLowerCase()
    }

    // Bersihkan whitespace
    to = to.trim()

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Missing to field' },
        { status: 400 }
      )
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const key = `mail:${to}:${id}`
    const setKey = `${MAIL_SET_PREFIX}${to}`

    // Extract links
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

    // Simpan email + tambah ke Set
    await redis.set(key, data, { ex: 86400 })
    await redis.sadd(setKey, id)
    await redis.expire(setKey, 86400)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}