'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalendarDay { date: string; count: number }
interface Performer {
  user_id: string
  headshot_url: string | null
  gender: string | null
  age: number | null
  height_cm: number | null
  hair_color: string | null
  eye_color: string | null
  ethnicity: string | null
  union_status: string | null
  special_skills: string[] | null
  bio: string | null
  availabilityStatus: string | null
  agencies: { id: string; name: string } | null
  users: { email: string; raw_user_meta_data: { full_name?: string } } | null
}
interface CastingRequest {
  id: string
  production_name: string
  project_type: string | null
  shoot_date: string
  call_time: string | null
  location: string | null
  role_type: string
  performers_needed: number
  filled_count: number
  gender_needed: string
  age_min: number | null
  age_max: number | null
  union_status: string | null
  rate: string | null
  description: string | null
  wardrobe_notes: string | null
  status: string
  submissionCount: number
  agencyCount: number
  confirmedCount: number
  shortlistedCount: number
}
interface Submission {
  id: string
  status: string
  notes: string | null
  submitted_at: string
  performer_id: string
  agency_id: string
  performer_profiles: { headshot_url: string | null; union_status: string | null; height_cm: number | null; gender: string | null; special_skills: string[] | null } | null
  users: { email: string; raw_user_meta_data: { full_name?: string } } | null
  agencies: { id: string; name: string } | null
}
interface Notification {
  id: string
  type: string
  title: string
  message: string
  action_url: string | null
  is_read: boolean
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Browse', 'New Request', 'My Requests', 'Notifications'] as const
type Tab = typeof TABS[number]

const STEP_LABELS = ['Production', 'Schedule', 'Role Details', 'Who You Need', 'Distribution']

const GENDER_OPTIONS = ['Any', 'Male', 'Female', 'Non-binary']
const HAIR_OPTIONS = ['', 'Black', 'Brown', 'Blonde', 'Red', 'Grey', 'White', 'Bald', 'Other']
const EYE_OPTIONS = ['', 'Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Other']
const UNION_OPTIONS = ['', 'UBCP/ACTRA', 'Non-union', 'Must Join']
const PROJECT_TYPES = ['Feature Film', 'TV Series', 'Commercial', 'Music Video', 'Short Film', 'Documentary', 'Web Series', 'Other']
const ROLE_TYPES = ['Background', 'Featured Extra', 'Day Player', 'Principal', 'Stunt', 'Specialty']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}
function daysUntil(dateStr: string) {
  const diff = new Date(dateStr + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / 86400000)
}
function heatColor(count: number, max: number) {
  if (count === 0) return '#f3f4f6'
  const pct = Math.min(count / Math.max(max, 1), 1)
  if (pct < 0.25) return '#bbf7d0'
  if (pct < 0.5) return '#4ade80'
  if (pct < 0.75) return '#16a34a'
  return '#14532d'
}
function statusColor(s: string) {
  if (s === 'confirmed') return '#16a34a'
  if (s === 'shortlisted') return '#d97706'
  if (s === 'rejected') return '#dc2626'
  return '#6b7280'
}
function statusBg(s: string) {
  if (s === 'confirmed') return '#f0fdf4'
  if (s === 'shortlisted') return '#fffbeb'
  if (s === 'rejected') return '#fef2f2'
  return '#f9fafb'
}

// ─── Performer Card ────────────────────────────────────────────────────────────

