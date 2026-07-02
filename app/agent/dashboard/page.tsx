'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast, { Toaster } from 'react-hot-toast'
import Logo from '@/components/Logo'
import { FILM_REGION_LIST, getRegionName, unionBadge, unionTierLabel } from '@/lib/film-regions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RosterPerformer {
  id: string
  status: string
  user_id: string
  users: { id: string; email: string; raw_user_meta_data: { full_name?: string } } | null
  performer_profiles: {
    headshot_url?: string | null
    union_status?: string | null
    union_priority?: number | null
    height_cm?: number | null
    hair_color?: string | null
    eye_color?: string | null
    gender?: string | null
    film_region_code?: string | null
    special_skills?: string[] | null
    bio?: string | null
    age?: number | null
  } | null
  weekAvailability: { date: string; status: string | null }[]
  tags?: string[]
  privateNote?: string
}

interface CastingRequest {
  id: string
  production_name: string
  project_type?: string | null
  shoot_date: string
  call_time?: string | null
  location?: string | null
  shoot_region_code?: string | null
  role_type: string
  performers_needed: number
  gender_needed?: string | null
  age_min?: number | null
  age_max?: number | null
  union_status?: string | null
  rate?: string | null
  rate_notes?: string | null
  description?: string | null
  wardrobe_notes?: string | null
  status: string
  mySubmissionCount: number
  submittedPerformerIds: string[]
  casting_directors?: { name: string; company: string } | null
}

interface Submission {
  id: string
  status: string
  submitted_at: string
  notes?: string | null
  casting_requests: {
    production_name: string
    shoot_date: string
    location?: string | null
    role_type: string
    call_time?: string | null
    rate?: string | null
    description?: string | null
    wardrobe_notes?: string | null
    number_needed?: number | null
    casting_director?: { name: string; company: string } | null
  } | null
  performer_profiles: { headshot_url?: string | null; union_status?: string | null; union_priority?: number | null } | null
  users: { id: string; email: string; raw_user_meta_data: { full_name?: string } } | null
}

interface Commission {
  id: string
  booking_date: string
  production_name: string
  performer_name: string
  gross_pay: number
  commission_rate: number
  commission_amount: number
  paid: boolean
  notes?: string | null
}

interface AvailCheck {
  id: string
  check_id: string
  performer_id: string
  message: string
  date_needed: string
  responded: boolean
  available?: boolean | null
  users: { email: string; raw_user_meta_data: { full_name?: string } } | null
}

interface Booking {
  id: string
  performer_id: string
  created_by_id: string
  created_by_type: string
  created_by_name: string | null
  start_date: string
  end_date: string
  status: string
  production: string | null
  note: string | null
}

interface AgentThread {
  threadId: string
  performerId: string
  performer: { id: string; email: string; name: string; headshot_url?: string | null } | null
  subject: string
  lastMessage: { id: string; body: string; created_at: string; sender_type: string }
  unread: boolean
}

interface AgentMsg {
  id: string
  sender_type: string
  sender_name: string
  body: string
  subject: string
  created_at: string
  is_read: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Overview','Roster','Union','Requests','Submissions','Calendar','Financials','Avail','Messages','Settings'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  Overview: '🏠 Overview',
  Roster: '👥 My Roster',
  Union: '🏆 Union Members',
  Requests: '📋 Casting Requests',
  Submissions: '📤 Submissions',
  Calendar: '📅 Booking Calendar',
  Financials: '💰 Financials',
  Avail: '✅ Avail Check',
  Messages: '✉️ Messages',
  Settings: '⚙️ Settings',
}

