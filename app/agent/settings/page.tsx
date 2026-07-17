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
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoMsg, setLogoMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) { setLogoMsg({ text: 'Please choose an image file', ok: false }); return }
    if (file.size > 2 * 1024 * 1024) { setLogoMsg({ text: 'Logo must be under 2 MB', ok: false }); return }
    setLogoUploading(true); setLogoMsg(null)
    const fd = new FormData()
    fd.append('logo', file)
    const res = await fetch('/api/agent/logo', { method: 'POST', body: fd })
    const d = await res.json().catch(() => ({}))
    setLogoUploading(false)
    if (res.ok) { setLogoUrl(d.logo_url); setLogoMsg({ text: 'Logo updated', ok: true }) }
    else setLogoMsg({ text: d.error || 'Upload failed', ok: false })
  }
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

  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function saveName() {
    if (!nameInput.trim()) return
    setNameSaving(true); setNameMsg(null)
    const res = await fetch('/api/agent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_profile', name: nameInput.trim() }),
    })
    const d = await res.json()
    setNameSaving(false)
    if (res.ok) { setAgentName(d.name); setNameMsg({ text: 'Name updated', ok: true }) }
    else setNameMsg({ text: d.error || 'Failed to update', ok: false })
  }

  async function changePassword() {
    setPwMsg(null)
    if (newPw.length < 8) { setPwMsg({ text: 'New password must be at least 8 characters', ok: false }); return }
    if (newPw !== confirmPw) { setPwMsg({ text: 'New passwords do not match', ok: false }); return }
    setPwSaving(true)
    const res = await fetch('/api/agent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_password', currentPassword: curPw, newPassword: newPw }),
    })
    const d = await res.json()
    setPwSaving(false)
    if (res.ok) { setPwMsg({ text: 'Password updated', ok: true }); setCurPw(''); setNewPw(''); setConfirmPw('') }
    else setPwMsg({ text: d.error || 'Failed to update password', ok: false })
  }

  useEffect(() => {
    fetch('/api/agent/auth', { method: 'GET' }).then(async res => {
      if (!res.ok) { router.push('/agent/login'); return }
      const d = await res.json()
      setAgentName(d.name || '')
      setNameInput(d.name || '')
      setAgencyName(d.agencyName || '')
      setAgencyId(d.agencyId || '')
      setLogoUrl(d.logoUrl || null)
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {logoUrl ? <img src={logoUrl} alt="Agency logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '22px' }}>🏢</span>}
                </div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{agencyName}</p>
                  <label style={{ display: 'inline-block', marginTop: '6px', fontSize: '12px', fontWeight: '700', color: '#1a1a2e', cursor: 'pointer', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                    {logoUploading ? 'Uploading…' : (logoUrl ? 'Change logo' : 'Upload logo')}
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={logoUploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
                  </label>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>PNG or JPG, under 2 MB. Shown on your performers&apos; profiles.</p>
                  {logoMsg && <p style={{ fontSize: '12px', fontWeight: '600', margin: '4px 0 0', color: logoMsg.ok ? '#16a34a' : '#dc2626' }}>{logoMsg.text}</p>}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Display Name</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Your name" style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }} />
                <button onClick={saveName} disabled={nameSaving || !nameInput.trim()} style={{ padding: '9px 16px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: nameSaving || !nameInput.trim() ? 'not-allowed' : 'pointer', fontSize: '14px', whiteSpace: 'nowrap', opacity: nameSaving || !nameInput.trim() ? 0.5 : 1 }}>
                  {nameSaving ? '...' : 'Save'}
                </button>
              </div>
              {nameMsg && <p style={{ fontSize: '13px', margin: '6px 0 0', color: nameMsg.ok ? '#16a34a' : '#dc2626' }}>{nameMsg.ok ? '✓ ' : '✗ '}{nameMsg.text}</p>}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' }}>Change Password</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type={showPw ? 'text' : 'password'} value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="Current password" style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }} />
            <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 8 characters)" style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }} />
            <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>
              <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} /> Show passwords
            </label>
            <button onClick={changePassword} disabled={pwSaving} style={{ alignSelf: 'flex-start', padding: '9px 18px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: pwSaving ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: pwSaving ? 0.5 : 1 }}>
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
            {pwMsg && <p style={{ fontSize: '13px', margin: '2px 0 0', color: pwMsg.ok ? '#16a34a' : '#dc2626' }}>{pwMsg.ok ? '✓ ' : '✗ '}{pwMsg.text}</p>}
          </div>
        </div>

        {/* Plan Status */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' }}>Plan</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ padding: '4px 12px', backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: '700', borderRadius: '20px', fontSize: '13px' }}>Free</span>
            <span style={{ color: '#6b7280', fontSize: '13px' }}>BGReady is free for agencies — no subscription required.</span>
          </div>
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
