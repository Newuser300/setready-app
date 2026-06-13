'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function AgentLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/agent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Login failed')
      setLoading(false)
      return
    }

    router.push('/agent/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Logo size="md" darkBackground={true} showText={true} />
        <span style={{ color: '#9ca3af', fontSize: '14px', marginLeft: '4px' }}>/ Agent Portal</span>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', padding: '32px',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <Logo size="lg" darkBackground={false} showText={false} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' }}>
              Agent Sign In
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Access your agency dashboard
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@agency.com"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
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
                marginTop: '4px',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
            New agency?{' '}
            <Link href="/agent/register" style={{ color: '#F59E0B', fontWeight: '600', textDecoration: 'none' }}>
              Apply for access
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: '600',
  color: '#374151', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1px solid #e5e7eb', borderRadius: '8px',
  fontSize: '14px', color: '#1a1a2e', outline: 'none',
  boxSizing: 'border-box',
}