const AVAIL_COLOR: Record<string, string> = {
  available: '#22c55e',
  unavailable: '#ef4444',
  booked: '#3b82f6',
  tentative: '#f59e0b',
}

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  submitted:   { bg: 'rgba(107,114,128,0.2)',  color: '#9ca3af' },
  in_review:   { bg: 'rgba(59,130,246,0.2)',   color: '#60a5fa' },
  shortlisted: { bg: 'rgba(245,158,11,0.2)',   color: '#F59E0B' },
  confirmed:   { bg: 'rgba(34,197,94,0.2)',    color: '#22c55e' },
  rejected:    { bg: 'rgba(239,68,68,0.2)',    color: '#ef4444' },
  waitlisted:  { bg: 'rgba(139,92,246,0.2)',   color: '#a78bfa' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pName(r: RosterPerformer) {
  return r.users?.raw_user_meta_data?.full_name || r.users?.email?.split('@')[0] || 'Performer'
}
function sName(s: Submission) {
  return s.users?.raw_user_meta_data?.full_name || s.users?.email?.split('@')[0] || 'Performer'
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtMoney(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
}
function fmtRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

// ─── Roster Performer Card ────────────────────────────────────────────────────

function RosterCard({ r, onSelect }: { r: RosterPerformer; onSelect: () => void }) {
  const name = pName(r)
  const badge = unionBadge(r.performer_profiles?.union_status)
  const tier = unionTierLabel(r.performer_profiles?.union_status)
  const today = new Date().toISOString().slice(0, 10)
  const todayAvail = r.weekAvailability?.find(d => d.date === today)
  const availDots = (r.weekAvailability || []).slice(0, 7)

  return (
    <div onClick={onSelect} style={{ backgroundColor: '#1e1e35', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)', transition: 'transform 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
      <div style={{ aspectRatio: '3/4', backgroundColor: '#0f0f1a', position: 'relative', overflow: 'hidden' }}>
        {r.performer_profiles?.headshot_url
          ? <Image src={r.performer_profiles.headshot_url} alt={name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px" style={{ objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>👤</div>
        }
        <div style={{ position: 'absolute', top: '6px', left: '6px', fontSize: '16px' }}>{badge}</div>
        {todayAvail?.status && (
          <div style={{ position: 'absolute', top: '6px', right: '6px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: AVAIL_COLOR[todayAvail.status] || '#6b7280', boxShadow: `0 0 6px ${AVAIL_COLOR[todayAvail.status] || '#6b7280'}` }} />
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: 'white', marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '600', marginBottom: '4px' }}>{tier}</div>
        {r.performer_profiles?.film_region_code && <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>📍 {getRegionName(r.performer_profiles.film_region_code)}</div>}
        {/* 7-day avail dots */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {availDots.map(d => (
            <div key={d.date} title={`${d.date}: ${d.status || 'unknown'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.status ? (AVAIL_COLOR[d.status] || '#6b7280') : '#374151' }} />
          ))}
        </div>
        {r.tags?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px' }}>
            {r.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: '9px', padding: '1px 5px', backgroundColor: 'rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '10px' }}>{t}</span>)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AgentDashboardPage() {
  const router = useRouter()
  const [agentName, setAgentName] = useState('')
  const [agencyId, setAgencyId] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [isMobile, setIsMobile] = useState(false)

  // Overview stats
  const [stats, setStats] = useState({ rosterCount: 0, pendingRequests: 0, pendingSubmissions: 0, monthCommissions: 0 })
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // Roster
  const [roster, setRoster] = useState<RosterPerformer[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [lookupResult, setLookupResult] = useState<{
    user_id: string; name: string; email: string
    headshot_url: string | null; union_status: string | null
    film_region_code: string | null; city: string | null
    already_represented: boolean; already_on_roster: boolean; roster_status: string | null
  } | null>(null)
  const [addingToRoster, setAddingToRoster] = useState(false)
  const [selectedPerformer, setSelectedPerformer] = useState<RosterPerformer | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState<Record<string, string[]>>({})
  const [rosterFilter, setRosterFilter] = useState('')
  const [rosterRegion, setRosterRegion] = useState('')

  // Requests
  const [requests, setRequests] = useState<CastingRequest[]>([])
  const [reqLoading, setReqLoading] = useState(false)
  const [expandedReq, setExpandedReq] = useState<string | null>(null)
  const [submittingFor, setSubmittingFor] = useState<{ reqId: string; performerId: string; notes: string } | null>(null)

  // Submissions
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [subLoading, setSubLoading] = useState(false)
  const [subFilter, setSubFilter] = useState<'all'|'submitted'|'shortlisted'|'confirmed'|'rejected'>('all')
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null)

  // Commissions
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [commLoading, setCommLoading] = useState(false)
  const [commMonthTotal, setCommMonthTotal] = useState(0)
  const [commUnpaidTotal, setCommUnpaidTotal] = useState(0)
  const [newComm, setNewComm] = useState({ booking_date: '', production_name: '', performer_name: '', gross_pay: '', commission_rate: '15', notes: '' })
  const [addingComm, setAddingComm] = useState(false)

  // Availability check
  const [availDate, setAvailDate] = useState('')
  const [availMessage, setAvailMessage] = useState('')
  const [availPerformerIds, setAvailPerformerIds] = useState<string[]>([])
  const [availSending, setAvailSending] = useState(false)
  const [availCheckId, setAvailCheckId] = useState('')
  const [availResponses, setAvailResponses] = useState<AvailCheck[]>([])

  // Settings — name + password
  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [emailPref, setEmailPref] = useState(true)
  const [emailPrefSaving, setEmailPrefSaving] = useState(false)

  // Booking holds (Calendar tab)
  const [holds, setHolds] = useState<Booking[]>([])
  const [holdsLoading, setHoldsLoading] = useState(false)
  const [holdPerformerId, setHoldPerformerId] = useState('')
  const [holdStart, setHoldStart] = useState('')
  const [holdEnd, setHoldEnd] = useState('')
  const [holdProduction, setHoldProduction] = useState('')
  const [holdNote, setHoldNote] = useState('')
  const [holdSubmitting, setHoldSubmitting] = useState(false)
  const [holdMsg, setHoldMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Messages tab
  const [agentThreads, setAgentThreads] = useState<AgentThread[]>([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [activeThread, setActiveThread] = useState<AgentThread | null>(null)
  const [threadMsgs, setThreadMsgs] = useState<AgentMsg[]>([])
  const [threadMsgsLoading, setThreadMsgsLoading] = useState(false)
  const [threadReply, setThreadReply] = useState('')
  const [threadReplying, setThreadReplying] = useState(false)
  // Compose from performer modal
  const [composingMsg, setComposingMsg] = useState(false)
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeSending, setComposeSending] = useState(false)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/agent/auth').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) { router.replace('/agent/login'); return }
      setAgentName(d.name || d.email)
      setNameInput(d.name || '')
      setEmailPref(d.emailOnRequest !== false)
      setAgencyId(d.agencyId || '')
    })
  }, [router])

  // ── Load by tab ─────────────────────────────────────────────────────────

  // ── Load functions — all stable via useCallback([]) so the tab effect can
  // list them as deps without re-triggering on every render. ──────────────────

  const loadStats = useCallback(async () => {
    const [rRes, sRes, cRes] = await Promise.all([
      fetch('/api/agent/roster'),
      fetch('/api/agent/submissions'),
      fetch('/api/agent/commissions'),
    ])
    const r = rRes.ok ? await rRes.json() : []
    const s = sRes.ok ? await sRes.json() : []
    const c = cRes.ok ? await cRes.json() : []
    const month = new Date().getMonth()
    const year = new Date().getFullYear()
    const monthComm = (c as Commission[]).filter(x => {
      const d = new Date(x.booking_date)
      return d.getMonth() === month && d.getFullYear() === year && !x.paid
    }).reduce((a: number, x: Commission) => a + x.commission_amount, 0)
    setStats({
      rosterCount: r.length,
      pendingRequests: 0,
      pendingSubmissions: (s as Submission[]).filter(x => x.status === 'submitted').length,
      monthCommissions: monthComm,
    })
  }, [])

  const loadRoster = useCallback(async () => {
    setRosterLoading(true)
    const res = await fetch('/api/agent/roster')
    setRosterLoading(false)
    if (!res.ok) return
    const data: RosterPerformer[] = await res.json()

    // Load tags in parallel
    const tagsRes = await fetch('/api/agent/tags')
    let tags: Record<string, string[]> = {}
    if (tagsRes.ok) tags = await tagsRes.json()
    setAllTags(tags)

    // Attach tags
    const withTags = data.map(r => ({ ...r, tags: tags[r.user_id] || [] }))
    setRoster(withTags)
  }, [])

  const loadRequests = useCallback(async () => {
    setReqLoading(true)
    const res = await fetch('/api/agent/requests')
    setReqLoading(false)
    if (res.ok) setRequests(await res.json())
  }, [])

  const loadSubmissions = useCallback(async () => {
    setSubLoading(true)
    const res = await fetch('/api/agent/submissions')
    setSubLoading(false)
    if (res.ok) setSubmissions(await res.json())
  }, [])

  const loadCommissions = useCallback(async () => {
    setCommLoading(true)
    const res = await fetch('/api/agent/commissions')
    setCommLoading(false)
    if (!res.ok) return
    const data: Commission[] = await res.json()
    setCommissions(data)
    const month = new Date().getMonth(); const year = new Date().getFullYear()
    setCommMonthTotal(data.filter(c => { const d = new Date(c.booking_date); return d.getMonth() === month && d.getFullYear() === year }).reduce((a, c) => a + c.commission_amount, 0))
    setCommUnpaidTotal(data.filter(c => !c.paid).reduce((a, c) => a + c.commission_amount, 0))
  }, [])

  const loadHolds = useCallback(async () => {
    setHoldsLoading(true)
    const res = await fetch('/api/bookings')
    setHoldsLoading(false)
    if (res.ok) setHolds(await res.json())
  }, [])

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true)
    try {
      const res = await fetch('/api/agent/threads')
      if (res.ok) setAgentThreads((await res.json()).threads || [])
    } finally {
      setThreadsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'Overview') loadStats()
    if (activeTab === 'Roster') loadRoster()
    if (activeTab === 'Union') loadRoster()
    if (activeTab === 'Requests') { loadRoster(); loadRequests() }
    if (activeTab === 'Submissions') loadSubmissions()
    if (activeTab === 'Financials') loadCommissions()
    if (activeTab === 'Avail') loadRoster()
    if (activeTab === 'Calendar') { loadRoster(); loadSubmissions(); loadHolds() }
    if (activeTab === 'Messages') loadThreads()
  }, [activeTab, loadStats, loadRoster, loadRequests, loadSubmissions, loadCommissions, loadHolds, loadThreads])

  async function lookupPerformer() {
    if (!addEmail.trim()) return
    setAddLoading(true); setAddError(''); setLookupResult(null)
    const res = await fetch(`/api/agent/roster?email=${encodeURIComponent(addEmail.trim())}`)
    setAddLoading(false)
    if (!res.ok) { const d = await res.json(); setAddError(d.error || 'No performer found with that email'); return }
    setLookupResult(await res.json())
  }

  async function confirmAddToRoster() {
    if (!lookupResult) return
    setAddingToRoster(true); setAddError('')
    const res = await fetch('/api/agent/roster', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: lookupResult.email }) })
    setAddingToRoster(false)
    if (res.ok) { setAddEmail(''); setLookupResult(null); loadRoster() }
    else {
      const d = await res.json()
      setAddError(d.error || 'Failed to add')
      if (d.limitReached) setShowUpgradePrompt(true)
    }
  }

  async function removeFromRoster(userId: string, rosterId: string) {
    if (!confirm('Remove this performer from your roster?')) return
    const res = await fetch('/api/agent/roster', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rosterId }) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to remove performer'); return }
    setRoster(prev => prev.filter(r => r.user_id !== userId))
    setSelectedPerformer(null)
  }

  async function openPerformerDetail(r: RosterPerformer) {
    setSelectedPerformer(r)
    setTagInput('')
    // Load private note
    const res = await fetch(`/api/agent/notes?performerId=${r.user_id}`)
    if (res.ok) { const d = await res.json(); setNoteText(d.note || '') }
  }

  async function saveNote() {
    if (!selectedPerformer) return
    setNoteLoading(true)
    const res = await fetch('/api/agent/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ performerId: selectedPerformer.user_id, note: noteText }) })
    setNoteLoading(false)
    if (!res.ok) toast.error('Failed to save note')
  }

  async function openThread(t: AgentThread) {
    setActiveThread(t)
    setThreadMsgsLoading(true)
    const res = await fetch(`/api/agent/threads?threadId=${t.threadId}`)
    if (res.ok) {
      setThreadMsgs((await res.json()).messages || [])
      setAgentThreads(prev => prev.map(th => th.threadId === t.threadId ? { ...th, unread: false } : th))
    }
    setThreadMsgsLoading(false)
    setThreadReply('')
  }

  async function sendThreadReply() {
    if (!activeThread || !threadReply.trim() || threadReplying) return
    setThreadReplying(true)
    const res = await fetch('/api/agent/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentMessageId: activeThread.threadId, body: threadReply, performerId: activeThread.performerId }),
    })
    setThreadReplying(false)
    if (res.ok) {
      const { reply } = await res.json()
      setThreadMsgs(prev => [...prev, reply])
      setThreadReply('')
    } else {
      toast.error('Failed to send reply')
    }
  }

  async function sendCompose() {
    if (!selectedPerformer || !composeSubject.trim() || !composeBody.trim() || composeSending) return
    setComposeSending(true)
    const res = await fetch('/api/agent/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientType: 'performer',
        recipientId: selectedPerformer.user_id,
        subject: composeSubject.trim(),
        messageBody: composeBody.trim(),
      }),
    })
    setComposeSending(false)
    if (res.ok) {
      toast.success(`Message sent to ${pName(selectedPerformer)}`)
      setComposingMsg(false)
      setComposeSubject('')
      setComposeBody('')
      setSelectedPerformer(null)
      loadThreads()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error || 'Failed to send message')
    }
  }

  async function addTag(performerId: string) {
    const tag = tagInput.trim()
    if (!tag) return
    const res = await fetch('/api/agent/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ performerId, tag }) })
    if (res.ok) {
      setTagInput('')
      setAllTags(prev => ({ ...prev, [performerId]: [...(prev[performerId] || []), tag] }))
      setSelectedPerformer(prev => prev ? { ...prev, tags: [...(prev.tags || []), tag] } : prev)
      setRoster(prev => prev.map(r => r.user_id === performerId ? { ...r, tags: [...(r.tags || []), tag] } : r))
    } else {
      toast.error('Failed to add tag')
    }
  }

  async function removeTag(performerId: string, tag: string) {
    const res = await fetch('/api/agent/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ performerId, tag }) })
    if (res.ok) {
      setAllTags(prev => ({ ...prev, [performerId]: (prev[performerId] || []).filter(t => t !== tag) }))
      setSelectedPerformer(prev => prev ? { ...prev, tags: (prev.tags || []).filter(t => t !== tag) } : prev)
      setRoster(prev => prev.map(r => r.user_id === performerId ? { ...r, tags: (r.tags || []).filter(t => t !== tag) } : r))
    } else {
      toast.error('Failed to remove tag')
    }
  }

  async function submitPerformer() {
    if (!submittingFor) return
    const res = await fetch('/api/agent/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submittingFor) })
    if (res.ok) {
      const { reqId, performerId } = submittingFor
      setRequests(prev => prev.map(req =>
        req.id === reqId
          ? { ...req, submittedPerformerIds: [...(req.submittedPerformerIds || []), performerId] }
          : req))
      setSubmittingFor(null); loadRequests()
    } else {
      toast.error('Failed to submit performer')
    }
  }

  async function sendAvailCheck() {
    if (!availDate || availPerformerIds.length === 0) return
    setAvailSending(true)
    const res = await fetch('/api/agent/availability-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performerIds: availPerformerIds, date: availDate, message: availMessage }),
    })
    setAvailSending(false)
    if (res.ok) {
      const data = await res.json()
      setAvailCheckId(data.checkId)
      setAvailResponses([])
    }
  }

  async function loadAvailResponses() {
    if (!availCheckId) return
    const res = await fetch(`/api/agent/availability-check?checkId=${availCheckId}`)
    if (res.ok) setAvailResponses(await res.json())
  }

  async function addCommission() {
    if (!newComm.booking_date || !newComm.production_name || !newComm.gross_pay) return
    const res = await fetch('/api/agent/commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performerName: newComm.performer_name,
        productionName: newComm.production_name,
        bookingDate: newComm.booking_date,
        grossPay: parseFloat(newComm.gross_pay),
        commissionRate: parseFloat(newComm.commission_rate),
        notes: newComm.notes || null,
      }),
    })
    if (res.ok) {
      setNewComm({ booking_date: '', production_name: '', performer_name: '', gross_pay: '', commission_rate: '15', notes: '' })
      setAddingComm(false)
      loadCommissions()
    }
  }

  async function markCommPaid(id: string) {
    const res = await fetch('/api/agent/commissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, paid: true }) })
    if (res.ok) {
      setCommissions(prev => prev.map(c => c.id === id ? { ...c, paid: true } : c))
    } else {
      toast.error('Failed to mark commission as paid')
    }
  }

  async function placeHold() {
    if (!holdPerformerId || !holdStart || !holdEnd) return
    setHoldSubmitting(true); setHoldMsg(null)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performerId: holdPerformerId,
        startDate: holdStart,
        endDate: holdEnd,
        production: holdProduction || undefined,
        note: holdNote || undefined,
      }),
    })
    setHoldSubmitting(false)
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      setHoldMsg({ type: 'ok', text: 'Hold placed — the performer has been notified.' })
      setHoldStart(''); setHoldEnd(''); setHoldProduction(''); setHoldNote('')
      loadHolds()
    } else {
      setHoldMsg({ type: 'err', text: d.error || 'Could not place the hold.' })
    }
  }

  async function bookingAction(id: string, action: 'confirm' | 'cancel') {
    if (action === 'cancel' && !confirm('Cancel this booking? The performer will be notified.')) return
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      setHoldMsg({ type: 'ok', text: action === 'confirm' ? 'Booking confirmed.' : 'Booking cancelled.' })
      loadHolds()
    } else {
      setHoldMsg({ type: 'err', text: d.error || 'Action failed.' })
    }
  }

  async function saveEmailPref(value: boolean) {
    setEmailPrefSaving(true)
    const res = await fetch('/api/agent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_email_pref', emailOnRequest: value }),
    })
    setEmailPrefSaving(false)
    if (res.ok) {
      setEmailPref(value)
    } else {
      toast.error('Failed to save email preference')
    }
  }

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

  async function signOut() {
    await fetch('/api/agent/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    router.replace('/agent/login')
  }

  // ─── Filtered roster ─────────────────────────────────────────────────────

  const filteredRoster = roster.filter(r => {
    if (rosterRegion && r.performer_profiles?.film_region_code !== rosterRegion) return false
    if (!rosterFilter) return true
    const name = pName(r).toLowerCase()
    const email = (r.users?.email || '').toLowerCase()
    const q = rosterFilter.toLowerCase()
    return name.includes(q) || email.includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q))
  }).sort((a, b) => {
    const now = Date.now()
    const aBoost = !!( a.performer_profiles as any)?.boost_expires_at && new Date((a.performer_profiles as any).boost_expires_at).getTime() > now
    const bBoost = !!(b.performer_profiles as any)?.boost_expires_at && new Date((b.performer_profiles as any).boost_expires_at).getTime() > now
    if (aBoost === bBoost) return 0
    return aBoost ? -1 : 1
  })

  const unionRoster = roster.filter(r => (r.performer_profiles?.union_priority ?? 5) <= 2)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e1e35', color: 'white', border: '1px solid rgba(245,158,11,0.3)' } }} />

      {/* Top bar */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Logo size="sm" darkBackground showText />
          </Link>
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>/ Agent</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {agentName && <span style={{ color: '#e5e7eb', fontSize: '14px' }}>{agentName}</span>}
          <button onClick={signOut} style={{ color: '#9ca3af', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', padding: '0 12px', gap: '2px', minWidth: 'max-content' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 12px', fontSize: '13px', fontWeight: activeTab === tab ? '700' : '400', color: activeTab === tab ? '#F59E0B' : '#9ca3af', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #F59E0B' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: isMobile ? '14px 12px' : '24px 20px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === 'Overview' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Agency Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
              {[
                { label: 'Roster Size', value: stats.rosterCount, icon: '👥', color: '#F59E0B', tab: 'Roster' as Tab },
                { label: 'Active Submissions', value: stats.pendingSubmissions, icon: '📤', color: '#3b82f6', tab: 'Submissions' as Tab },
                { label: 'Monthly Commissions', value: fmtMoney(stats.monthCommissions), icon: '💰', color: '#22c55e', tab: 'Financials' as Tab },
              ].map(s => (
                <div
                  key={s.label}
                  onClick={() => setActiveTab(s.tab)}
                  onMouseEnter={() => setHoveredCard(s.label)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    backgroundColor: '#1e1e35',
                    borderRadius: '14px',
                    padding: '20px',
                    border: `1px solid ${hoveredCard === s.label ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {([
                { label: '📋 View Requests', tab: 'Requests' as Tab },
                { label: '👥 Manage Roster', tab: 'Roster' as Tab },
                { label: '✅ Avail Check', tab: 'Avail' as Tab },
                { label: '💰 Financials', tab: 'Financials' as Tab },
              ]).map(a => (
                <button key={a.label} onClick={() => setActiveTab(a.tab)} style={{ padding: '12px', backgroundColor: '#1e1e35', color: 'white', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>
                  {a.label}
                </button>
              ))}
            </div>

            <div style={{ backgroundColor: '#1a1a2e', borderRadius: '12px', padding: '16px 20px', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '700', marginBottom: '6px' }}>Union Member Priority Reminder</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
                👑 Full Members must be offered work first for UBCP/ACTRA productions.<br />
                ⭐ Apprentice Members have second preference. Always submit union members first.
              </div>
            </div>
          </div>
        )}

        {/* ── ROSTER ────────────────────────────────────────────────────── */}
        {activeTab === 'Roster' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: 0, flex: 1 }}>My Roster</h1>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>{filteredRoster.length} performers</span>
              <a href="/agent/import" style={{ padding: '9px 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', fontSize: '13px', borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                ⬆ Import CSV
              </a>
            </div>

            {/* Add performer */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input value={addEmail} onChange={e => { setAddEmail(e.target.value); setLookupResult(null); setAddError('') }} onKeyDown={e => e.key === 'Enter' && lookupPerformer()} placeholder="Look up performer by email..." style={{ flex: 1, minWidth: '200px', padding: '10px 13px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none' }} />
                <button onClick={lookupPerformer} disabled={addLoading || !addEmail.trim()} style={{ padding: '10px 20px', backgroundColor: addEmail.trim() ? '#F59E0B' : '#374151', color: addEmail.trim() ? '#1a1a2e' : '#6b7280', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: addEmail.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', whiteSpace: 'nowrap' }}>
                  {addLoading ? 'Looking up…' : 'Look up'}
                </button>
              </div>
              {addError && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>{addError}</div>}
              {lookupResult && (
                <div style={{ marginTop: '12px', padding: '14px', backgroundColor: '#0f0f1a', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {lookupResult.headshot_url
                    ? <img src={lookupResult.headshot_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: '52px', height: '52px', borderRadius: '8px', backgroundColor: '#1e1e35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>👤</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{lookupResult.name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{lookupResult.email}</div>
                    {lookupResult.union_status && <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '2px' }}>{lookupResult.union_status}</div>}
                    {(lookupResult.city || lookupResult.film_region_code) && (
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{[lookupResult.city, lookupResult.film_region_code].filter(Boolean).join(' · ')}</div>
                    )}
                    {lookupResult.already_represented && <div style={{ fontSize: '11px', color: '#f97316', marginTop: '2px' }}>⚠ Already represented by an agency</div>}
                  </div>
                  {lookupResult.already_on_roster
                    ? <div style={{ padding: '8px 14px', backgroundColor: '#1e1e35', color: '#9ca3af', borderRadius: '8px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>Already on roster</div>
                    : <button onClick={confirmAddToRoster} disabled={addingToRoster} style={{ padding: '8px 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}>{addingToRoster ? 'Adding…' : '+ Add to roster'}</button>
                  }
                </div>
              )}
              {showUpgradePrompt && (
                <div style={{ marginTop: '8px', padding: '12px 14px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>You've reached the 25-performer limit on the free plan.</span>
                  <button onClick={() => router.push('/agent/settings')} style={{ backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade to Pro →</button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <input value={rosterFilter} onChange={e => setRosterFilter(e.target.value)} placeholder="Search name, email, tag..." style={{ flex: 1, minWidth: '160px', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', color: 'white', backgroundColor: '#1e1e35', outline: 'none' }} />
              <select value={rosterRegion} onChange={e => setRosterRegion(e.target.value)} style={{ padding: '8px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', color: 'white', backgroundColor: '#1e1e35', outline: 'none' }}>
                <option value="">All regions</option>
                {FILM_REGION_LIST.map(r => <option key={r.code} value={r.code}>{r.provinceCode} — {r.name}</option>)}
              </select>
            </div>

            {rosterLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              : filteredRoster.length === 0
                ? <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>No performers yet. Add them by email above.</div>
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                    {filteredRoster.map(r => <RosterCard key={r.id} r={r} onSelect={() => openPerformerDetail(r)} />)}
                  </div>
            }
          </div>
        )}

        {/* ── UNION MEMBERS ─────────────────────────────────────────────── */}
        {activeTab === 'Union' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 8px' }}>Union Members on Roster</h1>
            <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#d97706', marginBottom: '20px' }}>
              These performers have UBCP/ACTRA Full or Apprentice status. They have preference of engagement on all union productions.
            </div>
            {unionRoster.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>No union members on your roster yet.</div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                  {unionRoster.map(r => <RosterCard key={r.id} r={r} onSelect={() => openPerformerDetail(r)} />)}
                </div>
            }
          </div>
        )}

        {/* ── CASTING REQUESTS ─────────────────────────────────────────── */}
        {activeTab === 'Requests' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Casting Requests</h1>
            {reqLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              : requests.length === 0
                ? <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>No open casting requests right now.</div>
                : requests.map(req => {
                    const isExpanded = expandedReq === req.id
                    const days = daysUntil(req.shoot_date)
                    return (
                      <div key={req.id} style={{ backgroundColor: '#1e1e35', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px', overflow: 'hidden' }}>
                        <div onClick={() => setExpandedReq(isExpanded ? null : req.id)} style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>{req.production_name}</span>
                              <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: days <= 2 ? 'rgba(239,68,68,0.15)' : days <= 7 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: days <= 2 ? '#ef4444' : days <= 7 ? '#F59E0B' : '#22c55e' }}>
                                {days <= 0 ? 'TODAY' : `${days}d`}
                              </span>
                              {req.shoot_region_code && <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>📍 {getRegionName(req.shoot_region_code)}</span>}
                            </div>
                            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                              {req.role_type} · {fmtDate(req.shoot_date)}
                              {req.location ? ` · ${req.location}` : ''}
                              {req.rate ? ` · ${req.rate}` : ''}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                              {req.union_status && <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>{req.union_status}</span>}
                              {req.gender_needed && req.gender_needed !== 'Any' && <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>{req.gender_needed}</span>}
                              {(req.age_min || req.age_max) && <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>Age {req.age_min||'?'}–{req.age_max||'?'}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '20px', color: '#F59E0B', fontWeight: '900' }}>{req.mySubmissionCount}</div>
                            <div style={{ fontSize: '10px', color: '#6b7280' }}>submitted</div>
                            <div style={{ marginTop: '6px', fontSize: '18px' }}>{isExpanded ? '▲' : '▼'}</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* Detail grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', margin: '14px 0 12px' }}>
                              {[
                                { label: 'Project Type', value: req.project_type },
                                { label: 'Role', value: req.role_type },
                                { label: 'Shoot Date', value: fmtDate(req.shoot_date) },
                                { label: 'Call Time', value: req.call_time },
                                { label: 'Region', value: req.shoot_region_code ? getRegionName(req.shoot_region_code) : null },
                                { label: 'Location', value: req.location },
                                { label: 'Spots Needed', value: req.performers_needed != null ? String(req.performers_needed) : null },
                                { label: 'Gender', value: req.gender_needed },
                                { label: 'Age Range', value: (req.age_min || req.age_max) ? `${req.age_min ?? '?'} – ${req.age_max ?? '?'}` : null },
                                { label: 'Union', value: req.union_status },
                                { label: 'Rate', value: req.rate },
                                { label: 'Rate Notes', value: req.rate_notes },
                                { label: 'Posted by', value: req.casting_directors ? `${req.casting_directors.name}${req.casting_directors.company ? ` · ${req.casting_directors.company}` : ''}` : null },
                              ].filter(f => f.value).map(({ label, value }) => (
                                <div key={label}>
                                  <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>{label}</div>
                                  <div style={{ fontSize: '13px', color: '#e5e7eb', marginTop: '2px' }}>{value}</div>
                                </div>
                              ))}
                            </div>
                            {req.description && <p style={{ fontSize: '13px', color: '#d1d5db', marginBottom: '12px', lineHeight: '1.6' }}>{req.description}</p>}
                            {req.wardrobe_notes && <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>👔 {req.wardrobe_notes}</p>}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                const reason = prompt('Why are you reporting this casting request? (optional)')
                                if (reason === null) return
                                const res = await fetch('/api/agent/report-request', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ requestId: req.id, reason }),
                                })
                                if (res.ok) {
                                  const d = await res.json().catch(() => ({}))
                                  alert(d.alreadyReported ? 'You already reported this request.' : 'Thanks — this request has been flagged for admin review.')
                                } else {
                                  alert('Could not submit the report. Please try again.')
                                }
                              }}
                              style={{ display: 'block', fontSize: '11px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 12px', textDecoration: 'underline' }}
                            >
                              ⚑ Report this request
                            </button>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#F59E0B', marginBottom: '8px' }}>Submit a performer:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {roster.slice(0, 8).map(r => (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', backgroundColor: '#1a1a2e', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#374151', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                      {r.performer_profiles?.headshot_url
                                        ? <Image src={r.performer_profiles.headshot_url} alt="" fill sizes="28px" style={{ objectFit: 'cover' }} />
                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>👤</div>
                                      }
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{pName(r)}</div>
                                      <div style={{ fontSize: '11px', color: '#F59E0B' }}>{unionBadge(r.performer_profiles?.union_status)} {unionTierLabel(r.performer_profiles?.union_status)}</div>
                                    </div>
                                  </div>
                                  {req.submittedPerformerIds?.includes(r.user_id) ? (
                                    <button disabled style={{ padding: '6px 12px', backgroundColor: '#d1fae5', color: '#065f46', border: 'none', borderRadius: '6px', cursor: 'default', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap' }}>✓ Submitted</button>
                                  ) : (
                                    <button onClick={() => setSubmittingFor({ reqId: req.id, performerId: r.user_id, notes: '' })} style={{ padding: '6px 12px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap' }}>Submit</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
            }
          </div>
        )}

        {/* ── SUBMISSIONS ───────────────────────────────────────────────── */}
        {activeTab === 'Submissions' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 16px' }}>Submissions</h1>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(['all','submitted','shortlisted','confirmed','rejected'] as const).map(f => (
                <button key={f} onClick={() => setSubFilter(f)} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '12px', backgroundColor: subFilter === f ? '#F59E0B' : '#1e1e35', color: subFilter === f ? '#1a1a2e' : '#9ca3af' }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {subLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              : (() => {
                  const filtered = subFilter === 'all' ? submissions : submissions.filter(s => s.status === subFilter)
                  return filtered.length === 0
                    ? <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>No {subFilter !== 'all' ? subFilter : ''} submissions.</div>
                    : filtered.map(sub => {
                        const pill = STATUS_PILL[sub.status] || STATUS_PILL.submitted
                        const days = sub.casting_requests ? daysUntil(sub.casting_requests.shoot_date) : 0
                        return (
                          <div key={sub.id} onClick={() => setSelectedSub(sub)} style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#374151', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                              {sub.performer_profiles?.headshot_url
                                ? <Image src={sub.performer_profiles.headshot_url} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👤</div>
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: 'white' }}>{sName(sub)}</div>
                              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                {sub.casting_requests?.production_name} · {sub.casting_requests?.role_type}
                                {sub.casting_requests?.shoot_date ? ` · ${fmtDate(sub.casting_requests.shoot_date)}` : ''}
                              </div>
                              {sub.performer_profiles?.union_priority && (
                                <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '2px' }}>
                                  {unionBadge(sub.performer_profiles?.union_status)} {unionTierLabel(sub.performer_profiles?.union_status)}
                                </div>
                              )}
                            </div>
                            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: pill.bg, color: pill.color }}>
                                {sub.status.replace('_', ' ')}
                              </span>
                              {days > 0 && <span style={{ fontSize: '10px', color: '#6b7280' }}>{days}d</span>}
                            </div>
                          </div>
                        )
                      })
                })()
            }
          </div>
        )}

        {/* ── BOOKING CALENDAR ─────────────────────────────────────────── */}
        {activeTab === 'Calendar' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Booking Calendar</h1>

            {/* Place a hold */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 6px' }}>Place a Hold</h2>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>Put a tentative hold on a roster performer&rsquo;s calendar. They&rsquo;ll be notified and can accept it.</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lbl}>Performer *</label>
                  <select value={holdPerformerId} onChange={e => setHoldPerformerId(e.target.value)} style={inp}>
                    <option value="">Select a performer&hellip;</option>
                    {roster.map(r => <option key={r.user_id} value={r.user_id}>{pName(r)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Production</label>
                  <input value={holdProduction} onChange={e => setHoldProduction(e.target.value)} placeholder="Show / project name" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Start date *</label>
                  <input type="date" value={holdStart} onChange={e => setHoldStart(e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={lbl}>End date *</label>
                  <input type="date" value={holdEnd} onChange={e => setHoldEnd(e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
                <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                  <label style={lbl}>Note (optional)</label>
                  <input value={holdNote} onChange={e => setHoldNote(e.target.value)} placeholder="e.g. Need confirmation by Friday" style={inp} />
                </div>
              </div>
              {holdMsg && (
                <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: '600', color: holdMsg.type === 'ok' ? '#22c55e' : '#ef4444' }}>{holdMsg.text}</div>
              )}
              <button
                onClick={placeHold}
                disabled={holdSubmitting || !holdPerformerId || !holdStart || !holdEnd}
                style={{ marginTop: '14px', padding: '11px 20px', backgroundColor: (holdPerformerId && holdStart && holdEnd) ? '#F59E0B' : '#374151', color: (holdPerformerId && holdStart && holdEnd) ? '#1a1a2e' : '#6b7280', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: (holdPerformerId && holdStart && holdEnd) ? 'pointer' : 'not-allowed', fontSize: '14px' }}
              >
                {holdSubmitting ? 'Placing…' : '＋ Place Hold'}
              </button>
            </div>

            {/* Current holds & bookings */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 4px' }}>Holds &amp; Bookings</h2>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}><span style={{ color: '#a855f7', fontWeight: 700 }}>● Pending</span> &nbsp; <span style={{ color: '#3b82f6', fontWeight: 700 }}>● Confirmed</span></div>
              {holdsLoading
                ? <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Loading&hellip;</div>
                : (() => {
                    const active = holds.filter(h => h.status === 'pending' || h.status === 'confirmed')
                      .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
                    if (active.length === 0) return <div style={{ color: '#6b7280', fontSize: '14px' }}>No holds or bookings yet. Place one above.</div>
                    return active.map(h => {
                      const rp = roster.find(r => r.user_id === h.performer_id)
                      const name = rp ? pName(rp) : 'Performer'
                      const isPending = h.status === 'pending'
                      const range = h.end_date !== h.start_date ? `${fmtDate(h.start_date)} – ${fmtDate(h.end_date)}` : fmtDate(h.start_date)
                      const accent = isPending ? '#a855f7' : '#3b82f6'
                      const mine = h.created_by_type === 'agent'
                      return (
                        <div key={h.id} style={{ backgroundColor: '#1a1a2e', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center', border: `1px solid ${accent}55` }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{name}{h.production ? ` · ${h.production}` : ''}</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{range} · <span style={{ color: accent, fontWeight: 700 }}>{isPending ? 'Pending' : 'Confirmed'}</span>{h.created_by_type === 'casting' ? ' · by casting' : ''}</div>
                            {h.note && <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', marginTop: '2px' }}>{h.note}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            {isPending && mine && (
                              <button onClick={() => bookingAction(h.id, 'confirm')} style={{ padding: '6px 12px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap' }}>Confirm</button>
                            )}
                            {mine && (
                              <button onClick={() => bookingAction(h.id, 'cancel')} style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap' }}>Cancel</button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()
              }
            </div>

            {/* Confirmed casting submissions (existing) */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 4px' }}>Confirmed Casting Submissions</h2>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>Submissions to casting requests that have been confirmed.</div>
              {submissions.filter(s => s.status === 'confirmed').length === 0
                ? <div style={{ color: '#6b7280', fontSize: '14px' }}>No confirmed submissions yet.</div>
                : submissions.filter(s => s.status === 'confirmed').sort((a, b) => {
                    const da = a.casting_requests?.shoot_date || ''
                    const db = b.casting_requests?.shoot_date || ''
                    return da < db ? -1 : 1
                  }).map(sub => (
                    <div key={sub.id} onClick={() => setSelectedSub(sub)} style={{ backgroundColor: '#1a1a2e', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer' }}>
                      <div style={{ fontSize: '24px' }}>✅</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{sName(sub)}</div>
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>{sub.casting_requests?.production_name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{sub.casting_requests?.shoot_date ? fmtDate(sub.casting_requests.shoot_date) : ''} · {sub.casting_requests?.role_type}</div>
                      </div>
                      <div style={{ fontSize: '16px', color: '#6b7280' }}>›</div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* ── FINANCIALS ────────────────────────────────────────────────── */}
        {activeTab === 'Financials' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Commissions & Financials</h1>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'This Month Earned', value: fmtMoney(commMonthTotal), color: '#22c55e' },
                { label: 'Total Unpaid', value: fmtMoney(commUnpaidTotal), color: '#F59E0B' },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Add commission */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: addingComm ? '14px' : '0' }}>
                <span style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>Log Commission</span>
                <button onClick={() => setAddingComm(v => !v)} style={{ padding: '6px 14px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                  {addingComm ? 'Cancel' : '+ Add'}
                </button>
              </div>
              {addingComm && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px' }}>
                  <div><label style={lbl}>Booking Date *</label><input type="date" value={newComm.booking_date} onChange={e => setNewComm(f => ({ ...f, booking_date: e.target.value }))} style={inp} /></div>
                  <div><label style={lbl}>Production *</label><input value={newComm.production_name} onChange={e => setNewComm(f => ({ ...f, production_name: e.target.value }))} placeholder="Show name" style={inp} /></div>
                  <div><label style={lbl}>Performer</label><input value={newComm.performer_name} onChange={e => setNewComm(f => ({ ...f, performer_name: e.target.value }))} placeholder="Full name" style={inp} /></div>
                  <div><label style={lbl}>Gross Pay ($) *</label><input type="number" value={newComm.gross_pay} onChange={e => setNewComm(f => ({ ...f, gross_pay: e.target.value }))} placeholder="1500" style={inp} /></div>
                  <div><label style={lbl}>Rate (%)</label><input type="number" value={newComm.commission_rate} onChange={e => setNewComm(f => ({ ...f, commission_rate: e.target.value }))} style={inp} /></div>
                  <div><label style={lbl}>Notes</label><input value={newComm.notes} onChange={e => setNewComm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" style={inp} /></div>
                  {newComm.gross_pay && newComm.commission_rate && (
                    <div style={{ padding: '10px', backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)', fontSize: '13px', color: '#22c55e', fontWeight: '700' }}>
                      Commission: {fmtMoney(parseFloat(newComm.gross_pay) * parseFloat(newComm.commission_rate) / 100)}
                    </div>
                  )}
                  <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                    <button onClick={addCommission} style={{ padding: '10px 24px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '14px' }}>Save Commission</button>
                  </div>
                </div>
              )}
            </div>

            {/* Commission list */}
            {commLoading
              ? <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>Loading...</div>
              : commissions.length === 0
                ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>No commissions logged yet.</div>
                : commissions.map(c => (
                    <div key={c.id} style={{ backgroundColor: '#1e1e35', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{c.production_name}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{c.performer_name} · {fmtDate(c.booking_date)} · {c.commission_rate}%</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '900', fontSize: '16px', color: c.paid ? '#22c55e' : '#F59E0B' }}>{fmtMoney(c.commission_amount)}</div>
                        <div style={{ fontSize: '11px', color: c.paid ? '#22c55e' : '#6b7280' }}>{c.paid ? '✓ Paid' : 'Unpaid'}</div>
                      </div>
                      {!c.paid && (
                        <button onClick={() => markCommPaid(c.id)} style={{ padding: '6px 12px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap' }}>Mark Paid</button>
                      )}
                    </div>
                  ))
            }
          </div>
        )}

        {/* ── AVAILABILITY CHECK ───────────────────────────────────────── */}
        {activeTab === 'Avail' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Availability Check</h1>

            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 14px' }}>Send Availability Request</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={lbl}>Date Needed *</label>
                  <input type="date" value={availDate} onChange={e => setAvailDate(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Message to performers</label>
                  <textarea value={availMessage} onChange={e => setAvailMessage(e.target.value)} placeholder="Are you available for a background shoot on this date?" rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={lbl}>Select Performers ({availPerformerIds.length} selected)</label>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    <button onClick={() => setAvailPerformerIds(roster.map(r => r.user_id))} style={{ fontSize: '12px', padding: '5px 10px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Select All</button>
                    <button onClick={() => setAvailPerformerIds([])} style={{ fontSize: '12px', padding: '5px 10px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Clear</button>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px', backgroundColor: '#0f0f1a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {roster.map(r => (
                      <label key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: availPerformerIds.includes(r.user_id) ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
                        <input type="checkbox" checked={availPerformerIds.includes(r.user_id)} onChange={e => setAvailPerformerIds(prev => e.target.checked ? [...prev, r.user_id] : prev.filter(id => id !== r.user_id))} style={{ width: '14px', height: '14px' }} />
                        <span style={{ fontSize: '13px', color: 'white', flex: 1 }}>{pName(r)}</span>
                        <span style={{ fontSize: '11px', color: '#F59E0B' }}>{unionBadge(r.performer_profiles?.union_status)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={sendAvailCheck} disabled={availSending || !availDate || availPerformerIds.length === 0} style={{ padding: '11px', backgroundColor: (availDate && availPerformerIds.length > 0) ? '#F59E0B' : '#374151', color: (availDate && availPerformerIds.length > 0) ? '#1a1a2e' : '#6b7280', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: (availDate && availPerformerIds.length > 0) ? 'pointer' : 'not-allowed', fontSize: '14px' }}>
                  {availSending ? 'Sending...' : `📤 Send Avail Check to ${availPerformerIds.length} performer${availPerformerIds.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>

            {/* Response tracking */}
            {availCheckId && (
              <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#22c55e', margin: 0 }}>✓ Check Sent!</h2>
                  <button onClick={loadAvailResponses} style={{ fontSize: '13px', color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}>↻ Refresh Responses</button>
                </div>
                {availResponses.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {availResponses.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#1a1a2e', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px' }}>{r.responded ? (r.available ? '✅' : '❌') : '⏳'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: 'white', fontSize: '13px' }}>{r.users?.raw_user_meta_data?.full_name || r.users?.email}</div>
                          <div style={{ fontSize: '11px', color: r.responded ? (r.available ? '#22c55e' : '#ef4444') : '#9ca3af' }}>
                            {r.responded ? (r.available ? 'Available' : 'Not available') : 'No response yet'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES ──────────────────────────────────────────────────── */}
        {activeTab === 'Messages' && (
          <div>
            {activeThread ? (
              <>
                {/* Thread view header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <button
                    onClick={() => { setActiveThread(null); setThreadMsgs([]) }}
                    style={{ padding: '6px 12px', backgroundColor: '#1e1e35', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    ← Back
                  </button>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>{activeThread.performer?.name || 'Performer'}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{activeThread.subject}</div>
                  </div>
                </div>

                {/* Message bubbles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '55vh', overflowY: 'auto', padding: '4px 2px' }}>
                  {threadMsgsLoading
                    ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
                    : threadMsgs.map(m => {
                        const fromAgent = m.sender_type === 'agent'
                        return (
                          <div key={m.id} style={{ display: 'flex', flexDirection: fromAgent ? 'row-reverse' : 'row', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: fromAgent ? '#F59E0B' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: fromAgent ? '#1a1a2e' : 'white', flexShrink: 0 }}>
                              {fromAgent ? 'A' : (activeThread.performer?.name?.[0] || 'P')}
                            </div>
                            <div style={{ maxWidth: '75%' }}>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textAlign: fromAgent ? 'right' : 'left' }}>
                                {m.sender_name} · {fmtRelTime(m.created_at)}
                              </div>
                              <div style={{ backgroundColor: fromAgent ? '#1e3a5f' : '#1e1e35', border: fromAgent ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: fromAgent ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px', fontSize: '14px', color: '#e5e7eb', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {m.body}
                              </div>
                            </div>
                          </div>
                        )
                      })
                  }
                </div>

                {/* Reply box */}
                <div style={{ backgroundColor: '#1e1e35', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px' }}>
                  <textarea
                    value={threadReply}
                    onChange={e => setThreadReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendThreadReply() }}
                    rows={3}
                    placeholder="Type your reply… (Cmd+Enter to send)"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px' }}
                  />
                  <button
                    onClick={sendThreadReply}
                    disabled={threadReplying || !threadReply.trim()}
                    style={{ padding: '9px 20px', backgroundColor: threadReplying || !threadReply.trim() ? '#374151' : '#3b82f6', color: threadReplying || !threadReply.trim() ? '#6b7280' : 'white', border: 'none', borderRadius: '8px', cursor: threadReplying ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '13px' }}
                  >
                    {threadReplying ? 'Sending...' : '✉️ Send Reply'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: 0 }}>Messages</h1>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>Start a conversation from a performer's profile card</div>
                </div>

                {threadsLoading
                  ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
                  : agentThreads.length === 0
                    ? <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>✉️</div>
                        <div style={{ fontWeight: '700', marginBottom: '6px' }}>No conversations yet</div>
                        <div style={{ fontSize: '13px' }}>Open a performer's profile in My Roster and click "Message" to start a thread.</div>
                      </div>
                    : agentThreads.map(t => (
                        <div
                          key={t.threadId}
                          onClick={() => openThread(t)}
                          style={{ backgroundColor: '#1e1e35', borderRadius: '12px', border: t.unread ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#252542')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e1e35')}
                        >
                          {/* Avatar */}
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#374151', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                            {t.performer?.headshot_url
                              ? <Image src={t.performer.headshot_url} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👤</div>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                              <div style={{ fontWeight: t.unread ? '800' : '600', color: 'white', fontSize: '14px' }}>{t.performer?.name || 'Performer'}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280', flexShrink: 0, marginLeft: '8px' }}>{fmtRelTime(t.lastMessage.created_at)}</div>
                            </div>
                            <div style={{ fontSize: '12px', color: t.unread ? '#e5e7eb' : '#6b7280', fontWeight: t.unread ? '600' : '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.lastMessage.sender_type === 'agent' ? 'You: ' : ''}{t.lastMessage.body}
                            </div>
                          </div>
                          {t.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />}
                        </div>
                      ))
                }
              </>
            )}
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────── */}
        {activeTab === 'Settings' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Agency Settings</h1>

            {/* Account / display name */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 14px' }}>Account</h2>
              <label style={lbl}>Your Display Name</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Your name" style={{ ...inp, flex: 1 }} />
                <button onClick={saveName} disabled={nameSaving || !nameInput.trim()} style={{ padding: '8px 18px', backgroundColor: nameInput.trim() ? '#F59E0B' : '#374151', color: nameInput.trim() ? '#1a1a2e' : '#6b7280', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: nameSaving || !nameInput.trim() ? 'not-allowed' : 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}>
                  {nameSaving ? '...' : 'Save'}
                </button>
              </div>
              {nameMsg && <div style={{ fontSize: '13px', color: nameMsg.ok ? '#22c55e' : '#ef4444' }}>{nameMsg.ok ? '✓ ' : '✗ '}{nameMsg.text}</div>}
            </div>

            {/* Change password */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 14px' }}>Change Password</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type={showPw ? 'text' : 'password'} value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="Current password" style={inp} />
                <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 8 characters)" style={inp} />
                <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" style={inp} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#9ca3af', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} /> Show passwords
                </label>
                <button onClick={changePassword} disabled={pwSaving} style={{ alignSelf: 'flex-start', padding: '9px 18px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: pwSaving ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: pwSaving ? 0.5 : 1 }}>
                  {pwSaving ? 'Updating...' : 'Update Password'}
                </button>
                {pwMsg && <div style={{ fontSize: '13px', color: pwMsg.ok ? '#22c55e' : '#ef4444' }}>{pwMsg.ok ? '✓ ' : '✗ '}{pwMsg.text}</div>}
              </div>
            </div>

            {/* Email notifications */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 6px' }}>Email Notifications</h2>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '14px' }}>Get an email when a new casting request is posted. You&rsquo;ll still see requests in your dashboard either way.</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={emailPref} disabled={emailPrefSaving} onChange={e => saveEmailPref(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '14px', color: 'white' }}>Email me about new casting requests</span>
                {emailPrefSaving && <span style={{ fontSize: '12px', color: '#6b7280' }}>saving…</span>}
              </label>
            </div>

            {/* Availability links */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 6px' }}>Performer Availability Links</h2>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Performers can manage their availability at <span style={{ color: '#F59E0B', fontWeight: '600' }}>/availability</span>. Direct them there to keep their calendar updated.</div>
            </div>

            {/* Sign out */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={signOut} style={{ padding: '10px 20px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', background: 'transparent', color: '#ef4444', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Sign Out</button>
            </div>
          </div>
        )}

      </div>

      {/* ── PERFORMER DETAIL MODAL ──────────────────────────────────────────── */}
      {selectedPerformer && (
        <div onClick={() => { setSelectedPerformer(null); setComposingMsg(false) }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#1e1e35', borderRadius: '20px', padding: '24px', maxWidth: '420px', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '72px', height: '90px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#374151', position: 'relative' }}>
                {selectedPerformer.performer_profiles?.headshot_url
                  ? <Image src={selectedPerformer.performer_profiles.headshot_url} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>👤</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '17px', color: 'white', marginBottom: '3px' }}>{pName(selectedPerformer)}</div>
                <div style={{ fontSize: '18px' }}>{unionBadge(selectedPerformer.performer_profiles?.union_status)}</div>
                <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '600' }}>{unionTierLabel(selectedPerformer.performer_profiles?.union_status)}</div>
                {selectedPerformer.performer_profiles?.film_region_code && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>📍 {getRegionName(selectedPerformer.performer_profiles.film_region_code)}</div>}
              </div>
              <button onClick={() => { setSelectedPerformer(null); setComposingMsg(false) }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '14px' }}>
              {[
                ['Gender', selectedPerformer.performer_profiles?.gender],
                ['Age', selectedPerformer.performer_profiles?.age ? `${selectedPerformer.performer_profiles.age}` : null],
                ['Height', selectedPerformer.performer_profiles?.height_cm ? `${selectedPerformer.performer_profiles.height_cm} cm` : null],
                ['Hair', selectedPerformer.performer_profiles?.hair_color],
                ['Eyes', selectedPerformer.performer_profiles?.eye_color],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={String(k)} style={{ backgroundColor: '#1a1a2e', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '2px' }}>{k}</div>
                  <div style={{ color: 'white', fontWeight: '600' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', marginBottom: '6px' }}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
                {(selectedPerformer.tags || []).map(t => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', backgroundColor: 'rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '20px', fontSize: '12px' }}>
                    {t}
                    <button onClick={() => removeTag(selectedPerformer.user_id, t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', fontSize: '12px', padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag(selectedPerformer.user_id)} placeholder="Add tag..." style={{ flex: 1, padding: '7px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '13px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none' }} />
                <button onClick={() => addTag(selectedPerformer.user_id)} style={{ padding: '7px 13px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>+</button>
              </div>
            </div>

            {/* Private note */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', marginBottom: '6px' }}>Private Note</div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Notes visible only to your agency..." style={{ width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <button onClick={saveNote} disabled={noteLoading} style={{ marginTop: '6px', padding: '7px 14px', backgroundColor: noteLoading ? '#374151' : 'rgba(34,197,94,0.2)', color: noteLoading ? '#6b7280' : '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '7px', cursor: noteLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '13px' }}>
                {noteLoading ? 'Saving...' : '💾 Save Note'}
              </button>
            </div>

            {/* 7-day avail */}
            {(selectedPerformer.weekAvailability || []).length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', marginBottom: '8px' }}>This Week</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {selectedPerformer.weekAvailability.slice(0, 7).map(d => (
                    <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>{new Date(d.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short' }).slice(0, 2)}</div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: d.status ? (AVAIL_COLOR[d.status] || '#6b7280') : '#374151', margin: '0 auto' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message compose */}
            {!composingMsg ? (
              <button
                onClick={() => { setComposingMsg(true); setComposeSubject(''); setComposeBody('') }}
                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}
              >
                ✉️ Message {pName(selectedPerformer)}
              </button>
            ) : (
              <div style={{ marginBottom: '12px', padding: '14px', backgroundColor: '#0f0f1a', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#60a5fa', marginBottom: '10px' }}>New message to {pName(selectedPerformer)}</div>
                <input
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '13px', color: 'white', backgroundColor: '#1e1e35', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
                />
                <textarea
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  rows={4}
                  placeholder="Your message..."
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '13px', color: 'white', backgroundColor: '#1e1e35', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setComposingMsg(false)} style={{ flex: 1, padding: '8px', backgroundColor: '#374151', color: '#9ca3af', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                  <button
                    onClick={sendCompose}
                    disabled={composeSending || !composeSubject.trim() || !composeBody.trim()}
                    style={{ flex: 2, padding: '8px', backgroundColor: composeSending || !composeSubject.trim() || !composeBody.trim() ? '#374151' : '#3b82f6', color: composeSending || !composeSubject.trim() || !composeBody.trim() ? '#6b7280' : 'white', border: 'none', borderRadius: '7px', cursor: composeSending ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '13px' }}
                  >
                    {composeSending ? 'Sending...' : '✉️ Send Message'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => removeFromRoster(selectedPerformer.user_id, selectedPerformer.id)} style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>Remove from Roster</button>
              <button onClick={() => { setSelectedPerformer(null); router.push(`/profile/${selectedPerformer.user_id}`) }} style={{ flex: 2, padding: '10px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '13px' }}>View Full Profile →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMISSION DETAIL MODAL ─────────────────────────────────────────── */}
      {selectedSub && (
        <div
          onClick={() => setSelectedSub(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '28px', maxWidth: '540px', width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <button onClick={() => setSelectedSub(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>✕</button>

            {/* Performer header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#374151', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                {selectedSub.performer_profiles?.headshot_url
                  ? <Image src={selectedSub.performer_profiles.headshot_url} alt="" fill sizes="56px" style={{ objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👤</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>{sName(selectedSub)}</div>
                {selectedSub.performer_profiles?.union_status && (
                  <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '2px' }}>
                    {unionBadge(selectedSub.performer_profiles.union_status)} {unionTierLabel(selectedSub.performer_profiles.union_status)}
                  </div>
                )}
              </div>
              {(() => { const pill = STATUS_PILL[selectedSub.status] || STATUS_PILL.submitted; return (
                <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: pill.bg, color: pill.color, flexShrink: 0 }}>
                  {selectedSub.status.replace('_', ' ')}
                </span>
              )})()}
            </div>

            {/* Casting request details */}
            {selectedSub.casting_requests ? (
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Casting Request</div>
                <div style={{ backgroundColor: '#1e1e35', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '17px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{selectedSub.casting_requests.production_name}</div>
                  {selectedSub.casting_requests.casting_director && (
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                      Posted by: <span style={{ color: '#e5e7eb' }}>{selectedSub.casting_requests.casting_director.name}</span>
                      {selectedSub.casting_requests.casting_director.company ? <span> · {selectedSub.casting_requests.casting_director.company}</span> : null}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                    {[
                      { label: 'Role', value: selectedSub.casting_requests.role_type },
                      { label: 'Shoot Date', value: selectedSub.casting_requests.shoot_date ? fmtDate(selectedSub.casting_requests.shoot_date) : '—' },
                      { label: 'Location', value: selectedSub.casting_requests.location || '—' },
                      { label: 'Call Time', value: selectedSub.casting_requests.call_time || '—' },
                      { label: 'Rate', value: selectedSub.casting_requests.rate || '—' },
                      { label: 'Spots', value: selectedSub.casting_requests.number_needed != null ? String(selectedSub.casting_requests.number_needed) : '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: '13px', color: '#e5e7eb', marginTop: '2px' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {selectedSub.casting_requests.description && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
                      <div style={{ fontSize: '13px', color: '#e5e7eb', lineHeight: '1.6' }}>{selectedSub.casting_requests.description}</div>
                    </div>
                  )}
                  {selectedSub.casting_requests.wardrobe_notes && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Wardrobe Notes</div>
                      <div style={{ fontSize: '13px', color: '#e5e7eb', lineHeight: '1.6' }}>{selectedSub.casting_requests.wardrobe_notes}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '14px' }}>No casting request details available.</div>
            )}

            {/* Agent notes */}
            {selectedSub.notes && (
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Agent Notes</div>
                <div style={{ backgroundColor: '#1e1e35', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#e5e7eb', lineHeight: '1.6' }}>{selectedSub.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBMIT MODAL ────────────────────────────────────────────────────── */}
      {submittingFor && (
        <div onClick={() => setSubmittingFor(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#1e1e35', borderRadius: '20px', padding: '24px', maxWidth: '380px', width: '100%', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: '0 0 14px' }}>Submit Performer</h2>
            <label style={lbl}>Notes for casting director</label>
            <textarea value={submittingFor.notes} onChange={e => setSubmittingFor(f => f ? { ...f, notes: e.target.value } : null)} rows={3} placeholder="Why this performer is right for the role..." style={{ width: '100%', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '14px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setSubmittingFor(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#374151', color: '#9ca3af', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>Cancel</button>
              <button onClick={submitPerformer} style={{ flex: 2, padding: '10px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '14px' }}>Submit</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const lbl: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '5px' }
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '13px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', boxSizing: 'border-box' }
