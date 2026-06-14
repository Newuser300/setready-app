'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  last_login: string | null
}

export default function AgentSettingsPage() {
  const router = useRouter()
  const [agentName, setAgentName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [agencyId, setAgencyId] = useState('')
  const [isPro, setIsPro] = useState(false)
  const [proExpiresAt, setProExpiresAt] = useState<string | null>(null)
  const [rosterLimit, setRosterLimit] = useState<number | null>(25)

  const [team, setTeam] = useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url?: string; error?: string } | null>(null)

  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMsg, setPromoMsg] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/agent/auth', { method: 'GET' }).then(async res => {
      if (!res.ok) { router.push('/agent/login'); return }
      const d = await res.json()
      setAgentName(d.name || '')
      setAgencyName(d.agencyName || '')
      setAgencyId(d.agencyId || '')
    }).catch(() => router.push('/agent/login'))

    fetch('/api/agent/pro-status').then(async res => {
      if (!res.ok) return
      const d = await res.json()
      setIsPro(d.isPro)
      setProExpiresAt(d.proExpiresAt)
      setRosterLimit(d.rosterLimit)
    })

    loadTeam()
  }, [router])

  async function loadTeam() {
    setTeamLoading(true)
    const res = await fetch('/api/agent/team')
    if (res.ok) setTeam(await res.json())
    setTeamLoading(false)
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteResult(null)
    const res = await fetch('/api/agent/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', invitedEmail: inviteEmail.trim() }),
    })
    const data = await res.json()
    setInviteLoading(false)
    if (res.ok) {
      setInviteResult({ url: data.inviteUrl })
      setInviteEmail('')
    } else {
      setInviteResult({ error: data.error || 'Failed to send invite' })
    }
  }

  async function applyPromoCode() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoMsg(null)
    const res = await fetch('/api/promo/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode.trim(), userType: 'agent' }),
    })
    const data = await res.json()
    setPromoLoading(false)
    if (res.ok) {
      setPromoMsg({ text: 'Pro access activated! Refreshing...', ok: true })
      setPromoCode('')
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setPromoMsg({ text: data.error || 'Invalid code', ok: false })
    }
  }

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'white', borderRadius: '14px', padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '16px',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Logo size="sm" darkBackground showText />
        <span style={{ color: '#9ca3af', fontSize: '13px' }}>/ Agent Portal / Settings</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => router.push('/agent/dashboard')}
          style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px 60px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 20px' }}>Agency Settings</h1>

        {/* Agency Info */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' }}>Agency Info</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agency</span>
              <p style={{ fontSize: '16px', fontWeight: '700', margin: '2px 0 0' }}>{agencyName}</p>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</span>
              <p style={{ fontSize: '15px', margin: '2px 0 0' }}>{agentName}</p>
            </div>
          </div>
        </div>

        {/* Plan Status */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' }}>Plan Status</h2>
          {isPro ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ padding: '4px 12px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '700', borderRadius: '20px', fontSize: '13px' }}>
                PRO
              </span>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>
                {proExpiresAt
                  ? `Active until ${new Date(proExpiresAt).toLocaleDateString('en-CA')}`
                  : 'Active'}
              </span>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ padding: '4px 12px', backgroundColor: '#f3f4f6', color: '#6b7280', fontWeight: '700', borderRadius: '20px', fontSize: '13px' }}>
                  FREE
                </span>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Roster limit: {rosterLimit} performers</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
                Upgrade to Pro for unlimited roster, CSV export, advanced analytics, and priority placement.
              </p>
              {!promoMsg?.ok && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter access code"
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                  />
                  <button
                    onClick={applyPromoCode}
                    disabled={promoLoading}
                    style={{ padding: '9px 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}
                  >
                    {promoLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {promoMsg && (
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: promoMsg.ok ? '#16a34a' : '#dc2626' }}>
                  {promoMsg.ok ? '✓ ' : '✗ '}{promoMsg.text}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Team Members */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' }}>Team Members</h2>
          {teamLoading ? (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>Loading...</p>
          ) : team.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>No team members yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {team.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{m.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>{m.email}</p>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    backgroundColor: m.role === 'owner' ? '#fef3c7' : '#eff6ff',
                    color: m.role === 'owner' ? '#92400e' : '#1d4ed8',
                  }}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Invite form */}
          <div style={{ borderTop: team.length > 0 ? '1px solid #f3f4f6' : 'none', paddingTop: team.length > 0 ? '16px' : 0 }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: '0 0 8px' }}>Invite a Team Member</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@agency.com"
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
              />
              <button
                onClick={sendInvite}
                disabled={inviteLoading}
                style={{ padding: '9px 16px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}
              >
                {inviteLoading ? '...' : 'Send Invite'}
              </button>
            </div>

            {inviteResult?.url && (
              <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#15803d', fontWeight: '600' }}>Invite link created!</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#374151', wordBreak: 'break-all' }}>
                  Share this link: <strong>{inviteResult.url}</strong>
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteResult.url!)}
                  style={{ marginTop: '6px', fontSize: '12px', color: '#15803d', fontWeight: '600', background: 'none', border: '1px solid #86efac', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                >
                  Copy Link
                </button>
              </div>
            )}
            {inviteResult?.error && (
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#dc2626' }}>✗ {inviteResult.error}</p>
            )}
          </div>
        </div>

        {/* Sign Out */}
        <div style={sectionStyle}>
          <button
            onClick={async () => {
              await fetch('/api/agent/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
              router.push('/agent/login')
            }}
            style={{ padding: '10px 20px', border: '1px solid #fca5a5', borderRadius: '8px', background: 'white', color: '#dc2626', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
