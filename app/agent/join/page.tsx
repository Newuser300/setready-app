'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [agencyName, setAgencyName] = useState('')
  const [invitedEmail, setInvitedEmail] = useState('')
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setError('No invite token found in URL.'); setLoading(false); return }
    fetch(`/api/agent/invite?token=${token}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Invalid or expired invite.'); setLoading(false); return }
        setValid(true)
        setAgencyName(data.agencyName)
        setInvitedEmail(data.invitedEmail)
        setLoading(false)
      })
      .catch(() => { setError('Failed to validate invite.'); setLoading(false) })
  }, [token])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/agent/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', token, name: name.trim(), password }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error || 'Failed to join'); return }
    setDone(true)
    setTimeout(() => router.push('/agent/login'), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb',
    borderRadius: '8px', fontSize: '14px', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, Arial, sans-serif' }}>
      <div style={{ backgroundColor: '#1a1a2e', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Logo size="md" darkBackground showText />
        <span style={{ color: '#9ca3af', fontSize: '14px' }}>/ Agent Portal</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

          {loading && <p style={{ color: '#9ca3af', textAlign: 'center' }}>Validating invite...</p>}

          {!loading && error && !done && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>❌</div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px' }}>Invite Error</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
              <a href="/agent/login" style={{ color: '#F59E0B', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>Go to Login</a>
            </div>
          )}

          {done && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px' }}>Account Created!</h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Redirecting to login...</p>
            </div>
          )}

          {valid && !done && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🤝</div>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 6px' }}>
                  Join {agencyName}
                </h1>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                  You've been invited as: <strong>{invitedEmail}</strong>
                </p>
              </div>

              {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: '#dc2626', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Your Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="First and last name" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Confirm Password *</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" required style={inputStyle} />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ width: '100%', padding: '13px', backgroundColor: submitting ? '#9ca3af' : '#F59E0B', color: submitting ? 'white' : '#1a1a2e', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer', marginTop: '4px' }}
                >
                  {submitting ? 'Creating account...' : 'Create Account & Join'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Loading...</div>}>
      <JoinContent />
    </Suspense>
  )
}
