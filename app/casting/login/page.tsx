'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function CastingLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotSending, setForgotSending] = useState(false)

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotSending(true)
    setForgotMsg('')
    await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', email: forgotEmail, accountType: 'casting' }),
    })
    setForgotSending(false)
    setForgotMsg('If an account exists for that email, we have sent a reset link. Check your inbox.')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/casting/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error || 'Login failed'); return }
    router.push('/casting/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Logo size="md" darkBackground={true} showText={true} />
        <span style={{ color: '#9ca3af', fontSize: '14px', marginLeft: '4px' }}>/ Casting</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '36px 32px', width: '100%', maxWidth: '420px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>

          {/* Logo + title */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
              <Logo size="lg" darkBackground={false} showText={false} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 6px' }}>
              SetReady Casting
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Sign in to your casting director account
            </p>
            <div style={{ display: 'inline-block', marginTop: '10px', padding: '5px 14px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '20px', fontSize: '12px', color: '#15803d', fontWeight: '600' }}>
              ✓ Free for casting directors
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@production.com" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', backgroundColor: loading ? '#9ca3af' : '#F59E0B', color: loading ? 'white' : '#1a1a2e', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <button type="button" onClick={() => { setShowForgot(v => !v); setForgotMsg('') }} style={{ background: 'none', border: 'none', color: '#F59E0B', fontWeight: '600', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
              Forgot password?
            </button>
          </div>

          {showForgot && (
            <div style={{ marginTop: '14px', padding: '16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
              {forgotMsg ? (
                <p style={{ fontSize: '13px', color: '#16a34a', margin: 0, textAlign: 'center' }}>{forgotMsg}</p>
              ) : (
                <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={labelStyle}>Enter your account email</label>
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@production.com" required style={inputStyle} />
                  <button type="submit" disabled={forgotSending} style={{ width: '100%', padding: '11px', backgroundColor: forgotSending ? '#9ca3af' : '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '14px', border: 'none', borderRadius: '8px', cursor: forgotSending ? 'not-allowed' : 'pointer' }}>
                    {forgotSending ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
            New to SetReady Casting?{' '}
            <Link href="/casting/register" style={{ color: '#F59E0B', fontWeight: '600', textDecoration: 'none' }}>Apply for free access</Link>
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#9ca3af' }}>
            <Link href="/casting/about" style={{ color: '#9ca3af', textDecoration: 'underline' }}>Learn more about SetReady Casting →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' }
