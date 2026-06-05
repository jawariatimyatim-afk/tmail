'use client'

import { useEffect, useState } from 'react'
import {
  Copy,
  RefreshCw,
  Trash2,
  Mail,
  ExternalLink,
  ShieldCheck,
  Zap,
  Plus,
  Lock,
  Clock,
  AlertCircle,
  LogOut,
} from 'lucide-react'

export default function Home() {
  const [apiKey, setApiKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [keyData, setKeyData] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [email, setEmail] = useState('')
  const [inbox, setInbox] = useState([])
  const [activeMessage, setActiveMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastCheck, setLastCheck] = useState(null)

  // Server time untuk countdown realtime (anti-manipulasi jam)
  const [serverTime, setServerTime] = useState(null)

  // Auto-login dari localStorage saat pertama load
  useEffect(() => {
    const savedKey = localStorage.getItem('tm_key')
    if (savedKey) {
      validateStoredKey(savedKey)
    }
  }, [])

  // Auto-load inbox setiap 10 detik
  useEffect(() => {
    if (!isAuthenticated || !email) return
    const interval = setInterval(() => loadInbox(email), 10000)
    return () => clearInterval(interval)
  }, [isAuthenticated, email])

  // Validasi key realtime setiap 60 detik (auto-logout jika expired)
  useEffect(() => {
    if (!isAuthenticated || !apiKey) return
    const interval = setInterval(async () => {
      const stillValid = await checkKeyValidity(apiKey)
      if (!stillValid) {
        alert('API Key Anda sudah expired. Silakan login ulang.')
        logout()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [isAuthenticated, apiKey])

  // Update countdown setiap detik berdasarkan server time
  useEffect(() => {
    if (!keyData?.expiryDate || !serverTime) return
    const interval = setInterval(() => {
      setServerTime((prev) => (prev ? prev + 1000 : null))
    }, 1000)
    return () => clearInterval(interval)
  }, [keyData, serverTime])

  const checkKeyValidity = async (key) => {
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
        cache: 'no-store',
      })
      const data = await res.json()
      return data.valid
    } catch {
      return false
    }
  }

  const validateStoredKey = async (key) => {
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
        cache: 'no-store',
      })
      const data = await res.json()

      if (data.valid) {
        setApiKey(key)
        setKeyData(data)
        setServerTime(data.serverTime || Date.now())
        setIsAuthenticated(true)
        return true
      }

      localStorage.removeItem('tm_key')
      return false
    } catch {
      localStorage.removeItem('tm_key')
      return false
    }
  }

  const activate = async () => {
    if (!apiKey.trim()) {
      setAuthError('Masukkan API Key dulu')
      return
    }

    setAuthLoading(true)
    setAuthError('')

    try {
      const ok = await validateStoredKey(apiKey.trim())
      if (ok) {
        localStorage.setItem('tm_key', apiKey.trim())
        await generateEmail()
      } else {
        setAuthError('API Key tidak valid / expired')
      }
    } catch (e) {
      setAuthError('Gagal validasi key')
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('tm_key')
    setIsAuthenticated(false)
    setApiKey('')
    setKeyData(null)
    setEmail('')
    setInbox([])
    setActiveMessage(null)
    setServerTime(null)
  }

  // NEW INBOX: Generate email baru + reset semua state
  const generateEmail = async () => {
    setLoading(true)
    setActiveMessage(null)
    setInbox([])

    try {
      const res = await fetch(`/api/generate?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      const data = await res.json()

      if (!data.email) throw new Error('Gagal generate email')

      setEmail(data.email)
      setLastCheck(null)
      await loadInbox(data.email)
    } catch (e) {
      console.error('Generate error:', e)
    } finally {
      setLoading(false)
    }
  }

  // Handler tombol New Inbox
  const handleNewInbox = async () => {
    await generateEmail()
  }

  const loadInbox = async (targetEmail = email) => {
    if (!targetEmail) return
    setRefreshing(true)
    try {
      const res = await fetch(
        `/api/inbox?email=${encodeURIComponent(targetEmail)}&t=${Date.now()}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setInbox(data.messages || [])
      setLastCheck(new Date().toLocaleTimeString('id-ID'))
    } catch (e) {
      console.error(e)
    } finally {
      setRefreshing(false)
    }
  }

  const deleteMail = async (id) => {
    if (!email) return
    if (!confirm('Hapus pesan ini?')) return

    try {
      await fetch(`/api/delete?email=${encodeURIComponent(email)}&id=${id}`)
      setInbox((prev) => prev.filter((m) => m.id !== id))
      if (activeMessage?.id === id) setActiveMessage(null)
    } catch (e) {
      console.error(e)
    }
  }

  const copyText = async (text) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    alert('Tersalin!')
  }

  // Hitung sisa waktu realtime dari server time
  const getRemainingTime = () => {
    if (!keyData?.expiryDate || !serverTime) return '-'
    const ms = keyData.expiryDate - serverTime
    if (ms <= 0) return 'Expired'

    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}h ${hours}j`
    if (hours > 0) return `${hours}j ${minutes}m`
    return `${minutes}m`
  }

  // ===== HALAMAN LOGIN (API KEY LOCK) =====
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[5%] w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[5%] w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-6 flex justify-center">
            <div className="h-20 w-20 rounded-3xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center">
              <Lock className="h-10 w-10 text-blue-300" />
            </div>
          </div>

          <h1 className="text-center text-3xl font-black tracking-tight">
            TempMail Locked
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Masukkan API Key yang dibuat dari Admin Panel
          </p>

          <div className="mt-8 space-y-4">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && activate()}
              placeholder="tm_xxxxxxxx..."
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 font-mono outline-none focus:border-blue-500 transition"
            />

            {authError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {authError}
              </div>
            ) : null}

            <button
              onClick={activate}
              disabled={authLoading}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold hover:bg-blue-500 disabled:opacity-60 transition"
            >
              {authLoading ? 'Memverifikasi...' : 'Aktifkan'}
            </button>

            <div className="text-center text-xs text-slate-500">
              Durasi key: 3 / 7 / 30 hari
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== HALAMAN DASHBOARD UTAMA =====
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-400/20">
                <Mail className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  Temp<span className="text-blue-400">Mail</span>
                </h1>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Disposable inbox
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Countdown Realtime */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-emerald-300">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-bold font-mono">
                {getRemainingTime()}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-200 hover:bg-red-500/20 transition"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Main Section */}
        <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl mb-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                <Zap className="h-3 w-3" />
                Temporary Email
              </div>
              <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight">
                Your instant <span className="text-blue-400">disposable</span>{' '}
                inbox
              </h2>
              <p className="mt-4 max-w-xl text-slate-400">
                Buat email sementara, terima pesan, klik link penting, lalu
                hapus kapan saja.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                  3 Hari
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                  7 Hari
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                  30 Hari
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/30 p-5 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">
                  Alamat Email
                </div>
                <div className="rounded-2xl border border-blue-500/20 bg-black/50 p-4 text-center font-mono break-all text-blue-300 font-bold min-h-[60px] flex items-center justify-center">
                  {loading ? 'Generating...' : email || 'Klik New Inbox'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => copyText(email)}
                  disabled={!email || loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-bold hover:bg-blue-500 disabled:opacity-60 transition"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>

                <button
                  onClick={handleNewInbox}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 font-bold hover:bg-slate-700 disabled:opacity-60 transition"
                >
                  <Plus
                    className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                  />
                  {loading ? 'Loading...' : 'New Inbox'}
                </button>
              </div>

              <button
                onClick={() => loadInbox()}
                disabled={!email || refreshing || loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 py-3 text-sm text-slate-200 hover:border-blue-500/30 disabled:opacity-60 transition"
              >
                <RefreshCw
                  className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                />
                {refreshing
                  ? 'Refreshing...'
                  : `Refresh Inbox ${lastCheck ? `(${lastCheck})` : ''}`}
              </button>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
                📦 Paket: {keyData?.durationDays || '-'} hari • ⏰ Expire:{' '}
                {keyData?.expiryDate
                  ? new Date(keyData.expiryDate).toLocaleString('id-ID')
                  : '-'}
              </div>
            </div>
          </div>
        </section>

        {/* Email List & Viewer */}
        <div className="grid gap-6 lg:grid-cols-[360px_1fr] min-h-[560px]">
          {/* Inbox List */}
          <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-black/20">
              <div>
                <div className="text-sm font-semibold">Inbox</div>
                <div className="text-xs text-slate-400">
                  {inbox.length} messages
                </div>
              </div>
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                Secure
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {inbox.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-20 text-center text-slate-500">
                  <Mail className="mb-3 h-12 w-12" />
                  <div className="text-sm">Inbox kosong</div>
                </div>
              ) : (
                inbox.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setActiveMessage(msg)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      activeMessage?.id === msg.id
                        ? 'border-blue-500/40 bg-blue-500/10'
                        : 'border-transparent bg-black/20 hover:bg-black/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-blue-300">
                          {msg.from}
                        </div>
                        <div className="mt-1 truncate text-sm font-bold">
                          {msg.subject}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(msg.time).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="mt-2 truncate text-xs text-slate-400">
                      {(msg.body || '').substring(0, 80)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Message Viewer */}
          <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden flex flex-col">
            {!activeMessage ? (
              <div className="flex h-full flex-col items-center justify-center p-10 text-center text-slate-500">
                <ShieldCheck className="mb-4 h-16 w-16 text-slate-700" />
                <div className="text-xl font-bold text-slate-300">
                  Pilih pesan
                </div>
                <div className="mt-2 max-w-md text-sm">
                  Klik email di sebelah kiri untuk melihat isi lengkap.
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-white/10 bg-black/20 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-2xl font-black">
                        {activeMessage.subject}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>
                          From:{' '}
                          <b className="text-slate-200">
                            {activeMessage.from}
                          </b>
                        </span>
                        <span>
                          Date:{' '}
                          <b className="text-slate-200">
                            {new Date(activeMessage.time).toLocaleString(
                              'id-ID'
                            )}
                          </b>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteMail(activeMessage.id)}
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-200 hover:bg-red-500/20 transition"
                      title="Delete message"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {activeMessage.html ? (
                    <iframe
                      title="email-content"
                      srcDoc={activeMessage.html}
                      className="min-h-[420px] w-full rounded-2xl border-none bg-white"
                      sandbox="allow-popups allow-same-origin"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
                      {activeMessage.body}
                    </pre>
                  )}

                  {activeMessage.links?.length ? (
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                        Detected Links
                      </div>
                      <div className="space-y-2">
                        {activeMessage.links.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-blue-300 hover:border-blue-500/40 transition"
                          >
                            <span className="break-all">{link}</span>
                            <ExternalLink className="h-4 w-4 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}