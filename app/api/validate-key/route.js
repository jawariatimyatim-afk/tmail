import { NextResponse } from 'next/server'
import { redis, API_KEY_PREFIX, API_KEY_SET, safeParse } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'API Key wajib diisi' },
        { status: 400 }
      )
    }

    const data = await redis.get(`${API_KEY_PREFIX}${apiKey}`)

    // Jika key tidak ada (sudah expired/terhapus dari Redis)
    if (!data) {
      // Bersihkan dari Set
      await redis.srem(API_KEY_SET, apiKey)
      return NextResponse.json({
        valid: false,
        error: 'Key tidak ditemukan / sudah expired',
      })
    }

    const obj = safeParse(data)

    // GUNAKAN SERVER TIME (Date.now() di server, bukan client)
    const now = Date.now()

    // Cek expired berdasarkan server time
    if (!obj.active || now >= obj.expiry) {
      // Hapus key yang expired dari Redis & Set
      await redis.del(`${API_KEY_PREFIX}${apiKey}`)
      await redis.srem(API_KEY_SET, apiKey)

      return NextResponse.json({
        valid: false,
        error: 'Key sudah expired',
      })
    }

    // Hitung sisa waktu berdasarkan server time
    const msRemaining = obj.expiry - now
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      valid: true,
      name: obj.name,
      durationDays: obj.durationDays || null,
      daysRemaining,
      expiryDate: obj.expiry, // timestamp absolut
      serverTime: now,        // server time untuk sinkronisasi
    })
  } catch (e) {
    return NextResponse.json(
      { valid: false, error: e.message },
      { status: 500 }
    )
  }
}