import { NextResponse } from 'next/server'
import { redis, API_KEY_PREFIX, API_KEY_SET } from '@/lib/redis'

function checkAuth(req) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '')
  const [user, pass] = auth ? auth.split(':') : []
  return user === process.env.ADMIN_USERNAME && pass === process.env.ADMIN_PASSWORD
}

export async function DELETE(request, { params }) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Hapus data key
    await redis.del(`${API_KEY_PREFIX}${params.key}`)

    // Hapus juga dari Set
    await redis.srem(API_KEY_SET, params.key)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}