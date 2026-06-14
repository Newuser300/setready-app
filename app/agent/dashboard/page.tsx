'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

// ─── Types ──────────────────────────────────────────────────────────────────

type RosterEntry = {
  id: string
  status: string
  user_id: string
  users: { id: string; email: string; raw_user_meta_data: any } | null
  performer_profiles: {
    headshot_url?: string
    union_status?: string
    height_cm?: number
    hair_color?: string
    eye_color?: string
    gender?: string
  } | null
  weekAvailability: { date: string; status: string | null }[]
}

type CastingRequest = {
  id: string
  production_name: string
  shoot_date: string
  location: string
  role_type: string
  gender_needed?: string
  age_min?: number
  age_max?: number
  union_status?: string
  performers_needed: number
  rate?: string
  rate_notes?: string
  description?: string
  status: string
  mySubmissionCount: number
  casting_directors?: { name: string; company: string }
}

type Submission = {
  id: string
  status: string
  submitted_at: string
  casting_requests: { production_name: string; shoot_date: string; location: string; role_type: string } | null
  performer_profiles: { headshot_url?: string } | null
  users: { id: string; email: string; raw_user_meta_data: any } | null
}

type Notification = {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  action_url?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AVAIL_COLOR: Record<string, string> = {
  available: '#22c55e',
  unavailable: '#ef4444',
  booked: '#3b82f6',
  tentative: '#f59e0b',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  submitted:   { bg: '#f3f4f6', color: '#374151' },
  shortlisted: { bg: '#fef9c3', color: '#854d0e' },
  confirmed:   { bg: '#dcfce7', color: '#15803d' },
  rejected:    { bg: '#fee2e2', color: '#b91c1c' },
  pending:     { bg: '#eff6ff', color: '#1d4ed8' },
}

const NAV = [
  { key: 'overview',       icon: '🏠', label: 'Dashboard' },
  { key: 'roster',         icon: '👥', label: 'My Roster' },
  { key: 'requests',       icon: '📋', label: 'Casting Requests' },
  { key: 'submissions',    icon: '📨', label: 'Submissions' },
  { key: 'availability',   icon: '📅', label: 'Availability' },
  { key: 'notifications',  icon: '🔔', label: 'Notifications' },
  { key: 'settings',       icon: '⚙️', label: 'Settings' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(user: RosterEntry['users'] | null) {
  if (!user) return 'Unknown'
  return user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name || user.email?.split('@')[0] || 'Performer'
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function fmtHeight(cm?: number) {
  if (!cm) return '—'
  const totalIn = Math.round(cm / 2.54)
  return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: '14px', padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex',
      alignItems: 'center', gap: '14px'
    }}>
      <div style={{ fontSize: '28px', lineHeight: 1 }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: color || '#1a1a2e' }}>{value}</p>
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{label}</p>
      </div>
    </div>
  )
}

function HeadshotCircle({ url, name, size = 44 }: { url?: string; name: string; size?: number }) {
  if (url) {
    return (
      <img src={url} alt={name} style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0, border: '2px solid #e5e7eb'
      }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: '#F59E0B', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: size * 0.35, color: '#1a1a2e'
    }}>
      {initials(name)}
    </div>
  )
}

function Badge({ text, style }: { text: string; style?: React.CSSProperties }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      borderRadius: '20px', fontSize: '11px', fontWeight: '600',
      backgroundColor: '#f3f4f6', color: '#374151',
      ...style
    }}>
      {text}
    </span>
  )
}

// ─── Main dashboard ──────────────────────────────────────────────────────────

