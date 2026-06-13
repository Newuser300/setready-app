'use client'
import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'

const HEAR_OPTIONS = [
  'Google / Search', 'Colleague recommendation', 'Social media', 'Industry event',
  'SetReady performer told me', 'UBCP/ACTRA', 'Email newsletter', 'Other',
]

export default function CastingRegisterPage() {
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '',
    heardFrom: '', description: '', password: '', confirm: '',
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
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)

    const res = await fetch('/api/casting/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        name: form.name, company: form.company, email: form.email,
        phone: form.phone, password: form.password,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: '#1a1a2e', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size="md" darkBackground={true} showText={true} />
          <span style={{ color: '#9ca3af', fontSize: '14px' }}>/ Casting</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '48px 32px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎬</div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 12px' }}>Application Submitted</h1>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.7', margin: '0 0 8px' }}>
              Thank you, <strong>{form.name}</strong>. Your application is under review.
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.7', margin: '0 0 28px' }}>
              Casting director accounts are reviewed and approved within <strong>24 hours</strong>. You'll receive an email confirmation.
            </p>
            <div style={{ padding: '14px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', marginBottom: '24px', fontSize: '13px', color: '#15803d' }}>
              ✓ SetReady Casting is <strong>free forever</strong> for verified casting directors
            </div>
            <Link href="/casting/login" style={{ display: 'inline-block', padding: '12px 28px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', borderRadius: '10px', textDecoration: 'none', fontSize: '15px' }}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: '#1a1a2e', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Logo size="md" darkBackground={true} showText={true} />
        <span style={{ color: '#9ca3af', fontSize: '14px' }}>/ Casting</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 6px' }}>Apply for Casting Access</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Accounts are reviewed and approved within 24 hours.{' '}
              <span style={{ color: '#15803d', fontWeight: '600' }}>Free forever.</span>
            </p>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="First and last name" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Company / Production Company *</label>
              <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Pacific Films Inc." required style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="604-555-0123" required style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>How did you hear about us?</label>
              <select value={form.heardFrom} onChange={e => set('heardFrom', e.target.value)} style={{ ...inputStyle, backgroundColor: 'white', appearance: 'none' }}>
                <option value="">Select one</option>
                {HEAR_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Brief description of your productions</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="What type of productions do you work on? Film, TV, commercials, etc."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
              <label style={labelStyle}>Password *</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Re-enter password" required style={inputStyle} />
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
              ℹ️ Your account will be manually reviewed before activation to maintain platform quality.
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', backgroundColor: loading ? '#9ca3af' : '#F59E0B', color: loading ? 'white' : '#1a1a2e', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '14px', color: '#6b7280' }}>
            Already approved?{' '}
            <Link href="/casting/login" style={{ color: '#F59E0B', fontWeight: '600', textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box' }
