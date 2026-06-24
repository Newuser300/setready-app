'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params?.get('token') || ''
  const type = params?.get('type') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const loginPath = type === 'casting' ? '/casting/login' : '/agent/login'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const res = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', token, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Reset failed'); return }
    setDone(true)
  }

  if (!token) {
    return <p style={{ color: '#dc2626', fontSize: '14px', textAlign: 'center' }}>Invalid reset link. Please request a new one.</p>
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 8px' }}>Password updated</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px' }}>You can now sign in with your new password.</p>
        <Link href={loginPath} style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '15px', borderRadius: '10px', textDecoration: 'none' }}>Go to Sign In</Link>
      </div>
    )
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 4px' }}>Choose a new password</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Enter and confirm your new password below.</p>
      </div>
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>{error}</div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>New Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required style={{ ...inputStyle, paddingRight: '64px' }} />
            <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Confirm New Password</label>
          <input type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" required style={inputStyle} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', backgroundColor: loading ? '#9ca3af' : '#F59E0B', color: loading ? 'white' : '#1a1a2e', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: '#1a1a2e', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Logo size="md" darkBackground={true} showText={true} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Suspense fallback={<p style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' }