export default function AgentDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  )

  // Data
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [requests, setRequests] = useState<CastingRequest[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [agentName, setAgentName] = useState('')
  const [agencyName, setAgencyName] = useState('')

  // Pro status
  const [isPro, setIsPro] = useState(false)
  const [rosterLimit, setRosterLimit] = useState<number | null>(25)

  // Loading
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  // Roster UI
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterFilter, setRosterFilter] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addSuccess, setAddSuccess] = useState('')

  // Submit performers modal
  const [submitModal, setSubmitModal] = useState<CastingRequest | null>(null)
  const [submitIds, setSubmitIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [submitNotes, setSubmitNotes] = useState('')
  const [submitSearch, setSubmitSearch] = useState('')

  // Submission filters
  const [subStatusFilter, setSubStatusFilter] = useState('')

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Load session info
  useEffect(() => {
    fetch('/api/agent/auth', { method: 'GET' }).then(async res => {
      if (!res.ok) { router.push('/agent/login'); return }
      const d = await res.json()
      setAgentName(d.name || '')
      setAgencyName(d.agencyName || '')
    }).catch(() => router.push('/agent/login'))

    fetch('/api/agent/pro-status').then(async res => {
      if (!res.ok) return
      const d = await res.json()
      setIsPro(d.isPro)
      setRosterLimit(d.rosterLimit)
    })
  }, [router])

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true)
    const res = await fetch('/api/agent/roster')
    if (res.ok) setRoster(await res.json())
    setLoadingRoster(false)
  }, [])

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true)
    const res = await fetch('/api/agent/requests')
    if (res.ok) setRequests(await res.json())
    setLoadingRequests(false)
  }, [])

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true)
    const res = await fetch('/api/agent/submissions')
    if (res.ok) setSubmissions(await res.json())
    setLoadingSubmissions(false)
  }, [])

  const loadNotifications = useCallback(async () => {
    const res = await fetch('/api/agent/notifications')
    if (res.ok) setNotifications(await res.json())
  }, [])

  useEffect(() => {
    if (activeTab === 'roster' || activeTab === 'overview') loadRoster()
    if (activeTab === 'requests' || activeTab === 'overview') loadRequests()
    if (activeTab === 'submissions') loadSubmissions()
    if (activeTab === 'notifications') loadNotifications()
  }, [activeTab, loadRoster, loadRequests, loadSubmissions, loadNotifications])

  // ── Stats ──────────────────────────────────────────────────────────────────

  const todayStr = new Date().toISOString().slice(0, 10)
  const filteredSubmissions = subStatusFilter
    ? submissions.filter(s => s.status === subStatusFilter)
    : submissions
  const availableToday = roster.filter(r =>
    r.weekAvailability.find(w => w.date === todayStr)?.status === 'available'
  ).length
  const openRequests = requests.filter(r => r.status === 'open').length
  const pendingSubmissions = submissions.filter(s => s.status === 'submitted').length

  // ── Add performer ──────────────────────────────────────────────────────────

  async function addPerformer() {
    if (!addEmail.trim()) return
    if (rosterLimit !== null && roster.length >= rosterLimit) {
      setAddError(`Free plan roster limit (${rosterLimit}) reached. Upgrade to Pro for unlimited performers.`)
      return
    }
    setAddLoading(true)
    setAddError('')
    setAddSuccess('')

    const res = await fetch('/api/agent/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addEmail.trim() }),
    })
    const data = await res.json()
    setAddLoading(false)

    if (!res.ok) {
      setAddError(data.error || 'Failed to add performer')
    } else {
      setAddSuccess(`Invite sent to ${addEmail.trim()}`)
      setAddEmail('')
      loadRoster()
    }
  }

  async function removeFromRoster(rosterId: string) {
    if (!confirm('Remove this performer from your roster?')) return
    await fetch('/api/agent/roster', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rosterId }),
    })
    loadRoster()
  }

  // ── Submit performers ──────────────────────────────────────────────────────

  async function submitPerformers() {
    if (!submitModal || !submitIds.length) return
    setSubmitting(true)
    setSubmitMsg('')

    const res = await fetch('/api/agent/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ castingRequestId: submitModal.id, performerIds: submitIds, notes: submitNotes || null }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (res.ok) {
      setSubmitMsg(`✅ ${data.submitted} performer${data.submitted !== 1 ? 's' : ''} submitted!`)
      loadRequests()
      setTimeout(() => { setSubmitModal(null); setSubmitIds([]); setSubmitMsg(''); setSubmitNotes(''); setSubmitSearch('') }, 1500)
    } else {
      setSubmitMsg(`❌ ${data.error}`)
    }
  }

  async function markAllRead() {
    await fetch('/api/agent/notifications', { method: 'PATCH' })
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
  }

  // ── Roster filtering ───────────────────────────────────────────────────────

  const filteredRoster = roster.filter(r => {
    const name = displayName(r.users).toLowerCase()
    const email = (r.users?.email || '').toLowerCase()
    const matchSearch = !rosterSearch || name.includes(rosterSearch.toLowerCase()) || email.includes(rosterSearch.toLowerCase())
    const matchFilter = !rosterFilter || r.performer_profiles?.union_status === rosterFilter
    return matchSearch && matchFilter
  })

  // ── Roster for submit modal ────────────────────────────────────────────────

  const eligibleForRequest = (req: CastingRequest) => roster.filter(r => {
    const avail = r.weekAvailability.find(w => w.date === req.shoot_date)
    const matchGender = !req.gender_needed || req.gender_needed === 'Any' ||
      r.performer_profiles?.gender?.toLowerCase() === req.gender_needed.toLowerCase()
    return avail?.status === 'available' && matchGender
  })

  // ── Sidebar / bottom nav ───────────────────────────────────────────────────

  const unreadCount = notifications.filter(n => !n.is_read).length

  // ── Shared section header ──────────────────────────────────────────────────

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'white', borderRadius: '14px',
    padding: '20px', marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const SIDEBAR_W = 220

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        backgroundColor: '#1a1a2e', color: 'white',
        padding: '12px 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size="sm" darkBackground={true} showText={true} />
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>Agent</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#d1d5db' }}>
            {agencyName || agentName}
          </span>
          <button
            onClick={async () => {
              await fetch('/api/agent/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
              router.push('/agent/login')
            }}
            style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={{
            width: SIDEBAR_W, backgroundColor: 'white',
            borderRight: '1px solid #e5e7eb',
            position: 'sticky', top: '52px',
            height: 'calc(100vh - 52px)',
            overflowY: 'auto', flexShrink: 0,
            padding: '16px 0',
          }}>
            {NAV.map(n => (
              <button
                key={n.key}
                onClick={() => setActiveTab(n.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '10px 20px',
                  background: activeTab === n.key ? '#fffbeb' : 'none',
                  border: 'none',
                  borderLeft: activeTab === n.key ? '3px solid #F59E0B' : '3px solid transparent',
                  color: activeTab === n.key ? '#92400e' : '#374151',
                  fontWeight: activeTab === n.key ? '700' : '400',
                  fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: '18px' }}>{n.icon}</span>
                {n.label}
                {n.key === 'notifications' && unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', right: '14px',
                    backgroundColor: '#ef4444', color: 'white',
                    borderRadius: '10px', padding: '0 6px',
                    fontSize: '11px', fontWeight: '700',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, padding: isMobile ? '12px 12px 80px' : '20px 24px', minWidth: 0 }}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 16px' }}>
                Dashboard
              </h1>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <StatCard icon="👥" label="Total on Roster" value={roster.length} />
                <StatCard icon="✅" label="Available Today" value={availableToday} color="#22c55e" />
                <StatCard icon="📋" label="Open Requests" value={openRequests} color="#3b82f6" />
                <StatCard icon="📨" label="Pending Submissions" value={pendingSubmissions} color="#f59e0b" />
              </div>

              {/* Recent requests */}
              <div style={sectionStyle}>
                <h2 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 12px' }}>🗓 Upcoming Shoot Dates</h2>
                {loadingRequests ? (
                  <p style={{ color: '#9ca3af', fontSize: '14px' }}>Loading...</p>
                ) : requests.slice(0, 5).map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid #f3f4f6',
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{r.production_name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                        {r.shoot_date} · {r.location} · {r.role_type}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                        {r.mySubmissionCount}/{r.performers_needed} submitted
                      </p>
                      <button
                        onClick={() => { setActiveTab('requests') }}
                        style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        View →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ROSTER ── */}
          {activeTab === 'roster' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: 0 }}>
                  👥 My Roster
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {roster.length}{rosterLimit !== null ? ` / ${rosterLimit}` : ''} performers
                  </span>
                  {!isPro && (
                    <span
                      onClick={() => router.push('/agent/settings')}
                      style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '700', cursor: 'pointer', padding: '2px 8px', border: '1px solid #F59E0B', borderRadius: '20px' }}
                    >
                      FREE
                    </span>
                  )}
                </div>
              </div>

              {/* Search + filter */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input
                  value={rosterSearch}
                  onChange={e => setRosterSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  style={{ flex: 1, minWidth: '200px', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                />
                <select
                  value={rosterFilter}
                  onChange={e => setRosterFilter(e.target.value)}
                  style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white' }}
                >
                  <option value="">All union statuses</option>
                  <option value="Non-Union">Non-Union</option>
                  <option value="UBCP/ACTRA Permit">Permit</option>
                  <option value="UBCP/ACTRA Full Member">Full Member</option>
                </select>
              </div>

              {/* Add performer */}
              <div style={{ ...sectionStyle, marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px' }}>➕ Add Performer</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPerformer()}
                    placeholder="performer@email.com"
                    type="email"
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                  />
                  <button
                    onClick={addPerformer}
                    disabled={addLoading}
                    style={{
                      padding: '9px 20px', backgroundColor: '#F59E0B', color: '#1a1a2e',
                      fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
                    }}
                  >
                    {addLoading ? '...' : 'Add'}
                  </button>
                </div>
                {addError && <p style={{ color: '#dc2626', fontSize: '13px', margin: '6px 0 0' }}>{addError}</p>}
                {addSuccess && <p style={{ color: '#16a34a', fontSize: '13px', margin: '6px 0 0' }}>{addSuccess}</p>}
              </div>

              {/* Roster cards */}
              {loadingRoster ? (
                <p style={{ color: '#9ca3af' }}>Loading roster...</p>
              ) : filteredRoster.length === 0 ? (
                <div style={{ ...sectionStyle, textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#9ca3af' }}>No performers on your roster yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredRoster.map(r => {
                    const name = displayName(r.users)
                    const prof = r.performer_profiles
                    return (
                      <div key={r.id} style={{
                        backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        display: 'flex', gap: '12px', alignItems: 'flex-start',
                      }}>
                        <HeadshotCircle url={prof?.headshot_url} name={name} size={52} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', fontSize: '15px' }}>{name}</span>
                            {r.status === 'pending' && <Badge text="Pending" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }} />}
                            {prof?.union_status && <Badge text={prof.union_status} />}
                          </div>

                          <p style={{ margin: '3px 0', fontSize: '12px', color: '#6b7280' }}>
                            {[fmtHeight(prof?.height_cm), prof?.hair_color, prof?.eye_color].filter(Boolean).join(' · ') || 'No profile yet'}
                          </p>

                          {/* Week availability dots */}
                          <div style={{ display: 'flex', gap: '4px', margin: '8px 0 0', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#9ca3af', marginRight: '2px' }}>This week:</span>
                            {r.weekAvailability.map(w => (
                              <div
                                key={w.date}
                                title={`${w.date}: ${w.status || 'not set'}`}
                                style={{
                                  width: '12px', height: '12px', borderRadius: '50%',
                                  backgroundColor: w.status ? AVAIL_COLOR[w.status] || '#9ca3af' : '#e5e7eb',
                                  flexShrink: 0,
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => router.push(`/profile/${r.user_id}`)}
                            style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '600', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151' }}
                          >
                            👤 Profile
                          </button>
                          <button
                            onClick={() => router.push(`/availability?userId=${r.user_id}`)}
                            style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '600', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#374151' }}
                          >
                            📅 Avail
                          </button>
                          <button
                            onClick={() => removeFromRoster(r.id)}
                            style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '600', border: '1px solid #fca5a5', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#dc2626' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CASTING REQUESTS ── */}
          {activeTab === 'requests' && (
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 16px' }}>
                📋 Casting Requests
              </h1>

              {loadingRequests ? (
                <p style={{ color: '#9ca3af' }}>Loading...</p>
              ) : requests.length === 0 ? (
                <div style={{ ...sectionStyle, textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#9ca3af' }}>No open casting requests right now.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {requests.map(req => (
                    <div key={req.id} style={{ ...sectionStyle, marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '800', fontSize: '16px' }}>{req.production_name}</span>
                            <Badge text={req.role_type} style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }} />
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#6b7280' }}>
                            📅 {req.shoot_date} · 📍 {req.location}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {req.gender_needed && <Badge text={`Gender: ${req.gender_needed}`} />}
                            {(req.age_min || req.age_max) && (
                              <Badge text={`Age: ${req.age_min || '?'}–${req.age_max || '?'}`} />
                            )}
                            {req.union_status && <Badge text={req.union_status} />}
                            {req.rate && <Badge text={`$${req.rate}`} style={{ backgroundColor: '#f0fdf4', color: '#15803d' }} />}
                          </div>
                          {req.description && (
                            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#374151' }}>{req.description}</p>
                          )}
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#6b7280' }}>
                            {req.mySubmissionCount}/{req.performers_needed} submitted
                          </p>
                          <button
                            onClick={() => {
                              setSubmitModal(req)
                              setSubmitIds([])
                              setSubmitMsg('')
                              setSubmitNotes('')
                              setSubmitSearch('')
                            }}
                            style={{
                              padding: '8px 16px', backgroundColor: '#1a1a2e',
                              color: 'white', fontWeight: '700', fontSize: '13px',
                              border: 'none', borderRadius: '8px', cursor: 'pointer',
                            }}
                          >
                            Submit Performers
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SUBMISSIONS ── */}
          {activeTab === 'submissions' && (
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 12px' }}>📨 Submissions</h1>

              {/* Submission stats bar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {([
                  { status: '', label: 'All' },
                  { status: 'submitted', label: 'Submitted' },
                  { status: 'shortlisted', label: 'Shortlisted' },
                  { status: 'confirmed', label: 'Confirmed' },
                  { status: 'rejected', label: 'Rejected' },
                ] as const).map(({ status, label }) => {
                  const count = status ? submissions.filter(s => s.status === status).length : submissions.length
                  const sc = STATUS_COLORS[status || 'submitted'] || STATUS_COLORS.submitted
                  const isActive = subStatusFilter === status
                  return (
                    <button
                      key={status}
                      onClick={() => setSubStatusFilter(status)}
                      style={{
                        padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                        border: isActive ? '2px solid #1a1a2e' : '2px solid transparent',
                        backgroundColor: status ? sc.bg : (isActive ? '#1a1a2e' : '#f3f4f6'),
                        color: status ? sc.color : (isActive ? 'white' : '#374151'),
                        cursor: 'pointer',
                      }}
                    >
                      {label} ({count})
                    </button>
                  )
                })}
              </div>

              {loadingSubmissions ? (
                <p style={{ color: '#9ca3af' }}>Loading...</p>
              ) : submissions.length === 0 ? (
                <div style={{ ...sectionStyle, textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#9ca3af' }}>No submissions yet.</p>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div style={{ ...sectionStyle, textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#9ca3af' }}>No {subStatusFilter} submissions.</p>
                </div>
              ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          {['Performer', 'Production', 'Shoot Date', 'Status', 'Submitted'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions.map(s => {
                          const name = displayName(s.users)
                          const sc = STATUS_COLORS[s.status] || STATUS_COLORS.submitted
                          return (
                            <tr key={s.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <HeadshotCircle url={s.performer_profiles?.headshot_url} name={name} size={32} />
                                  <span style={{ fontWeight: '600' }}>{name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#374151' }}>
                                {s.casting_requests?.production_name || '—'}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                {s.casting_requests?.shoot_date || '—'}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{
                                  display: 'inline-block', padding: '2px 10px',
                                  borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                  backgroundColor: sc.bg, color: sc.color,
                                }}>
                                  {s.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                {timeAgo(s.submitted_at)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AVAILABILITY ── */}
          {activeTab === 'availability' && (
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 16px' }}>
                📅 Roster Availability
              </h1>
              <div style={sectionStyle}>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                  View or update availability for a performer on your roster:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {roster.map(r => {
                    const name = displayName(r.users)
                    return (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 0', borderBottom: '1px solid #f9fafb',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <HeadshotCircle url={r.performer_profiles?.headshot_url} name={name} size={36} />
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>{name}</span>
                        </div>
                        <button
                          onClick={() => router.push(`/availability?userId=${r.user_id}`)}
                          style={{ padding: '6px 14px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', fontSize: '13px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          View Calendar
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: 0 }}>🔔 Notifications</h1>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ ...sectionStyle, textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#9ca3af' }}>No notifications yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => n.action_url && router.push(n.action_url)}
                      style={{
                        backgroundColor: n.is_read ? 'white' : '#fffbeb',
                        borderRadius: '12px', padding: '14px 16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        cursor: n.action_url ? 'pointer' : 'default',
                        borderLeft: n.is_read ? 'none' : '3px solid #F59E0B',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{ margin: '0 0 3px', fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>
                          {n.title}
                        </p>
                        <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0, marginLeft: '8px' }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 16px' }}>⚙️ Settings</h1>
              <div style={sectionStyle}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agency</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{agencyName}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</p>
                  <p style={{ fontSize: '15px', margin: 0 }}>{agentName}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan</p>
                  <span style={{
                    display: 'inline-block', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                    backgroundColor: isPro ? '#fef3c7' : '#f3f4f6',
                    color: isPro ? '#92400e' : '#6b7280',
                  }}>
                    {isPro ? 'PRO' : `FREE — ${rosterLimit} performer limit`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                  <button
                    onClick={() => router.push('/agent/settings')}
                    style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', color: '#374151', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Agency Settings & Team
                  </button>
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
          )}

        </div>
      </div>

      {/* Mobile bottom tabs */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          backgroundColor: 'white', borderTop: '1px solid #e5e7eb',
          display: 'flex', overflowX: 'auto',
          zIndex: 50,
        }}>
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => setActiveTab(n.key)}
              style={{
                flex: '0 0 auto', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === n.key ? '#F59E0B' : '#9ca3af',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '20px' }}>{n.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: activeTab === n.key ? '700' : '400', marginTop: '2px' }}>
                {n.label.split(' ')[0]}
              </span>
              {n.key === 'notifications' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '6px',
                  backgroundColor: '#ef4444', color: 'white',
                  borderRadius: '8px', padding: '0 4px',
                  fontSize: '10px', fontWeight: '700',
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Submit performers modal */}
      {submitModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setSubmitModal(null); setSubmitIds([]); setSubmitNotes(''); setSubmitSearch('') } }}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 60, display: 'flex', alignItems: 'flex-end',
            justifyContent: 'center', padding: isMobile ? '0' : '20px',
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: isMobile ? '20px 20px 0 0' : '16px',
            padding: '20px', width: '100%', maxWidth: '560px',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px' }}>
                  Submit Performers
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                  {submitModal.production_name} · {submitModal.shoot_date}
                </p>
              </div>
              <button onClick={() => { setSubmitModal(null); setSubmitIds([]); setSubmitNotes(''); setSubmitSearch('') }} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            {(() => {
              const allEligible = eligibleForRequest(submitModal)
              const eligible = allEligible.filter(r =>
                !submitSearch ||
                displayName(r.users).toLowerCase().includes(submitSearch.toLowerCase()) ||
                (r.users?.email || '').toLowerCase().includes(submitSearch.toLowerCase())
              )
              return allEligible.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                  <p>No available performers match this request on {submitModal.shoot_date}.</p>
                  <p style={{ fontSize: '12px' }}>Performers must be marked Available on that date.</p>
                </div>
              ) : (
                <>
                  <input
                    value={submitSearch}
                    onChange={e => setSubmitSearch(e.target.value)}
                    placeholder="Search performers by name..."
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 10px' }}>
                    {eligible.length}{submitSearch ? ` of ${allEligible.length}` : ''} performer{allEligible.length !== 1 ? 's' : ''} available on shoot date:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {eligible.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', padding: '16px 0' }}>No performers match your search.</p>
                    ) : eligible.map(r => {
                      const name = displayName(r.users)
                      const selected = submitIds.includes(r.user_id)
                      return (
                        <label
                          key={r.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                            backgroundColor: selected ? '#fffbeb' : '#f9fafb',
                            border: `1px solid ${selected ? '#F59E0B' : '#e5e7eb'}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => setSubmitIds(prev => selected ? prev.filter(id => id !== r.user_id) : [...prev, r.user_id])}
                            style={{ width: '16px', height: '16px', flexShrink: 0 }}
                          />
                          <HeadshotCircle url={r.performer_profiles?.headshot_url} name={name} size={36} />
                          <div>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{name}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                              {[r.performer_profiles?.union_status, fmtHeight(r.performer_profiles?.height_cm)].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Note to Casting Director (optional)
                    </label>
                    <textarea
                      value={submitNotes}
                      onChange={e => setSubmitNotes(e.target.value)}
                      placeholder="Add any notes about these performers or the submission..."
                      rows={3}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </>
              )
            })()}

            {submitMsg && (
              <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: '600', color: submitMsg.startsWith('✅') ? '#15803d' : '#dc2626', margin: '0 0 12px' }}>
                {submitMsg}
              </p>
            )}

            <button
              onClick={submitPerformers}
              disabled={submitIds.length === 0 || submitting}
              style={{
                width: '100%', padding: '13px',
                backgroundColor: submitIds.length === 0 ? '#e5e7eb' : '#1a1a2e',
                color: submitIds.length === 0 ? '#9ca3af' : 'white',
                fontWeight: '700', fontSize: '14px',
                border: 'none', borderRadius: '10px',
                cursor: submitIds.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting...' : `Submit ${submitIds.length > 0 ? submitIds.length + ' ' : ''}Selected Performer${submitIds.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
