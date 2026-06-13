'use client'
import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function AgentRegisterPage() {
  const [form, setForm] = useState({
    agencyName: '', name: '', email: '',
    phone: '', city: '', website: '',
    password: '', confirm: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const res = await fetch('/api/agent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        agencyName: form.agencyName,
        name: form.name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        website: form.website,
        password: form.password,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Registration failed')
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: '#1a1a2e', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size="md" darkBackground={true} showText={true} />
          <span style={{ color: '#9ca3af', fontSize: '14px', marginLeft: '4px' }}>/ Agent Portal</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' }}>
              Application Submitted
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }}>
              Thank you, <strong>{form.agencyName}</strong>. We will review your application and send an approval email within 24 hours.
            </p>
            <Link
              href="/agent/login"
              style={{ display: 'inline-block', padding: '12px 28px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', borderRadius: '10px', textDecoration: 'none' }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Logo size="md" darkBackground={true} showText={true} />
        <span style={{ color: '#9ca3af', fontSize: '14px', marginLeft: '4px' }}>/ Agent Portal</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '32px',
          width: '100%', maxWidth: '480px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' }}>
              Agency Application
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Apply to access the SetReady Casting platform
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
              color: '#dc2626', fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div>
              <label style={labelStyle}>Agency Name *</label>
              <input value={form.agencyName} onChange={e => set('agencyName', e.target.value)} placeholder="e.g. Pacific Talent Agency" required style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Your Name (Contact Person) *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="First and last name" required style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@agency.com" required style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="604-555-0123" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>City *</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Vancouver" required style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Website (optional)</label>
              <input type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://youragency.com" style={inputStyle} />
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginTop: '4px' }}>
              <div>
                <label style={labelStyle}>Password *</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" required style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Re-enter password" required style={inputStyle} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                backgroundColor: loading ? '#9ca3af' : '#F59E0B',
                color: loading ? 'white' : '#1a1a2e',
                fontWeight: '700', fontSize: '15px',
                border: 'none', borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
              }}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
            Already approved?{' '}
            <Link href="/agent/login" style={{ color: '#F59E0B', fontWeight: '600', textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: '600',
  color: '#374151', marginBottom: '5px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1px solid #e5e7eb', borderRadius: '8px',
  fontSize: '14px', color: '#1a1a2e', outline: 'none',
  boxSizing: 'border-box',
}
