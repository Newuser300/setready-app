'use client'
import { useState, useEffect, use } from 'react'

interface SigninPerformer {
  performer_id: string
  name: string
  email: string
  headshot_url: string | null
  union_status: string | null
  signed_in: boolean
  signed_in_at: string | null
}

interface SigninSession {
  id: string
  shoot_date: string
  location_name: string | null
  qr_token: string
  casting_requests: { production_name: string } | null
}

export default function SigninPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [session, setSession] = useState<SigninSession | null>(null)
  const [performers, setPerformers] = useState<SigninPerformer[]>([])
  const [totalSignedIn, setTotalSignedIn] = useState(0)
  const [totalConfirmed, setTotalConfirmed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [checking, setChecking] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<{ name: string; time: string } | null>(null)

  async function loadSession() {
    const res = await fetch(`/api/casting/signin?token=${token}`)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Invalid sign-in link')
      setLoading(false)
      return
    }
    const data = await res.json()
    setSession(data.session)
    setPerformers(data.performers || [])
    setTotalSignedIn(data.totalSignedIn)
    setTotalConfirmed(data.totalConfirmed)
    setLoading(false)
  }

  useEffect(() => { loadSession() }, [token])

  async function checkIn(performerId: string, name: string) {
    setChecking(performerId)
    const res = await fetch('/api/casting/signin/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, performerId }),
    })
    const data = await res.json()
    setChecking(null)

    if (data.success || data.alreadySignedIn) {
      const now = new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
      setConfirmed({ name: data.name || name, time: data.signed_in_at ? new Date(data.signed_in_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }) : now })
      await loadSession()
      setTimeout(() => setConfirmed(null), 3000)
    } else {
      setError(data.error || 'Check-in failed')
      setTimeout(() => setError(''), 3000)
    }
  }

  const filteredPerformers = performers.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#F59E0B', fontSize: '18px', fontWeight: '700' }}>Loading...</div>
      </div>
    )
  }

  if (error && !session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>Invalid Sign-In Link</div>
          <div style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>{error}</div>
        </div>
      </div>
    )
  }

  const productionName = (session?.casting_requests as any)?.production_name || 'Production'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '20px', textAlign: 'center', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ fontSize: '32px', fontWeight: '900', color: '#F59E0B', letterSpacing: '-0.02em' }}>SR</div>
        <div style={{ color: '#9ca3af', fontSize: '12px', letterSpacing: '0.15em', marginTop: '2px' }}>SETREADY</div>
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'white' }}>On-Set Check-In</div>
          <div style={{ fontSize: '15px', color: '#F59E0B', fontWeight: '600', marginTop: '4px' }}>{productionName}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            {session?.shoot_date ? new Date(session.shoot_date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            {session?.location_name ? ` · ${session.location_name}` : ''}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: '16px', backgroundColor: '#0f0f1a', borderRadius: '12px', padding: '12px 16px', display: 'inline-flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#22c55e' }}>{totalSignedIn}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Signed In</div>
          </div>
          <div style={{ width: '1px', height: '36px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#F59E0B' }}>{totalConfirmed}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Expected</div>
          </div>
        </div>
      </div>

      {/* Success flash */}
      {confirmed && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 999, backgroundColor: '#22c55e', color: 'white', borderRadius: '14px', padding: '16px 24px', textAlign: 'center', boxShadow: '0 8px 32px rgba(34,197,94,0.4)', minWidth: '240px' }}>
          <div style={{ fontSize: '36px', marginBottom: '6px' }}>✅</div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>{confirmed.name}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Checked In · {confirmed.time}</div>
        </div>
      )}

      {/* Error flash */}
      {error && session && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 999, backgroundColor: '#ef4444', color: 'white', borderRadius: '14px', padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '16px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{ width: '100%', padding: '14px 16px', backgroundColor: '#1e1e35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Performer list */}
      <div style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredPerformers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            {search ? 'No performers found matching your search.' : 'No confirmed performers on this list.'}
          </div>
        )}

        {filteredPerformers.map(p => (
          <div
            key={p.performer_id}
            style={{
              backgroundColor: p.signed_in ? 'rgba(34,197,94,0.1)' : '#1e1e35',
              border: `1px solid ${p.signed_in ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            {/* Avatar */}
            {p.headshot_url ? (
              <img src={p.headshot_url} alt={p.name} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#1a1a2e', flexShrink: 0 }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '16px', color: 'white', marginBottom: '2px' }}>{p.name}</div>
              {p.union_status && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{p.union_status}</div>}
              {p.signed_in && p.signed_in_at && (
                <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>
                  ✓ Checked in at {new Date(p.signed_in_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Check-in button */}
            {p.signed_in ? (
              <div style={{ fontSize: '28px', flexShrink: 0 }}>✅</div>
            ) : (
              <button
                onClick={() => checkIn(p.performer_id, p.name)}
                disabled={checking === p.performer_id}
                style={{
                  flexShrink: 0,
                  padding: '10px 18px',
                  backgroundColor: checking === p.performer_id ? '#374151' : '#F59E0B',
                  color: '#1a1a2e',
                  fontWeight: '800',
                  fontSize: '14px',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  minWidth: '80px',
                }}
              >
                {checking === p.performer_id ? '...' : 'Check In'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
