'use client'

import { useEffect, useState } from 'react'
import {
  Shield,
  User,
  Lock,
  RefreshCw,
  LogOut,
  Plus,
  Copy,
  Trash2,
  Clock,
  Key,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

export default function AdminPage() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [keys, setKeys] = useState([])
  const [name, setName] = useState('')
  const [dur, setDur] = useState('3')
  const [newKey, setNewKey] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const authHeader = () => ({
    Authorization: `Bearer ${user}:${pass}`,
  })

  const loadKeys = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/keys', { headers: authHeader() })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat keys')
      }

      setKeys(data.keys || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const login = async () => {
    setError('')
    if (!user || !pass) {
      setError('Username dan password wajib diisi')
      return
    }

    try {
      const res = await fetch('/api/admin/keys', { headers: authHeader() })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login gagal')
      }

      setIsAuth(true)
      setKeys(data.keys || [])
      localStorage.setItem('adm_cred', `${user}:${pass}`)
    } catch (e) {
      setError('Login gagal: ' + e.message)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('adm_cred')
    if (saved) {
      const [u, p] = saved.split(':')
      if (u && p) {
        setUser(u)
        setPass(p)
        fetch('/api/admin/keys', {
          headers: { Authorization: `Bearer ${u}:${p}` },
        })
          .then((res) =>
            res.json().then((data) => ({ ok: res.ok, data }))
          )
          .then(({ ok, data }) => {
            if (ok) {
              setKeys(data.keys || [])
              setIsAuth(true)
            }
          })
          .catch(() => {})
      }
    }
  }, [])

  const createKey = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ name, duration: Number(dur) }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat key')
      }

      setNewKey(data.apiKey)
      setSuccess(`✅ API Key berhasil dibuat untuk ${dur} hari`)
      setName('')
      await loadKeys()
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const deleteKey = async (k) => {
    if (!confirm('Yakin hapus API key ini?')) return

    try {
      const res = await fetch(`/api/admin/keys/${k}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus')
      }

      setSuccess('✅ API key berhasil dihapus')
      await loadKeys()
      if (newKey === k) setNewKey('')
    } catch (e) {
      setError(e.message)
    }
  }

  const copy = async (text) => {
    await navigator.clipboard.writeText(text)
    setSuccess('✅ Tersalin ke clipboard')
  }

  const fmtDate = (ts) =>
    new Date(ts).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const daysLeft = (expiry) =>
    Math.max(
      0,
      Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24))
    )

  const isExpired = (expiry) => Date.now() > expiry

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[5%] w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[5%] w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-purple-500/20 border border-purple-400/20 flex items-center justify-center">
              <Shield className="h-8 w-8 text-purple-300" />
            </div>
          </div>

          <h1 className="text-center text-3xl font-black tracking-tight">
            Admin Control
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Login untuk generate dan hapus API key
          </p>

          <div className="mt-8 space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Username"
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-4 pl-12 pr-4 outline-none focus:border-purple-500 transition"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                placeholder="Password"
                className="w-full rounded-2xl border border-white/10 bg-black/40 py-4 pl-12 pr-4 outline-none focus:border-purple-500 transition"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              onClick={login}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 py-4 font-bold hover:from-purple-500 hover:to-purple-400 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Admin Panel
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              🔑 API Key Manager
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadKeys}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm hover:border-purple-500 disabled:opacity-60 transition"
            >
              <RefreshCw
                className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
              />
              Refresh
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('adm_cred')
                setIsAuth(false)
                setUser('')
                setPass('')
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 hover:bg-red-500/20 transition"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        {error ? (
          <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-100 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-100 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        ) : null}

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Create Section */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Buat API Key
                </p>
                <h2 className="text-2xl font-bold">Generate key baru</h2>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-purple-500/15 flex items-center justify-center border border-purple-500/20">
                <Plus className="h-5 w-5 text-purple-300" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  📝 Nama / Project
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Android App, Web Backend"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  ⏱️ Durasi Aktif
                </label>
                <select
                  value={dur}
                  onChange={(e) => setDur(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-purple-500 transition"
                >
                  <option value="3">3 Hari</option>
                  <option value="7">7 Hari</option>
                  <option value="30">30 Hari</option>
                </select>
              </div>

              <button
                onClick={createKey}
                disabled={generating || !name.trim()}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 py-4 font-bold hover:from-purple-500 hover:to-purple-400 disabled:opacity-60 transition"
              >
                {generating ? '⏳ Membuat...' : '🚀 Buat API Key'}
              </button>
            </div>

            {/* New Key Display */}
            {newKey ? (
              <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-emerald-200 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    API Key Baru Berhasil
                  </p>
                  <button
                    onClick={() => copy(newKey)}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                  >
                    <Copy className="inline h-3.5 w-3.5 mr-1" /> Copy
                  </button>
                </div>
                <code className="block break-all rounded-2xl border border-emerald-500/20 bg-black/50 p-4 text-xs text-emerald-100 font-mono mb-3 leading-relaxed">
                  {newKey}
                </code>
                <p className="text-xs text-slate-400 mb-2">
                  ⚠️ <b>Penting!</b> Key ini hanya ditampilkan satu kali.
                </p>
                <p className="text-xs text-emerald-300">
                  ✅ Durasi: <b>{dur} hari</b> | Berakhir:{' '}
                  <b>
                    {fmtDate(
                      Date.now() + Number(dur) * 24 * 60 * 60 * 1000
                    )}
                  </b>
                </p>
              </div>
            ) : null}
          </section>

          {/* Keys List Section */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Daftar Key
                </p>
                <h2 className="text-2xl font-bold">API Keys Aktif</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-bold text-slate-300">
                <Key className="h-4 w-4 text-purple-400" />
                <span className="text-purple-400">{keys.length}</span>
                <span className="text-slate-500">keys</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
              {keys.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-slate-500">
                  <Key className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="font-semibold">Belum ada API key</p>
                  <p className="text-xs mt-1">Buat key baru di sebelah kiri</p>
                </div>
              ) : (
                keys.map((item) => {
                  const expired = isExpired(item.expiry)
                  const remaining = daysLeft(item.expiry)

                  return (
                    <div
                      key={item.key}
                      className={`rounded-3xl border p-4 transition ${
                        expired
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-white/10 bg-black/20 hover:border-purple-500/30'
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-xs uppercase tracking-[0.25em] text-slate-400 font-bold">
                              {item.name}
                            </div>
                            <div className="mt-1.5 text-sm font-semibold text-white">
                              {item.durationDays || '-'} hari
                            </div>
                          </div>

                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                              expired
                                ? 'bg-red-500/10 text-red-300 border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                expired ? 'bg-red-400' : 'bg-emerald-400'
                              }`}
                            ></span>
                            {expired ? '✕ EXPIRED' : '✓ ACTIVE'}
                          </div>
                        </div>

                        {/* Key Display */}
                        <div className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 overflow-x-auto">
                          <code className="text-xs text-slate-300 font-mono break-all">
                            {item.key}
                          </code>
                        </div>

                        {/* Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                            <div className="text-slate-500">Sisa Waktu</div>
                            <div
                              className={`font-bold text-lg ${
                                expired
                                  ? 'text-red-400'
                                  : 'text-blue-400'
                              }`}
                            >
                              {remaining}d
                            </div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                            <div className="text-slate-500">Status</div>
                            <div
                              className={`font-bold ${
                                expired
                                  ? 'text-red-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {expired ? 'Expired' : 'Running'}
                            </div>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="text-xs text-slate-500 border-t border-white/10 pt-3 space-y-1">
                          <div>
                            📅 Dibuat:{' '}
                            <span className="text-slate-300">
                              {fmtDate(item.createdAt)}
                            </span>
                          </div>
                          <div>
                            ⏰ Berakhir:{' '}
                            <span
                              className={
                                expired
                                  ? 'text-red-400 font-semibold'
                                  : 'text-slate-300'
                              }
                            >
                              {fmtDate(item.expiry)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 border-t border-white/10 pt-3">
                          <button
                            onClick={() => copy(item.key)}
                            className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-purple-500/30 hover:bg-purple-500/10 transition"
                          >
                            <Copy className="inline h-3.5 w-3.5 mr-1.5" />
                            Copy
                          </button>

                          <button
                            onClick={() => deleteKey(item.key)}
                            className="flex-1 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
                          >
                            <Trash2 className="inline h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <div className="text-2xl font-black text-purple-400">3</div>
            <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">
              Hari
            </div>
            <div className="text-[10px] text-slate-600">Package</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <div className="text-2xl font-black text-blue-400">7</div>
            <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">
              Hari
            </div>
            <div className="text-[10px] text-slate-600">Package</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <div className="text-2xl font-black text-emerald-400">30</div>
            <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">
              Hari
            </div>
            <div className="text-[10px] text-slate-600">Package</div>
          </div>
        </div>
      </div>
    </div>
  )
}