function PerformerCard({ p, onClick }: { p: Performer; onClick: () => void }) {
  const name = p.users?.raw_user_meta_data?.full_name || p.users?.email?.split('@')[0] || 'Performer'
  const avail = p.availabilityStatus
  return (
    <div onClick={onClick} style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.15s', border: avail === 'available' ? '2px solid #22c55e' : '2px solid transparent' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
      <div style={{ aspectRatio: '3/4', backgroundColor: '#e5e7eb', position: 'relative', overflow: 'hidden' }}>
        {p.headshot_url
          ? <img src={p.headshot_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>👤</div>
        }
        {avail && (
          <div style={{ position: 'absolute', top: '6px', right: '6px', padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
            backgroundColor: avail === 'available' ? '#22c55e' : avail === 'booked' ? '#3b82f6' : avail === 'tentative' ? '#f59e0b' : '#ef4444',
            color: 'white' }}>
            {avail}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {[p.gender, p.age ? `${p.age}y` : null, p.union_status].filter(Boolean).join(' · ')}
        </div>
        {p.agencies && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{p.agencies.name}</div>}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CastingDashboardPage() {
  const router = useRouter()
  const [cdName, setCdName] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [unreadCount, setUnreadCount] = useState(0)
  const [isCastingPro, setIsCastingPro] = useState(false)

  // Overview
  const [calMonth, setCalMonth] = useState(new Date().toISOString().slice(0, 7))
  const [calData, setCalData] = useState<CalendarDay[]>([])
  const [calMax, setCalMax] = useState(1)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [drawerDate, setDrawerDate] = useState<string | null>(null)
  const [drawerPerformers, setDrawerPerformers] = useState<Performer[]>([])
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [stats, setStats] = useState({ totalRequests: 0, pendingConfirm: 0, thisWeekShoots: 0 })

  // Browse
  const [browseDate, setBrowseDate] = useState('')
  const [browseGender, setBrowseGender] = useState('Any')
  const [browseAgeMin, setBrowseAgeMin] = useState('')
  const [browseAgeMax, setBrowseAgeMax] = useState('')
  const [browseHair, setBrowseHair] = useState('')
  const [browseEye, setBrowseEye] = useState('')
  const [browseUnion, setBrowseUnion] = useState('')
  const [browseSkills, setBrowseSkills] = useState('')
  const [browseSort, setBrowseSort] = useState('available')
  const [performers, setPerformers] = useState<Performer[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [quickView, setQuickView] = useState<Performer | null>(null)

  // New Request
  const [step, setStep] = useState(0)
  const [reqForm, setReqForm] = useState({
    productionName: '', projectType: '', shootDate: '', callTime: '', location: '',
    roleType: 'Background', performersNeeded: '1', genderNeeded: 'Any',
    ageMin: '', ageMax: '', unionStatus: '', rate: '', rateNotes: '', description: '', wardrobeNotes: '',
    notifyAll: true, specificAgencyIds: [] as string[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // My Requests
  const [requests, setRequests] = useState<CastingRequest[]>([])
  const [reqTab, setReqTab] = useState<'open' | 'closed'>('open')
  const [reqLoading, setReqLoading] = useState(false)
  const [manageRequest, setManageRequest] = useState<(CastingRequest & { submissions: Submission[] }) | null>(null)
  const [manageLoading, setManageLoading] = useState(false)

  // Notifications
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [notifsLoading, setNotifsLoading] = useState(false)

  // ── Auth check ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/casting/auth', { method: 'GET' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { router.replace('/casting/login'); return }
        setCdName(d.name || d.email)
      })

    fetch('/api/casting/pro-status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setIsCastingPro(d.isPro) })
  }, [router])

  // ── Calendar ────────────────────────────────────────────────────────────────

  const loadCalendar = useCallback(async (month: string) => {
    const res = await fetch(`/api/casting/calendar?month=${month}`)
    if (!res.ok) return
    const data: CalendarDay[] = await res.json()
    setCalData(data)
    setCalMax(Math.max(1, ...data.map(d => d.count)))
  }, [])

  useEffect(() => { if (activeTab === 'Overview') loadCalendar(calMonth) }, [activeTab, calMonth, loadCalendar])

  // ── Stats ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'Overview') return
    fetch('/api/casting/requests?status=open')
      .then(r => r.ok ? r.json() : [])
      .then((data: CastingRequest[]) => {
        const now = new Date()
        const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7)
        setStats({
          totalRequests: data.length,
          pendingConfirm: data.reduce((a, r) => a + (r.submissionCount - r.confirmedCount), 0),
          thisWeekShoots: data.filter(r => { const d = new Date(r.shoot_date); return d >= now && d <= weekEnd }).length,
        })
      })
  }, [activeTab])

  // ── Browse performers ────────────────────────────────────────────────────────

  const loadPerformers = useCallback(async () => {
    setBrowseLoading(true)
    const params = new URLSearchParams()
    if (browseDate) params.set('date', browseDate)
    if (browseGender !== 'Any') params.set('gender', browseGender)
    if (browseAgeMin) params.set('ageMin', browseAgeMin)
    if (browseAgeMax) params.set('ageMax', browseAgeMax)
    if (browseHair) params.set('hairColor', browseHair)
    if (browseEye) params.set('eyeColor', browseEye)
    if (browseUnion) params.set('unionStatus', browseUnion)
    if (browseSkills) params.set('skills', browseSkills)
    params.set('sort', browseSort)

    const res = await fetch(`/api/casting/performers?${params}`)
    setBrowseLoading(false)
    if (!res.ok) return
    setPerformers(await res.json())
  }, [browseDate, browseGender, browseAgeMin, browseAgeMax, browseHair, browseEye, browseUnion, browseSkills, browseSort])

  useEffect(() => { if (activeTab === 'Browse') loadPerformers() }, [activeTab, loadPerformers])

  // ── Drawer performers ────────────────────────────────────────────────────────

  async function openDrawer(date: string) {
    setDrawerDate(date)
    setDrawerLoading(true)
    const res = await fetch(`/api/casting/performers?date=${date}&sort=available&limit=20`)
    setDrawerLoading(false)
    if (res.ok) setDrawerPerformers(await res.json())
  }

  // ── My Requests ──────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async () => {
    setReqLoading(true)
    const res = await fetch(`/api/casting/requests?status=${reqTab}`)
    setReqLoading(false)
    if (res.ok) setRequests(await res.json())
  }, [reqTab])

  useEffect(() => { if (activeTab === 'My Requests') loadRequests() }, [activeTab, reqTab, loadRequests])

  async function openManage(req: CastingRequest) {
    setManageLoading(true)
    const res = await fetch(`/api/casting/requests/${req.id}`)
    setManageLoading(false)
    if (res.ok) setManageRequest(await res.json())
  }

  async function updateSubmission(subId: string, status: string) {
    const res = await fetch('/api/casting/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: subId, status }),
    })
    if (res.ok && manageRequest) {
      // Refresh manage view
      const r2 = await fetch(`/api/casting/requests/${manageRequest.id}`)
      if (r2.ok) setManageRequest(await r2.json())
    }
  }

  // ── Notifications ────────────────────────────────────────────────────────────

  const loadNotifs = useCallback(async () => {
    setNotifsLoading(true)
    const res = await fetch('/api/casting/notifications')
    setNotifsLoading(false)
    if (res.ok) {
      const data = await res.json()
      setNotifs(data)
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
    }
  }, [])

  useEffect(() => { if (activeTab === 'Notifications') loadNotifs() }, [activeTab, loadNotifs])

  async function markAllRead() {
    await fetch('/api/casting/notifications', { method: 'PATCH' })
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
    setUnreadCount(0)
  }

  // Also load unread count on mount
  useEffect(() => {
    fetch('/api/casting/notifications')
      .then(r => r.ok ? r.json() : [])
      .then((data: Notification[]) => setUnreadCount(data.filter(n => !n.is_read).length))
  }, [])

  // ── Submit new request ────────────────────────────────────────────────────────

  async function submitRequest() {
    setSubmitting(true)
    const res = await fetch('/api/casting/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productionName: reqForm.productionName,
        projectType: reqForm.projectType || null,
        shootDate: reqForm.shootDate,
        callTime: reqForm.callTime || null,
        location: reqForm.location || null,
        roleType: reqForm.roleType,
        performersNeeded: parseInt(reqForm.performersNeeded) || 1,
        genderNeeded: reqForm.genderNeeded,
        ageMin: reqForm.ageMin ? parseInt(reqForm.ageMin) : null,
        ageMax: reqForm.ageMax ? parseInt(reqForm.ageMax) : null,
        unionStatus: reqForm.unionStatus || null,
        rate: reqForm.rate || null,
        rateNotes: reqForm.rateNotes || null,
        description: reqForm.description || null,
        wardrobeNotes: reqForm.wardrobeNotes || null,
        notifyAll: reqForm.notifyAll,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitSuccess(false)
        setStep(0)
        setReqForm({ productionName: '', projectType: '', shootDate: '', callTime: '', location: '', roleType: 'Background', performersNeeded: '1', genderNeeded: 'Any', ageMin: '', ageMax: '', unionStatus: '', rate: '', rateNotes: '', description: '', wardrobeNotes: '', notifyAll: true, specificAgencyIds: [] })
        setActiveTab('My Requests')
      }, 2500)
    }
  }

  async function signOut() {
    await fetch('/api/casting/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    router.replace('/casting/login')
  }

  // ─── Calendar builder ─────────────────────────────────────────────────────────

  function buildCalendar(month: string) {
    const [y, m] = month.split('-').map(Number)
    const firstDay = new Date(y, m - 1, 1).getDay()
    const daysInMonth = new Date(y, m, 0).getDate()
    const countMap: Record<string, number> = {}
    calData.forEach(d => { countMap[d.date] = d.count })
    const cells: { date: string | null; count: number }[] = []
    for (let i = 0; i < firstDay; i++) cells.push({ date: null, count: 0 })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      cells.push({ date: dateStr, count: countMap[dateStr] || 0 })
    }
    return cells
  }

  // ─── isMobile (reactive) ─────────────────────────────────────────────────────

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>

      {/* Top Bar */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size="sm" darkBackground showText />
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>/ Casting</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {cdName && <span style={{ color: '#e5e7eb', fontSize: '14px' }}>{cdName}</span>}
          <button onClick={signOut} style={{ color: '#9ca3af', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
        <div style={{ display: 'flex', padding: '0 16px', gap: '2px', minWidth: 'max-content' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '14px 18px', fontSize: '14px', fontWeight: activeTab === tab ? '700' : '500',
              color: activeTab === tab ? '#1a1a2e' : '#6b7280', background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #F59E0B' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', position: 'relative',
            }}>
              {tab}
              {tab === 'Notifications' && unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '8px', right: '6px', backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: isMobile ? '16px 12px' : '24px 20px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
        {activeTab === 'Overview' && (
          <div>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
              {[
                { label: 'Open Requests', value: stats.totalRequests, icon: '🎬' },
                { label: 'Pending Confirm', value: stats.pendingConfirm, icon: '⏳' },
                { label: 'Shoots This Week', value: stats.thisWeekShoots, icon: '📅' },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: 'white', borderRadius: '14px', padding: '18px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{s.icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Heatmap Calendar */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>Performer Availability Heatmap</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={() => {
                    const d = new Date(calMonth + '-01'); d.setMonth(d.getMonth() - 1)
                    setCalMonth(d.toISOString().slice(0, 7))
                  }} style={navBtnStyle}>‹</button>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', minWidth: '90px', textAlign: 'center' }}>
                    {new Date(calMonth + '-01').toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => {
                    const d = new Date(calMonth + '-01'); d.setMonth(d.getMonth() + 1)
                    setCalMonth(d.toISOString().slice(0, 7))
                  }} style={navBtnStyle}>›</button>
                </div>
              </div>

              {/* Day labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', fontWeight: '600', padding: '4px 0' }}>{d}</div>
                ))}
              </div>

              {/* Calendar cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {buildCalendar(calMonth).map((cell, i) => (
                  <div key={i}
                    onClick={() => cell.date && openDrawer(cell.date)}
                    onMouseEnter={() => cell.date && setHoverDate(cell.date)}
                    onMouseLeave={() => setHoverDate(null)}
                    style={{
                      aspectRatio: '1', borderRadius: '6px', cursor: cell.date ? 'pointer' : 'default',
                      backgroundColor: cell.date ? heatColor(cell.count, calMax) : 'transparent',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.1s', transform: hoverDate === cell.date ? 'scale(1.1)' : 'scale(1)',
                      position: 'relative',
                    }}>
                    {cell.date && (
                      <>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: cell.count > 10 ? 'white' : '#374151' }}>
                          {cell.date.split('-')[2]}
                        </span>
                        {cell.count > 0 && (
                          <span style={{ fontSize: '9px', color: cell.count > 10 ? 'rgba(255,255,255,0.85)' : '#6b7280' }}>{cell.count}</span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Few available</span>
                {['#bbf7d0', '#4ade80', '#16a34a', '#14532d'].map(c => (
                  <div key={c} style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: c }} />
                ))}
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Many available</span>
              </div>
            </div>
          </div>
        )}

        {/* ── BROWSE PERFORMERS ─────────────────────────────────────────────────── */}
        {activeTab === 'Browse' && (
          <div>
            {/* Filter Panel */}
            <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={filterLabel}>Available On</label>
                  <input type="date" value={browseDate} onChange={e => setBrowseDate(e.target.value)} style={filterInput} />
                </div>
                <div>
                  <label style={filterLabel}>Gender</label>
                  <select value={browseGender} onChange={e => setBrowseGender(e.target.value)} style={filterInput}>
                    {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={filterLabel}>Age Range</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="number" placeholder="Min" value={browseAgeMin} onChange={e => setBrowseAgeMin(e.target.value)} style={{ ...filterInput, width: '50%' }} />
                    <input type="number" placeholder="Max" value={browseAgeMax} onChange={e => setBrowseAgeMax(e.target.value)} style={{ ...filterInput, width: '50%' }} />
                  </div>
                </div>
                {isCastingPro ? (
                  <>
                    <div>
                      <label style={filterLabel}>Hair Color</label>
                      <select value={browseHair} onChange={e => setBrowseHair(e.target.value)} style={filterInput}>
                        {HAIR_OPTIONS.map(h => <option key={h} value={h}>{h || 'Any'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={filterLabel}>Eye Color</label>
                      <select value={browseEye} onChange={e => setBrowseEye(e.target.value)} style={filterInput}>
                        {EYE_OPTIONS.map(e => <option key={e} value={e}>{e || 'Any'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={filterLabel}>Union Status</label>
                      <select value={browseUnion} onChange={e => setBrowseUnion(e.target.value)} style={filterInput}>
                        {UNION_OPTIONS.map(u => <option key={u} value={u}>{u || 'Any'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={filterLabel}>Skills</label>
                      <input placeholder="e.g. driving, dance" value={browseSkills} onChange={e => setBrowseSkills(e.target.value)} style={filterInput} />
                    </div>
                  </>
                ) : (
                  <div style={{ gridColumn: '1 / -1', padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>🔒</span>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>Pro filters locked</span>
                      <span style={{ fontSize: '12px', color: '#78350f', marginLeft: '6px' }}>Hair, eye, union &amp; skills filters require a Pro access code.</span>
                    </div>
                  </div>
                )}
                <div>
                  <label style={filterLabel}>Sort By</label>
                  <select value={browseSort} onChange={e => setBrowseSort(e.target.value)} style={filterInput}>
                    <option value="available">Available first</option>
                    <option value="name">Name A–Z</option>
                    <option value="priority">Union Priority (Full → Non-Union)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={loadPerformers} style={{ padding: '9px 20px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  Search
                </button>
              </div>
            </div>

            {browseLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading performers...</div>
              : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{performers.length} performer{performers.length !== 1 ? 's' : ''} found</span>
                    {browseSort === 'priority' && (
                      <span style={{ fontSize: '12px', padding: '3px 10px', backgroundColor: '#f3e8ff', color: '#7e22ce', borderRadius: '20px', fontWeight: '600' }}>
                        P1 = Full Union · P2 = Apprentice · P3 = Background · P4 = Non-Union
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                    {performers.map(p => (
                      <PerformerCard key={p.user_id} p={p} onClick={() => setQuickView(p)} />
                    ))}
                  </div>
                  {performers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', backgroundColor: 'white', borderRadius: '14px' }}>
                      No performers match your filters.
                    </div>
                  )}
                </>
              )
            }
          </div>
        )}

        {/* ── NEW REQUEST ───────────────────────────────────────────────────────── */}
        {activeTab === 'New Request' && (
          <div>
            {submitSuccess ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎬</div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 10px' }}>Casting Request Sent!</h2>
                <p style={{ color: '#6b7280', fontSize: '15px' }}>Agencies have been notified. Redirecting to My Requests...</p>
              </div>
            ) : (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', maxWidth: '640px' }}>
                {/* Step progress */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
                  {STEP_LABELS.map((label, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: '4px', borderRadius: '2px', backgroundColor: i <= step ? '#F59E0B' : '#e5e7eb', marginBottom: '6px' }} />
                      <div style={{ fontSize: '10px', color: i === step ? '#1a1a2e' : '#9ca3af', fontWeight: i === step ? '700' : '400' }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Step 0 — Production */}
                {step === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={stepHeading}>Production Details</h3>
                    <div>
                      <label style={reqLabel}>Production Name *</label>
                      <input value={reqForm.productionName} onChange={e => setReqForm(f => ({ ...f, productionName: e.target.value }))} placeholder="e.g. Untitled Amazon Project" style={reqInput} />
                    </div>
                    <div>
                      <label style={reqLabel}>Project Type</label>
                      <select value={reqForm.projectType} onChange={e => setReqForm(f => ({ ...f, projectType: e.target.value }))} style={{ ...reqInput, backgroundColor: 'white' }}>
                        <option value="">Select type</option>
                        {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={reqLabel}>Location</label>
                      <input value={reqForm.location} onChange={e => setReqForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Vancouver, BC" style={reqInput} />
                    </div>
                  </div>
                )}

                {/* Step 1 — Schedule */}
                {step === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={stepHeading}>Shoot Schedule</h3>
                    <div>
                      <label style={reqLabel}>Shoot Date *</label>
                      <input type="date" value={reqForm.shootDate} onChange={e => setReqForm(f => ({ ...f, shootDate: e.target.value }))} style={reqInput} />
                    </div>
                    <div>
                      <label style={reqLabel}>Call Time</label>
                      <input type="time" value={reqForm.callTime} onChange={e => setReqForm(f => ({ ...f, callTime: e.target.value }))} style={reqInput} />
                    </div>
                  </div>
                )}

                {/* Step 2 — Role Details */}
                {step === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={stepHeading}>Role Details</h3>
                    <div>
                      <label style={reqLabel}>Role Type *</label>
                      <select value={reqForm.roleType} onChange={e => setReqForm(f => ({ ...f, roleType: e.target.value }))} style={{ ...reqInput, backgroundColor: 'white' }}>
                        {ROLE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={reqLabel}>Description</label>
                      <textarea value={reqForm.description} onChange={e => setReqForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the role, scene, atmosphere..." rows={3} style={{ ...reqInput, resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={reqLabel}>Wardrobe Notes</label>
                      <textarea value={reqForm.wardrobeNotes} onChange={e => setReqForm(f => ({ ...f, wardrobeNotes: e.target.value }))} placeholder="Business attire, period clothing, etc." rows={2} style={{ ...reqInput, resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                )}

                {/* Step 3 — Who You Need */}
                {step === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={stepHeading}>Who You Need</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={reqLabel}>Performers Needed</label>
                        <input type="number" min="1" value={reqForm.performersNeeded} onChange={e => setReqForm(f => ({ ...f, performersNeeded: e.target.value }))} style={reqInput} />
                      </div>
                      <div>
                        <label style={reqLabel}>Gender</label>
                        <select value={reqForm.genderNeeded} onChange={e => setReqForm(f => ({ ...f, genderNeeded: e.target.value }))} style={{ ...reqInput, backgroundColor: 'white' }}>
                          {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={reqLabel}>Age Min</label>
                        <input type="number" placeholder="18" value={reqForm.ageMin} onChange={e => setReqForm(f => ({ ...f, ageMin: e.target.value }))} style={reqInput} />
                      </div>
                      <div>
                        <label style={reqLabel}>Age Max</label>
                        <input type="number" placeholder="65" value={reqForm.ageMax} onChange={e => setReqForm(f => ({ ...f, ageMax: e.target.value }))} style={reqInput} />
                      </div>
                    </div>
                    <div>
                      <label style={reqLabel}>Union Status Required</label>
                      <select value={reqForm.unionStatus} onChange={e => setReqForm(f => ({ ...f, unionStatus: e.target.value }))} style={{ ...reqInput, backgroundColor: 'white' }}>
                        {UNION_OPTIONS.map(u => <option key={u} value={u}>{u || 'Any'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={reqLabel}>Rate</label>
                      <input value={reqForm.rate} onChange={e => setReqForm(f => ({ ...f, rate: e.target.value }))} placeholder="e.g. $200/day" style={reqInput} />
                    </div>
                    <div>
                      <label style={reqLabel}>Rate Notes</label>
                      <input value={reqForm.rateNotes} onChange={e => setReqForm(f => ({ ...f, rateNotes: e.target.value }))} placeholder="Meal penalty, OT details..." style={reqInput} />
                    </div>
                  </div>
                )}

                {/* Step 4 — Distribution */}
                {step === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={stepHeading}>Send To</h3>
                    <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={reqForm.notifyAll} onChange={e => setReqForm(f => ({ ...f, notifyAll: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                        <div>
                          <div style={{ fontWeight: '700', color: '#1a1a2e', fontSize: '14px' }}>Notify all registered agencies</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>All active agencies will receive a notification immediately.</div>
                        </div>
                      </label>
                    </div>

                    {/* Summary Preview */}
                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>Request Summary</div>
                      {[
                        ['Production', reqForm.productionName || '—'],
                        ['Type', reqForm.projectType || '—'],
                        ['Shoot Date', reqForm.shootDate ? fmtDate(reqForm.shootDate) : '—'],
                        ['Call Time', reqForm.callTime || '—'],
                        ['Location', reqForm.location || '—'],
                        ['Role', reqForm.roleType],
                        ['Count', reqForm.performersNeeded],
                        ['Gender', reqForm.genderNeeded],
                        ['Age', reqForm.ageMin || reqForm.ageMax ? `${reqForm.ageMin || '?'}–${reqForm.ageMax || '?'}` : 'Any'],
                        ['Union', reqForm.unionStatus || 'Any'],
                        ['Rate', reqForm.rate || '—'],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ color: '#6b7280' }}>{k}</span>
                          <span style={{ fontWeight: '600', color: '#1a1a2e' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                  <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                    style={{ padding: '10px 20px', backgroundColor: step === 0 ? '#f3f4f6' : 'white', color: step === 0 ? '#9ca3af' : '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: step === 0 ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    Back
                  </button>
                  {step < 4
                    ? <button onClick={() => {
                        if (step === 0 && !reqForm.productionName) return
                        if (step === 1 && !reqForm.shootDate) return
                        setStep(s => s + 1)
                      }}
                        style={{ padding: '10px 24px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                        Next
                      </button>
                    : <button onClick={submitRequest} disabled={submitting}
                        style={{ padding: '10px 24px', backgroundColor: submitting ? '#9ca3af' : '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px' }}>
                        {submitting ? 'Sending...' : 'Send Request'}
                      </button>
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MY REQUESTS ───────────────────────────────────────────────────────── */}
        {activeTab === 'My Requests' && (
          <div>
            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {(['open', 'closed'] as const).map(t => (
                <button key={t} onClick={() => setReqTab(t)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', backgroundColor: reqTab === t ? '#1a1a2e' : 'white', color: reqTab === t ? 'white' : '#6b7280', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {reqLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              : requests.length === 0
                ? <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '14px', color: '#9ca3af' }}>
                    No {reqTab} casting requests.{' '}
                    {reqTab === 'open' && <button onClick={() => setActiveTab('New Request')} style={{ color: '#F59E0B', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Create one</button>}
                  </div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {requests.map(req => {
                      const filledPct = req.performers_needed > 0 ? (req.confirmedCount / req.performers_needed) * 100 : 0
                      return (
                        <div key={req.id} style={{ backgroundColor: 'white', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                                <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e' }}>{req.production_name}</div>
                                {(() => {
                                  const days = daysUntil(req.shoot_date)
                                  const u = days <= 2
                                    ? { bg: '#fef2f2', color: '#dc2626', label: days <= 0 ? 'TODAY' : `${days}d left` }
                                    : days <= 7
                                    ? { bg: '#fffbeb', color: '#d97706', label: `${days}d left` }
                                    : { bg: '#f0fdf4', color: '#16a34a', label: `${days}d` }
                                  return (
                                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: u.bg, color: u.color, flexShrink: 0 }}>
                                      {u.label}
                                    </span>
                                  )
                                })()}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                {req.role_type} · {fmtDate(req.shoot_date)}{req.location ? ` · ${req.location}` : ''}
                              </div>
                            </div>
                            <button onClick={() => openManage(req)} style={{ padding: '7px 14px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap' }}>
                              Manage
                            </button>
                          </div>

                          {/* Traffic light badges */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                              {req.submissionCount} submitted
                            </span>
                            {req.shortlistedCount > 0 && (
                              <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: '#fffbeb', color: '#d97706' }}>
                                {req.shortlistedCount} shortlisted
                              </span>
                            )}
                            {req.confirmedCount > 0 && (
                              <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                                {req.confirmedCount} confirmed
                              </span>
                            )}
                            <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                              {req.agencyCount} agenc{req.agencyCount !== 1 ? 'ies' : 'y'}
                            </span>
                          </div>

                          {/* Fill progress bar */}
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>
                            {req.confirmedCount}/{req.performers_needed} filled
                          </div>
                          <div style={{ backgroundColor: '#e5e7eb', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '4px', backgroundColor: filledPct >= 100 ? '#16a34a' : '#F59E0B', width: `${Math.min(100, filledPct)}%`, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
            }
          </div>
        )}

        {/* ── NOTIFICATIONS ─────────────────────────────────────────────────────── */}
        {activeTab === 'Notifications' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>Notifications</h2>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
            </div>
            {notifsLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              : notifs.length === 0
                ? <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '14px', color: '#9ca3af' }}>No notifications yet.</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifs.map(n => (
                      <div key={n.id} onClick={() => n.action_url && router.push(n.action_url)}
                        style={{ backgroundColor: n.is_read ? 'white' : '#fffbeb', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: n.action_url ? 'pointer' : 'default', borderLeft: `3px solid ${n.is_read ? '#e5e7eb' : '#F59E0B'}` }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e', marginBottom: '3px' }}>{n.title}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{n.message}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(n.created_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    ))}
                  </div>
                )
            }
          </div>
        )}
      </div>

      {/* ── QUICK VIEW MODAL ──────────────────────────────────────────────────────── */}
      {quickView && (
        <div onClick={() => setQuickView(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ width: '80px', height: '100px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#e5e7eb' }}>
                {quickView.headshot_url
                  ? <img src={quickView.headshot_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>👤</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '18px', color: '#1a1a2e', marginBottom: '4px' }}>
                  {quickView.users?.raw_user_meta_data?.full_name || quickView.users?.email?.split('@')[0]}
                </div>
                {quickView.agencies && <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '600', marginBottom: '4px' }}>{quickView.agencies.name}</div>}
                {quickView.availabilityStatus && (
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    backgroundColor: quickView.availabilityStatus === 'available' ? '#22c55e' : '#6b7280', color: 'white' }}>
                    {quickView.availabilityStatus}
                  </span>
                )}
              </div>
              <button onClick={() => setQuickView(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af', padding: '0 4px' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {[
                ['Gender', quickView.gender],
                ['Age', quickView.age ? `${quickView.age}` : null],
                ['Height', quickView.height_cm ? `${quickView.height_cm} cm` : null],
                ['Hair', quickView.hair_color],
                ['Eyes', quickView.eye_color],
                ['Union', quickView.union_status],
                ['Ethnicity', quickView.ethnicity],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '2px' }}>{k}</div>
                  <div style={{ color: '#1a1a2e', fontWeight: '600' }}>{v}</div>
                </div>
              ))}
            </div>
            {quickView.special_skills?.length ? (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Special Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {quickView.special_skills.map(s => (
                    <span key={s} style={{ padding: '3px 8px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{s}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {quickView.bio && (
              <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6', marginBottom: '16px' }}>{quickView.bio}</div>
            )}
            <button
              onClick={() => { setQuickView(null); router.push(`/profile/${quickView.user_id}`) }}
              style={{ width: '100%', padding: '11px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
              View Full Profile
            </button>
          </div>
        </div>
      )}

      {/* ── CALENDAR DRAWER ───────────────────────────────────────────────────────── */}
      {drawerDate && (
        <div onClick={() => setDrawerDate(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '20px 20px 0 0', padding: '20px', width: '100%', maxWidth: '600px', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>
                Available on {fmtDate(drawerDate)}
              </h3>
              <button onClick={() => setDrawerDate(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            {drawerLoading
              ? <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>Loading...</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                  {drawerPerformers.filter(p => p.availabilityStatus === 'available').map(p => (
                    <PerformerCard key={p.user_id} p={p} onClick={() => { setDrawerDate(null); setQuickView(p) }} />
                  ))}
                  {drawerPerformers.filter(p => p.availabilityStatus === 'available').length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: '#9ca3af' }}>No performers marked available on this date.</div>
                  )}
                </div>
              )
            }
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button onClick={() => { setDrawerDate(null); setBrowseDate(drawerDate); setActiveTab('Browse') }}
                style={{ padding: '10px 24px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}>
                Browse All on This Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE REQUEST MODAL ──────────────────────────────────────────────────── */}
      {manageRequest && (
        <div onClick={() => setManageRequest(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '20px', padding: '22px', width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto' }}>
            {manageLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading submissions...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#1a1a2e' }}>{manageRequest.production_name}</h3>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{manageRequest.role_type} · {fmtDate(manageRequest.shoot_date)}</div>
                  </div>
                  <button onClick={() => setManageRequest(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af', padding: '0 4px' }}>×</button>
                </div>

                {/* Submission columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {(['submitted', 'shortlisted', 'confirmed'] as const).map(colStatus => {
                    const colSubs = manageRequest.submissions.filter(s => s.status === colStatus)
                    const colLabel = colStatus.charAt(0).toUpperCase() + colStatus.slice(1)
                    return (
                      <div key={colStatus}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: statusColor(colStatus), textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                          {colLabel} ({colSubs.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {colSubs.map(sub => {
                            const name = sub.users?.raw_user_meta_data?.full_name || sub.users?.email?.split('@')[0] || 'Performer'
                            return (
                              <div key={sub.id} style={{ backgroundColor: statusBg(sub.status), borderRadius: '10px', padding: '10px 12px', border: `1px solid ${statusColor(sub.status)}20` }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                  {sub.performer_profiles?.headshot_url
                                    ? <img src={sub.performer_profiles.headshot_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                    : <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>
                                  }
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>{name}</div>
                                    {sub.agencies && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{sub.agencies.name}</div>}
                                  </div>
                                </div>
                                {sub.notes && (
                                  <div style={{ fontSize: '11px', color: '#374151', marginBottom: '6px', backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '5px 8px', fontStyle: 'italic' }}>
                                    💬 {sub.notes}
                                  </div>
                                )}
                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {colStatus !== 'confirmed' && (
                                    <button onClick={() => updateSubmission(sub.id, 'confirmed')}
                                      style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: '6px', cursor: 'pointer' }}>
                                      Confirm
                                    </button>
                                  )}
                                  {colStatus === 'submitted' && (
                                    <button onClick={() => updateSubmission(sub.id, 'shortlisted')}
                                      style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer' }}>
                                      Shortlist
                                    </button>
                                  )}
                                  {(colStatus as string) !== 'rejected' && (
                                    <button onClick={() => updateSubmission(sub.id, 'rejected')}
                                      style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }}>
                                      Reject
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {colSubs.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>—</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Rejected section */}
                {manageRequest.submissions.filter(s => s.status === 'rejected').length > 0 && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                      Rejected ({manageRequest.submissions.filter(s => s.status === 'rejected').length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {manageRequest.submissions.filter(s => s.status === 'rejected').map(sub => {
                        const name = sub.users?.raw_user_meta_data?.full_name || sub.users?.email?.split('@')[0] || 'Performer'
                        return (
                          <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', backgroundColor: '#fef2f2', borderRadius: '8px', fontSize: '12px', color: '#dc2626' }}>
                            <span>{name}</span>
                            <button onClick={() => updateSubmission(sub.id, 'submitted')}
                              style={{ fontSize: '10px', fontWeight: '600', backgroundColor: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 5px' }}>
                              Restore
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #e5e7eb',
  backgroundColor: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
}
const filterLabel: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px',
}
const filterInput: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px',
  fontSize: '13px', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
}
const stepHeading: React.CSSProperties = {
  fontSize: '17px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 4px',
}
const reqLabel: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px',
}
const reqInput: React.CSSProperties = {
  width: '100%', padding: '10px 13px', border: '1px solid #e5e7eb', borderRadius: '8px',
  fontSize: '14px', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
}
