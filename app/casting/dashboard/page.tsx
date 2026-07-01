'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast, { Toaster } from 'react-hot-toast'
import Logo from '@/components/Logo'
import { FILM_REGION_LIST, getRegionName, unionBadge, unionTierLabel } from '@/lib/film-regions'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  union_priority: number | null
  special_skills: string[] | null
  bio: string | null
  film_region_code: string | null
  availabilityStatus: string | null
  agencies: { id: string; name: string } | null
  users: { email: string; raw_user_meta_data: { full_name?: string } } | null
  verified_badge?: boolean | null
}

interface CastingRequest {
  id: string
  production_name: string
  project_type: string | null
  shoot_date: string
  call_time: string | null
  location: string | null
  shoot_region_code: string | null
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
  performer_profiles: { headshot_url: string | null; union_status: string | null; union_priority: number | null; height_cm: number | null; gender: string | null } | null
  users: { email: string; raw_user_meta_data: { full_name?: string } } | null
  agencies: { id: string; name: string } | null
}

interface SigninSessionData {
  id: string
  shoot_date: string
  qr_token: string
  location_name: string | null
  casting_requests: { production_name: string } | null
}

interface Booking {
  id: string
  performer_id: string
  created_by_id: string
  created_by_type: string
  created_by_name: string
  start_date: string
  end_date: string
  status: string
  production: string | null
  note: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Overview','Find','Requests','Kanban','Union','Analytics','Settings'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  Overview: '🏠 Overview',
  Find: '🔍 Find Performers',
  Requests: '📋 Casting Requests',
  Kanban: '👥 Submissions',
  Union: '🏆 Union Members',
  Analytics: '📊 Analytics',
  Settings: '⚙️ Settings',
}

const KANBAN_COLS = [
  { key: 'submitted',  label: '📥 Submitted',   color: '#6b7280' },
  { key: 'in_review',  label: '👁️ In Review',    color: '#3b82f6' },
  { key: 'shortlisted',label: '⭐ Shortlisted',  color: '#d97706' },
  { key: 'confirmed',  label: '✅ Confirmed',    color: '#22c55e' },
  { key: 'rejected',   label: '❌ Rejected',     color: '#ef4444' },
  { key: 'waitlisted', label: '⏳ Waitlist',     color: '#8b5cf6' },
] as const

const GENDER_OPTIONS = ['Any','Male','Female','Non-binary']
const HAIR_OPTIONS = ['','Black','Brown','Blonde','Red','Grey','White','Bald','Other']
const EYE_OPTIONS = ['','Brown','Blue','Green','Hazel','Grey','Other']
const PROJECT_TYPES = ['Feature Film','TV Series','Commercial','Music Video','Short Film','Documentary','Web Series','Other']
const ROLE_TYPES = ['Background','Featured Extra','Day Player','Principal','Stunt','Specialty']

// ─── Filter option lists — kept in sync with app/profile/page.tsx constants ──
const HAIR_LENGTHS = ['Bald / Shaved','Very Short (< 1 inch)','Short (1–3 inches)','Medium Short (3–5 inches)','Medium (chin length)','Medium Long (shoulder length)','Long (below shoulder)','Very Long (past mid-back)']
const HAIR_TEXTURES = ['Straight','Wavy','Curly','Coily / Kinky','Locs / Dreadlocks']
const BODY_TYPES = ['Slim / Lean','Athletic / Fit','Average / Medium','Stocky / Muscular','Heavyset / Large','Plus Size','Petite']
const SKIN_TONES = ['Very Fair','Fair','Light','Light Medium','Medium','Medium Dark (olive)','Dark','Very Dark']
const FACIAL_HAIR_OPTS = ['None / Clean Shaven','Stubble (1–3 days)','Short Beard','Full Beard','Long Beard','Moustache','Goatee','Sideburns','Not applicable']
const ETHNICITY_OPTS = ['Indigenous / First Nations','Black / African Canadian','East Asian','South Asian','Southeast Asian','Middle Eastern','Latin / Hispanic','White / Caucasian','Mixed / Multiracial','Other']
const SWIMMING_LEVELS = ['Non-swimmer','Basic (can float, basic strokes)','Intermediate (comfortable in water)','Strong swimmer','Competitive swimmer / Lifeguard']
const LANG_PRESETS = ['English','French','Mandarin','Cantonese','Punjabi','Hindi','Spanish','Portuguese','German','Italian','Japanese','Korean','Arabic','Ukrainian','Tagalog / Filipino','Vietnamese']
const ACCENT_PRESETS = ['Canadian (neutral)','British (RP)','British (regional)','American (neutral)','American (Southern)','American (New York)','Australian','Irish','Scottish','French','French Canadian','Spanish','Italian','German','Russian','Indian','Jamaican / Caribbean']
const SPORTS_OPTS = ['Hockey','Football (Canadian)','Basketball','Baseball','Soccer / Football','Tennis','Golf','Swimming','Skiing / Snowboarding','Skateboarding','Surfing','Martial Arts','Boxing / Wrestling','Cycling','Running / Track','Gymnastics','Cheerleading','Volleyball','Rugby','Lacrosse','Rock Climbing','Equestrian / Horse Riding']
const DANCE_OPTS = ['Ballet','Jazz','Contemporary / Modern','Hip Hop','Ballroom','Latin (Salsa, Tango, etc.)','Tap','Swing / Lindy Hop','Pole Dancing','Aerial / Acrobatics','Belly Dancing','Folk / Cultural']
const DRIVING_OPTS = ["Standard BC Driver's Licence",'Motorcycle Licence (Class 6)','Commercial Vehicle (Class 1–5)','ATV / Off-Road Vehicle','Boat / Watercraft','Forklift','Farm Equipment']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pName(p: Performer) {
  return p.users?.raw_user_meta_data?.full_name || p.users?.email?.split('@')[0] || 'Performer'
}
function sName(s: Submission) {
  return s.users?.raw_user_meta_data?.full_name || s.users?.email?.split('@')[0] || 'Performer'
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
}

// ─── Performer Card ────────────────────────────────────────────────────────────

function PerformerCard({ p, onClick }: { p: Performer; onClick: () => void }) {
  const name = pName(p)
  const badge = unionBadge(p.union_status)
  const tier = unionTierLabel(p.union_status)
  return (
    <div onClick={onClick} style={{ backgroundColor: '#1e1e35', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: p.availabilityStatus === 'available' ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.06)', transition: 'transform 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
      <div style={{ aspectRatio: '3/4', backgroundColor: '#0f0f1a', position: 'relative', overflow: 'hidden' }}>
        {p.headshot_url
          ? <Image src={p.headshot_url} alt={name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px" style={{ objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>👤</div>
        }
        <div style={{ position: 'absolute', top: '6px', left: '6px', fontSize: '16px' }}>{badge}</div>
        {p.availabilityStatus === 'available' && (
          <div style={{ position: 'absolute', top: '6px', right: '6px', padding: '2px 6px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', backgroundColor: '#22c55e', color: 'white' }}>Avail</div>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: 'white', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          {p.verified_badge && (
            <span title="Verified Pro" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#22c55e', color: '#06281a', fontSize: '10px', fontWeight: 700, padding: '2px 7px 2px 5px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', borderRadius: '50%', backgroundColor: '#06281a', color: '#22c55e', fontSize: '9px', fontWeight: 900 }}>✓</span>
              Pro
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '600' }}>{tier}</div>
        {p.film_region_code && <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{getRegionName(p.film_region_code)}</div>}
      </div>
    </div>
  )
}

// ─── Submission Card (Kanban) ──────────────────────────────────────────────────

function KanbanCard({ sub, onMove }: { sub: Submission; onMove: (id: string, status: string) => void }) {
  const name = sName(sub)
  const badge = unionBadge(sub.performer_profiles?.union_status)
  const tier = unionTierLabel(sub.performer_profiles?.union_status)
  const [dragging, setDragging] = useState(false)

  return (
    <div draggable
      onDragStart={e => { e.dataTransfer.setData('submissionId', sub.id); setDragging(true) }}
      onDragEnd={() => setDragging(false)}
      style={{ backgroundColor: dragging ? '#0f0f1a' : '#1a1a2e', borderRadius: '10px', padding: '10px 12px', cursor: 'grab', border: '1px solid rgba(255,255,255,0.06)', opacity: dragging ? 0.5 : 1, marginBottom: '6px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        {sub.performer_profiles?.headshot_url
          ? <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundColor: '#374151' }}>
              <Image src={sub.performer_profiles.headshot_url} alt={name} fill sizes="32px" style={{ objectFit: 'cover' }} />
            </div>
          : <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>👤</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: 'white', marginBottom: '1px' }}>{name}</div>
          <div style={{ fontSize: '11px', color: '#F59E0B' }}>{badge} {tier}</div>
          {sub.agencies && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{sub.agencies.name}</div>}
        </div>
      </div>
      {sub.notes && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', fontStyle: 'italic' }}>"{sub.notes}"</div>}
      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
        {sub.status !== 'confirmed' && (
          <button onClick={() => onMove(sub.id, 'confirmed')} style={{ fontSize: '10px', padding: '2px 7px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>✓</button>
        )}
        {sub.status !== 'shortlisted' && (
          <button onClick={() => onMove(sub.id, 'shortlisted')} style={{ fontSize: '10px', padding: '2px 7px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>⭐</button>
        )}
        {sub.status !== 'rejected' && (
          <button onClick={() => onMove(sub.id, 'rejected')} style={{ fontSize: '10px', padding: '2px 7px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>✗</button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CastingDashboardPage() {
  const router = useRouter()
  const [cdName, setCdName] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [isMobile, setIsMobile] = useState(false)
  const [isCastingPro, setIsCastingPro] = useState(false)

  // Overview stats
  const [stats, setStats] = useState({ activeRequests: 0, pendingSubmissions: 0, confirmedToday: 0 })
  const [hoveredStat, setHoveredStat] = useState<string | null>(null)

  // Find performers
  const [browseRegion, setBrowseRegion] = useState('')
  const [browseDate, setBrowseDate] = useState('')
  const [browseGender, setBrowseGender] = useState('Any')
  const [browseAgeMin, setBrowseAgeMin] = useState('')
  const [browseAgeMax, setBrowseAgeMax] = useState('')
  const [browseHair, setBrowseHair] = useState('')
  const [browseEye, setBrowseEye] = useState('')
  const [browseUnion, setBrowseUnion] = useState('')
  const [browseSkills, setBrowseSkills] = useState('')
  const [browseUnionTier, setBrowseUnionTier] = useState('')
  const [browseRepresentation, setBrowseRepresentation] = useState('')
  const [browseHairLength, setBrowseHairLength] = useState('')
  const [browseHairTexture, setBrowseHairTexture] = useState('')
  const [browseBodyType, setBrowseBodyType] = useState('')
  const [browseSkinTone, setBrowseSkinTone] = useState('')
  const [browseFacialHair, setBrowseFacialHair] = useState('')
  const [browseEthnicity, setBrowseEthnicity] = useState('')
  const [browseLanguage, setBrowseLanguage] = useState('')
  const [browseDanceStyle, setBrowseDanceStyle] = useState('')
  const [browseSport, setBrowseSport] = useState('')
  const [browseAccent, setBrowseAccent] = useState('')
  const [browseDriving, setBrowseDriving] = useState('')
  const [browseSwimming, setBrowseSwimming] = useState('')
  const [browseHeightMin, setBrowseHeightMin] = useState('')
  const [browseHeightMax, setBrowseHeightMax] = useState('')
  const [browseQuery, setBrowseQuery] = useState('')
  const [performers, setPerformers] = useState<Performer[]>([])
  const [adjacentPerformers, setAdjacentPerformers] = useState<Performer[]>([])
  const [browseRegionName, setBrowseRegionName] = useState('')
  const [browseLoading, setBrowseLoading] = useState(false)
  const [quickView, setQuickView] = useState<Performer | null>(null)
  const [aiQuery, setAiQuery] = useState('')
  const [aiInterpretation, setAiInterpretation] = useState('')
  const [browseMode, setBrowseMode] = useState<'search'|'browse'>('search')
  const [nlQuery, setNlQuery] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const [nlResults, setNlResults] = useState<Performer[] | null>(null)
  const [nlInterpretation, setNlInterpretation] = useState('')
  const [nlDate, setNlDate] = useState<string | null>(null)
  const [nlRegion, setNlRegion] = useState<string | null>(null)

  // Requests
  const [requests, setRequests] = useState<CastingRequest[]>([])
  const [reqLoading, setReqLoading] = useState(false)
  const [reqTab, setReqTab] = useState<'open'|'closed'>('open')
  const [templates, setTemplates] = useState<any[]>([])

  // New request form
  const [step, setStep] = useState(0)
  const [reqForm, setReqForm] = useState({
    productionName: '', projectType: '', shootDate: '', callTime: '',
    location: '', shootRegionCode: '',
    roleType: 'Background', performersNeeded: '1', genderNeeded: 'Any',
    ageMin: '', ageMax: '', unionStatus: '', rate: '', rateNotes: '',
    description: '', wardrobeNotes: '', notifyAll: true, travelCostsCovered: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Kanban
  const [kanbanRequest, setKanbanRequest] = useState<CastingRequest | null>(null)
  const [kanbanSubs, setKanbanSubs] = useState<Submission[]>([])
  const [kanbanLoading, setKanbanLoading] = useState(false)

  // Union members tab
  const [unionTierFilter, setUnionTierFilter] = useState<'full'|'apprentice'|'bg'>('full')
  const [unionPerformers, setUnionPerformers] = useState<Performer[]>([])
  const [unionLoading, setUnionLoading] = useState(false)

  // Sign-in
  const [signinSessions, setSigninSessions] = useState<SigninSessionData[]>([])
  const [newSigninDate, setNewSigninDate] = useState('')
  const [newSigninLocation, setNewSigninLocation] = useState('')
  const [newSigninRequest, setNewSigninRequest] = useState('')
  const [createdQR, setCreatedQR] = useState<{ token: string; url: string } | null>(null)
  const [signinDetail, setSigninDetail] = useState<any | null>(null)

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

  // Holds (performer quick-view modal)
  const [holds, setHolds] = useState<Booking[]>([])
  const [holdsLoading, setHoldsLoading] = useState(false)
  const [holdStart, setHoldStart] = useState('')
  const [holdEnd, setHoldEnd] = useState('')
  const [holdProduction, setHoldProduction] = useState('')
  const [holdNote, setHoldNote] = useState('')
  const [holdSubmitting, setHoldSubmitting] = useState(false)
  const [holdMsg, setHoldMsg] = useState('')

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/casting/auth').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) { router.replace('/casting/login'); return }
      setCdName(d.name || d.email)
      setNameInput(d.name || '')
    })
    setIsCastingPro(true) // all features free for casting directors
  }, [router])

  // ── Load data by tab ─────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'Overview') loadStats()
    if (activeTab === 'Requests') { loadRequests(); loadTemplates() }
    if (activeTab === 'Kanban') loadRequests()
    if (activeTab === 'Union') loadUnionPerformers()
    if (activeTab === 'Find') loadPerformers()
  }, [activeTab, reqTab, unionTierFilter, browseRegion])

  useEffect(() => {
    if (!quickView) {
      setHolds([])
      setHoldMsg('')
      setHoldStart('')
      setHoldEnd('')
      setHoldProduction('')
      setHoldNote('')
      return
    }
    setHoldsLoading(true)
    fetch(`/api/bookings?performerId=${quickView.user_id}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Booking[]) => setHolds(data))
      .finally(() => setHoldsLoading(false))
  }, [quickView])

  async function loadStats() {
    const res = await fetch('/api/casting/requests?status=open')
    if (!res.ok) return
    const data: CastingRequest[] = await res.json()
    const today = new Date().toISOString().slice(0, 10)
    setStats({
      activeRequests: data.length,
      pendingSubmissions: data.reduce((a, r) => a + r.submissionCount, 0),
      confirmedToday: data.reduce((a, r) => a + r.confirmedCount, 0),
    })
  }

  const loadPerformers = useCallback(async () => {
    setBrowseLoading(true)
    const params = new URLSearchParams({ sort: 'name' })
    if (browseQuery) params.set('q', browseQuery)
    if (browseDate) params.set('date', browseDate)
    if (browseGender !== 'Any') params.set('gender', browseGender)
    if (browseAgeMin) params.set('ageMin', browseAgeMin)
    if (browseAgeMax) params.set('ageMax', browseAgeMax)
    if (browseHair) params.set('hairColor', browseHair)
    if (browseEye) params.set('eyeColor', browseEye)
    if (browseUnion) params.set('unionStatus', browseUnion)
    if (browseSkills) params.set('skills', browseSkills)
    if (browseRegion) params.set('region', browseRegion)
    if (browseUnionTier) params.set('unionTier', browseUnionTier)
    if (browseRepresentation) params.set('representation', browseRepresentation)
    if (browseHairLength) params.set('hairLength', browseHairLength)
    if (browseHairTexture) params.set('hairTexture', browseHairTexture)
    if (browseBodyType) params.set('bodyType', browseBodyType)
    if (browseSkinTone) params.set('skinTone', browseSkinTone)
    if (browseFacialHair) params.set('facialHair', browseFacialHair)
    if (browseEthnicity) params.set('ethnicity', browseEthnicity)
    if (browseLanguage) params.set('language', browseLanguage)
    if (browseDanceStyle) params.set('danceStyle', browseDanceStyle)
    if (browseSport) params.set('sport', browseSport)
    if (browseAccent) params.set('accent', browseAccent)
    if (browseDriving) params.set('driving', browseDriving)
    if (browseSwimming) params.set('swimming', browseSwimming)
    if (browseHeightMin) params.set('heightMin', browseHeightMin)
    if (browseHeightMax) params.set('heightMax', browseHeightMax)

    const res = await fetch(`/api/casting/performers?${params}`)
    setBrowseLoading(false)
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) {
      setPerformers(data)
      setAdjacentPerformers([])
      setBrowseRegionName('')
    } else {
      setPerformers(data.inRegion || [])
      setAdjacentPerformers(data.adjacentRegion || [])
      setBrowseRegionName(data.shootRegionName || '')
      setAiInterpretation('')
    }
  }, [browseQuery, browseDate, browseGender, browseAgeMin, browseAgeMax, browseHair, browseEye, browseUnion, browseSkills, browseRegion, browseUnionTier, browseRepresentation, browseHairLength, browseHairTexture, browseBodyType, browseSkinTone, browseFacialHair, browseEthnicity, browseLanguage, browseDanceStyle, browseSport, browseAccent, browseDriving, browseSwimming, browseHeightMin, browseHeightMax])

  async function loadRequests() {
    setReqLoading(true)
    const res = await fetch(`/api/casting/requests?status=${reqTab}`)
    setReqLoading(false)
    if (res.ok) setRequests(await res.json())
  }

  async function loadTemplates() {
    const res = await fetch('/api/casting/templates')
    if (res.ok) setTemplates(await res.json())
  }

  async function loadUnionPerformers() {
    setUnionLoading(true)
    const params = new URLSearchParams({ unionTier: unionTierFilter, sort: 'priority', limit: '100' })
    if (browseRegion) params.set('region', browseRegion)
    const res = await fetch(`/api/casting/performers?${params}`)
    setUnionLoading(false)
    if (!res.ok) return
    const data = await res.json()
    setUnionPerformers(Array.isArray(data) ? data : [...(data.inRegion || []), ...(data.adjacentRegion || [])])
  }

  async function loadSigninSessions() {
    // Load recent requests for sign-in association
    const res = await fetch('/api/casting/requests?status=open')
    if (res.ok) setRequests(await res.json())
  }

  // ── Kanban ──────────────────────────────────────────────────────────────

  async function openKanban(req: CastingRequest) {
    setKanbanRequest(req)
    setKanbanLoading(true)
    const res = await fetch(`/api/casting/requests/${req.id}`)
    setKanbanLoading(false)
    if (res.ok) {
      const data = await res.json()
      setKanbanSubs(data.submissions || [])
    }
  }

  async function moveKanban(submissionId: string, status: string) {
    await fetch('/api/casting/kanban', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, status }),
    })
    setKanbanSubs(prev => prev.map(s => s.id === submissionId ? { ...s, status } : s))
  }

  function handleKanbanDrop(e: React.DragEvent, toStatus: string) {
    const subId = e.dataTransfer.getData('submissionId')
    if (subId) moveKanban(subId, toStatus)
  }

  // ── New request ──────────────────────────────────────────────────────────

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
        shootRegionCode: reqForm.shootRegionCode || null,
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
        travelCostsCovered: reqForm.travelCostsCovered,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitSuccess(false)
        setStep(0)
        setReqForm({ productionName: '', projectType: '', shootDate: '', callTime: '', location: '', shootRegionCode: '', roleType: 'Background', performersNeeded: '1', genderNeeded: 'Any', ageMin: '', ageMax: '', unionStatus: '', rate: '', rateNotes: '', description: '', wardrobeNotes: '', notifyAll: true, travelCostsCovered: false })
        setActiveTab('Requests')
      }, 2500)
    }
  }

  async function saveTemplate() {
    const name = prompt('Template name?')
    if (!name) return
    await fetch('/api/casting/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, template_data: reqForm }),
    })
    loadTemplates()
  }

  // ── Sign-in QR ──────────────────────────────────────────────────────────

  async function createSignin() {
    if (!newSigninDate) return
    const res = await fetch('/api/casting/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: newSigninRequest || null, shootDate: newSigninDate, locationName: newSigninLocation || null }),
    })
    if (res.ok) {
      const data = await res.json()
      setCreatedQR({ token: data.qrToken, url: data.url })
    }
  }

  async function viewSigninDetail(token: string) {
    const res = await fetch(`/api/casting/signin?token=${token}`)
    if (res.ok) setSigninDetail(await res.json())
  }

  async function runNlSearch() {
    if (!nlQuery.trim()) return
    setNlLoading(true)
    setNlResults(null)
    setNlInterpretation('')
    setNlDate(null)
    setNlRegion(null)
    try {
      const res = await fetch('/api/casting/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlQuery.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Search failed')
        return
      }
      const data = await res.json()
      setNlResults(data.performers || [])
      setNlInterpretation(data.interpretation || '')
      setNlDate(data.availability_date || null)
      setNlRegion(data.resolved_region_code || null)
    } catch {
      toast.error('Search failed — check your connection')
    } finally {
      setNlLoading(false)
    }
  }

  async function placeHold() {
    if (!quickView || !holdStart || !holdEnd) return
    setHoldSubmitting(true)
    setHoldMsg('')
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performerId: quickView.user_id,
        startDate: holdStart,
        endDate: holdEnd,
        production: holdProduction || null,
        note: holdNote || null,
      }),
    })
    setHoldSubmitting(false)
    if (res.ok) {
      setHoldMsg('Hold placed!')
      setHoldStart('')
      setHoldEnd('')
      setHoldProduction('')
      setHoldNote('')
      const refresh = await fetch(`/api/bookings?performerId=${quickView.user_id}`)
      if (refresh.ok) setHolds(await refresh.json())
    } else {
      const e = await res.json().catch(() => ({}))
      setHoldMsg(e.error || 'Failed to place hold')
    }
  }

  async function cancelHold(id: string) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
    if (res.ok && quickView) {
      const refresh = await fetch(`/api/bookings?performerId=${quickView.user_id}`)
      if (refresh.ok) setHolds(await refresh.json())
    }
  }

  async function saveName() {
    if (!nameInput.trim()) return
    setNameSaving(true); setNameMsg(null)
    const res = await fetch('/api/casting/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_profile', name: nameInput.trim() }),
    })
    const d = await res.json()
    setNameSaving(false)
    if (res.ok) { setCdName(d.name); setNameMsg({ text: 'Name updated', ok: true }) }
    else setNameMsg({ text: d.error || 'Failed to update', ok: false })
  }

  async function changePassword() {
    setPwMsg(null)
    if (newPw.length < 8) { setPwMsg({ text: 'New password must be at least 8 characters', ok: false }); return }
    if (newPw !== confirmPw) { setPwMsg({ text: 'New passwords do not match', ok: false }); return }
    setPwSaving(true)
    const res = await fetch('/api/casting/auth', {
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
    await fetch('/api/casting/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    router.replace('/casting/login')
  }

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
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>/ Casting</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {cdName && <span style={{ color: '#e5e7eb', fontSize: '14px' }}>{cdName}</span>}
          <button onClick={signOut} style={{ color: '#9ca3af', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', padding: '0 12px', gap: '2px', minWidth: 'max-content' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 14px', fontSize: '13px', fontWeight: activeTab === tab ? '700' : '400', color: activeTab === tab ? '#F59E0B' : '#9ca3af', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #F59E0B' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Production Dashboard</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
              {[
                { label: 'Active Requests', value: stats.activeRequests, icon: '🎬', color: '#F59E0B', tab: 'Requests' as Tab },
                { label: 'Total Submissions', value: stats.pendingSubmissions, icon: '📥', color: '#3b82f6', tab: 'Kanban' as Tab },
                { label: 'Confirmed Performers', value: stats.confirmedToday, icon: '✅', color: '#22c55e', tab: 'Kanban' as Tab },
              ].map(s => (
                <div key={s.label} onClick={() => setActiveTab(s.tab)} onMouseEnter={() => setHoveredStat(s.label)} onMouseLeave={() => setHoveredStat(null)} style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: `1px solid ${hoveredStat === s.label ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent requests preview */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: 0 }}>Open Casting Requests</h2>
                <button onClick={() => setActiveTab('Requests')} style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              {requests.slice(0, 4).map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'white' }}>{req.production_name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{req.role_type} · {fmtDate(req.shoot_date)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '700' }}>{req.confirmedCount}/{req.performers_needed}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{req.submissionCount} submitted</div>
                  </div>
                </div>
              ))}
              {requests.length === 0 && <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No open requests. <button onClick={() => { setActiveTab('Requests'); setStep(0) }} style={{ color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}>Create one →</button></div>}
            </div>

            <div style={{ backgroundColor: '#1a1a2e', borderRadius: '12px', padding: '16px 20px', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '700', marginBottom: '6px' }}>Union Member Priority</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
                👑 Full Members are always shown first and should be submitted first for union productions.<br />
                ⭐ Apprentice Members have second preference. 🟢 BG Members third. ⚫ Non-Union last.
              </div>
            </div>
          </div>
        )}

        {/* ── FIND PERFORMERS ───────────────────────────────────────────── */}
        {activeTab === 'Find' && (
          <div>
            {/* ── Natural-language search ─────────────────────────────────── */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '16px 18px', border: '1px solid rgba(245,158,11,0.25)', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                ✨ Search in plain English
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={nlQuery}
                  onChange={e => setNlQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runNlSearch()}
                  placeholder='e.g. 20 business-casual men, 30-50, available Tuesday in Vancouver'
                  style={{ flex: 1, padding: '10px 13px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '13px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  onClick={runNlSearch}
                  disabled={nlLoading || !nlQuery.trim()}
                  style={{ padding: '10px 18px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', opacity: nlLoading || !nlQuery.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
                >
                  {nlLoading ? '…' : 'Search'}
                </button>
                {nlResults !== null && (
                  <button
                    onClick={() => { setNlResults(null); setNlQuery(''); setNlInterpretation(''); setNlDate(null); setNlRegion(null) }}
                    style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#9ca3af', fontWeight: '600', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Interpretation / result summary */}
              {nlResults !== null && !nlLoading && (
                <div style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600' }}>
                    Showing: {nlInterpretation}
                  </span>
                  {nlDate && (
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>
                      · Available: {nlDate}
                    </span>
                  )}
                  {nlRegion && (
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>
                      · Region: {getRegionName(nlRegion)}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                    ({nlResults.length} result{nlResults.length !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
              {nlLoading && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#9ca3af' }}>Searching with AI…</div>
              )}
            </div>

            {/* AI search results — shown instead of manual results when present */}
            {nlResults !== null && !nlLoading && (
              <div style={{ marginBottom: '16px' }}>
                {nlResults.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                    {nlResults.map(p => <PerformerCard key={p.user_id} p={p} onClick={() => setQuickView(p)} />)}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>
                    No performers matched your search. Try adjusting the description.
                  </div>
                )}
              </div>
            )}

            {/* Only show manual filters when AI results are not active */}
            {nlResults === null && (
              <>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['search','browse'] as const).map(m => (
                <button key={m} onClick={() => setBrowseMode(m)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', backgroundColor: browseMode === m ? '#F59E0B' : '#1e1e35', color: browseMode === m ? '#1a1a2e' : '#9ca3af' }}>
                  {m === 'search' ? '🔍 Search' : '🖼️ Browse'}
                </button>
              ))}
            </div>

            {/* Filter panel */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              {/* Name / city text search */}
              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>Search by name or city</label>
                <input value={browseQuery} onChange={e => setBrowseQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadPerformers()} placeholder="e.g. Smith, Vancouver..." style={inp} />
              </div>

              {/* Location — most important */}
              <div style={{ marginBottom: '14px', padding: '12px 14px', backgroundColor: '#1a1a2e', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                <label style={lbl}>📍 Shoot Location (filters performers by region)</label>
                <select value={browseRegion} onChange={e => setBrowseRegion(e.target.value)} style={inp}>
                  <option value="">All Canada</option>
                  {FILM_REGION_LIST.map(r => <option key={r.code} value={r.code}>{r.provinceCode} — {r.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={lbl}>Available On</label>
                  <input type="date" value={browseDate} onChange={e => setBrowseDate(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Gender</label>
                  <select value={browseGender} onChange={e => setBrowseGender(e.target.value)} style={inp}>
                    {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Union Tier</label>
                  <select value={browseUnionTier} onChange={e => setBrowseUnionTier(e.target.value)} style={inp}>
                    <option value="">All tiers</option>
                    <option value="full">👑 Full Members only</option>
                    <option value="apprentice">⭐ Apprentice only</option>
                    <option value="bg">🟢 Extra Members only</option>
                    <option value="nonunion">⚫ Non-Union only</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Agent Representation</label>
                  <select value={browseRepresentation} onChange={e => setBrowseRepresentation(e.target.value)} style={inp}>
                    <option value="">Agent: All performers</option>
                    <option value="represented">With an agent</option>
                    <option value="unrepresented">Without an agent</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Age Min</label>
                  <input type="number" placeholder="18" value={browseAgeMin} onChange={e => setBrowseAgeMin(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Age Max</label>
                  <input type="number" placeholder="65" value={browseAgeMax} onChange={e => setBrowseAgeMax(e.target.value)} style={inp} />
                </div>
                {true && (
                  <>
                    <div>
                      <label style={lbl}>Hair Color</label>
                      <select value={browseHair} onChange={e => setBrowseHair(e.target.value)} style={inp}>
                        {HAIR_OPTIONS.map(h => <option key={h} value={h}>{h || 'Any'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Eye Color</label>
                      <select value={browseEye} onChange={e => setBrowseEye(e.target.value)} style={inp}>
                        {EYE_OPTIONS.map(e => <option key={e} value={e}>{e || 'Any'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Special Skills</label>
                      <input placeholder="driving, dance..." value={browseSkills} onChange={e => setBrowseSkills(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Hair Length</label>
                      <select value={browseHairLength} onChange={e => setBrowseHairLength(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {HAIR_LENGTHS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Hair Texture</label>
                      <select value={browseHairTexture} onChange={e => setBrowseHairTexture(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {HAIR_TEXTURES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Body Type</label>
                      <select value={browseBodyType} onChange={e => setBrowseBodyType(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {BODY_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Skin Tone</label>
                      <select value={browseSkinTone} onChange={e => setBrowseSkinTone(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {SKIN_TONES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Facial Hair</label>
                      <select value={browseFacialHair} onChange={e => setBrowseFacialHair(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {FACIAL_HAIR_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Ethnicity</label>
                      <select value={browseEthnicity} onChange={e => setBrowseEthnicity(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {ETHNICITY_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Language</label>
                      <select value={browseLanguage} onChange={e => setBrowseLanguage(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {LANG_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Dance Style</label>
                      <select value={browseDanceStyle} onChange={e => setBrowseDanceStyle(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {DANCE_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Sport</label>
                      <select value={browseSport} onChange={e => setBrowseSport(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {SPORTS_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Accent</label>
                      <select value={browseAccent} onChange={e => setBrowseAccent(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {ACCENT_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Driving</label>
                      <select value={browseDriving} onChange={e => setBrowseDriving(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {DRIVING_OPTS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Swimming</label>
                      <select value={browseSwimming} onChange={e => setBrowseSwimming(e.target.value)} style={inp}>
                        <option value="">Any</option>
                        {SWIMMING_LEVELS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Height Min (cm)</label>
                      <input type="number" placeholder="150" value={browseHeightMin} onChange={e => setBrowseHeightMin(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Height Max (cm)</label>
                      <input type="number" placeholder="200" value={browseHeightMax} onChange={e => setBrowseHeightMax(e.target.value)} style={inp} />
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={loadPerformers} style={{ flex: 1, padding: '10px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  🔍 Search Performers
                </button>
              </div>
            </div>

            {browseLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Searching...</div>
              : (
                <>
                  {aiInterpretation && (
                    <div style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#F59E0B', marginBottom: '12px' }}>
                      AI: {aiInterpretation}
                    </div>
                  )}

                  {performers.length > 0 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>{performers.length} performer{performers.length !== 1 ? 's' : ''}{browseRegionName ? ` in ${browseRegionName}` : ''}</span>
                        <span style={{ fontSize: '11px', color: '#F59E0B', padding: '2px 8px', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: '20px' }}>Boosted profiles shown first</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                        {performers.map(p => <PerformerCard key={p.user_id} p={p} onClick={() => setQuickView(p)} />)}
                      </div>
                    </>
                  )}

                  {adjacentPerformers.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                        <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>🗺️ {adjacentPerformers.length} performers from nearby regions who may travel</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                        {adjacentPerformers.map(p => <PerformerCard key={p.user_id} p={p} onClick={() => setQuickView(p)} />)}
                      </div>
                    </div>
                  )}

                  {performers.length === 0 && !browseLoading && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>
                      No performers found. Try adjusting your filters.
                    </div>
                  )}
                </>
              )
            }
              </>
            )}
          </div>
        )}

        {/* ── CASTING REQUESTS ─────────────────────────────────────────── */}
        {activeTab === 'Requests' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: 0, flex: 1 }}>Casting Requests</h1>
              <button onClick={() => { setStep(0); setActiveTab('Requests') }} style={{ padding: '9px 18px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>+ New Request</button>
            </div>

            {/* Inline new request form */}
            {step >= 0 && !reqLoading && (
              <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: '0 0 16px' }}>New Casting Request</h2>

                {submitSuccess ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎬</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>Request Sent!</div>
                    <div style={{ color: '#9ca3af', fontSize: '14px', marginTop: '6px' }}>Agencies have been notified.</div>
                  </div>
                ) : (
                  <>
                    {/* Progress steps */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                      {['Production','Location','Role','Who','Send'].map((label, i) => (
                        <div key={i} style={{ flex: 1 }}>
                          <div style={{ height: '3px', borderRadius: '2px', backgroundColor: i <= step ? '#F59E0B' : '#374151', marginBottom: '4px' }} />
                          <div style={{ fontSize: '10px', color: i === step ? '#F59E0B' : '#6b7280', fontWeight: i === step ? '700' : '400', textAlign: 'center' }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {step === 0 && (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div><label style={reqLbl}>Production Name *</label><input value={reqForm.productionName} onChange={e => setReqForm(f => ({ ...f, productionName: e.target.value }))} placeholder="e.g. Untitled Amazon Project" style={reqInp} /></div>
                        <div><label style={reqLbl}>Project Type</label><select value={reqForm.projectType} onChange={e => setReqForm(f => ({ ...f, projectType: e.target.value }))} style={{ ...reqInp, backgroundColor: '#0f0f1a' }}><option value="">Select type</option>{PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div><label style={reqLbl}>Shoot Date *</label><input type="date" value={reqForm.shootDate} onChange={e => setReqForm(f => ({ ...f, shootDate: e.target.value }))} style={reqInp} /></div>
                          <div><label style={reqLbl}>Call Time</label><input type="time" value={reqForm.callTime} onChange={e => setReqForm(f => ({ ...f, callTime: e.target.value }))} style={reqInp} /></div>
                        </div>
                      </div>
                    )}

                    {step === 1 && (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                          <label style={reqLbl}>Shoot Region *</label>
                          <select value={reqForm.shootRegionCode} onChange={e => setReqForm(f => ({ ...f, shootRegionCode: e.target.value }))} style={{ ...reqInp, backgroundColor: '#0f0f1a' }}>
                            <option value="">Select region</option>
                            {FILM_REGION_LIST.map(r => <option key={r.code} value={r.code}>{r.provinceCode} — {r.name}</option>)}
                          </select>
                          {reqForm.shootRegionCode && <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px' }}>✓ Performers will be filtered to this region and nearby areas</div>}
                        </div>
                        <div><label style={reqLbl}>Shoot City</label><input value={reqForm.location} onChange={e => setReqForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Vancouver, BC" style={reqInp} /></div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={reqForm.travelCostsCovered} onChange={e => setReqForm(f => ({ ...f, travelCostsCovered: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                          <span style={{ fontSize: '13px', color: '#e5e7eb' }}>Travel costs covered for out-of-region performers</span>
                        </label>
                      </div>
                    )}

                    {step === 2 && (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div><label style={reqLbl}>Role Type *</label><select value={reqForm.roleType} onChange={e => setReqForm(f => ({ ...f, roleType: e.target.value }))} style={{ ...reqInp, backgroundColor: '#0f0f1a' }}>{ROLE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div><label style={reqLbl}>Description</label><textarea value={reqForm.description} onChange={e => setReqForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the role, scene, atmosphere..." rows={3} style={{ ...reqInp, resize: 'vertical', fontFamily: 'inherit' }} /></div>
                        <div><label style={reqLbl}>Wardrobe Notes</label><textarea value={reqForm.wardrobeNotes} onChange={e => setReqForm(f => ({ ...f, wardrobeNotes: e.target.value }))} placeholder="Business attire, period clothing..." rows={2} style={{ ...reqInp, resize: 'vertical', fontFamily: 'inherit' }} /></div>
                      </div>
                    )}

                    {step === 3 && (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div><label style={reqLbl}>Performers Needed</label><input type="number" min="1" value={reqForm.performersNeeded} onChange={e => setReqForm(f => ({ ...f, performersNeeded: e.target.value }))} style={reqInp} /></div>
                          <div><label style={reqLbl}>Gender</label><select value={reqForm.genderNeeded} onChange={e => setReqForm(f => ({ ...f, genderNeeded: e.target.value }))} style={{ ...reqInp, backgroundColor: '#0f0f1a' }}>{GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}</select></div>
                          <div><label style={reqLbl}>Age Min</label><input type="number" placeholder="18" value={reqForm.ageMin} onChange={e => setReqForm(f => ({ ...f, ageMin: e.target.value }))} style={reqInp} /></div>
                          <div><label style={reqLbl}>Age Max</label><input type="number" placeholder="65" value={reqForm.ageMax} onChange={e => setReqForm(f => ({ ...f, ageMax: e.target.value }))} style={reqInp} /></div>
                        </div>
                        <div><label style={reqLbl}>Union Status Required</label><select value={reqForm.unionStatus} onChange={e => setReqForm(f => ({ ...f, unionStatus: e.target.value }))} style={{ ...reqInp, backgroundColor: '#0f0f1a' }}><option value="">Any</option><option value="Union Only">Union Only</option><option value="Union Preferred">Union Preferred</option><option value="Non-Union OK">Non-Union OK</option></select></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div><label style={reqLbl}>Rate</label><input value={reqForm.rate} onChange={e => setReqForm(f => ({ ...f, rate: e.target.value }))} placeholder="e.g. $270/day" style={reqInp} /></div>
                          <div><label style={reqLbl}>Rate Notes</label><input value={reqForm.rateNotes} onChange={e => setReqForm(f => ({ ...f, rateNotes: e.target.value }))} placeholder="OT, meal penalty..." style={reqInp} /></div>
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: 'rgba(245,158,11,0.08)', padding: '14px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <input type="checkbox" checked={reqForm.notifyAll} onChange={e => setReqForm(f => ({ ...f, notifyAll: e.target.checked }))} style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>Notify all registered agencies</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>All active agencies receive an immediate notification.{reqForm.shootRegionCode ? ` Only performers in/near ${getRegionName(reqForm.shootRegionCode)} will be suggested.` : ''}</div>
                          </div>
                        </label>
                        {/* Summary */}
                        <div style={{ backgroundColor: '#1a1a2e', borderRadius: '10px', padding: '14px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#F59E0B', marginBottom: '10px' }}>Request Summary</div>
                          {[
                            ['Production', reqForm.productionName || '—'],
                            ['Type', reqForm.projectType || '—'],
                            ['Region', reqForm.shootRegionCode ? getRegionName(reqForm.shootRegionCode) : '—'],
                            ['City', reqForm.location || '—'],
                            ['Shoot Date', reqForm.shootDate || '—'],
                            ['Role', reqForm.roleType],
                            ['Count', reqForm.performersNeeded],
                            ['Gender', reqForm.genderNeeded],
                            ['Union', reqForm.unionStatus || 'Any'],
                            ['Rate', reqForm.rate || '—'],
                          ].map(([k, v]) => (
                            <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{ color: '#9ca3af' }}>{k}</span>
                              <span style={{ fontWeight: '600', color: 'white' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', gap: '8px' }}>
                      <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ padding: '10px 20px', backgroundColor: step === 0 ? '#374151' : '#1a1a2e', color: step === 0 ? '#6b7280' : 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: step === 0 ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}>Back</button>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {step === 4 && <button onClick={saveTemplate} style={{ padding: '10px 16px', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>💾 Save Template</button>}
                        {step < 4
                          ? <button onClick={() => { if (step === 0 && !reqForm.productionName) return; if (step === 0 && !reqForm.shootDate) return; setStep(s => s + 1) }} style={{ padding: '10px 24px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '14px' }}>Next →</button>
                          : <button onClick={submitRequest} disabled={submitting} style={{ padding: '10px 24px', backgroundColor: submitting ? '#374151' : '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '14px' }}>{submitting ? 'Sending...' : 'Send Request'}</button>
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Request list */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {(['open','closed'] as const).map(t => (
                <button key={t} onClick={() => { setReqTab(t); loadRequests() }} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', backgroundColor: reqTab === t ? '#F59E0B' : '#1e1e35', color: reqTab === t ? '#1a1a2e' : '#9ca3af' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {reqLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              : requests.map(req => {
                  const pct = req.performers_needed > 0 ? (req.confirmedCount / req.performers_needed) * 100 : 0
                  const days = daysUntil(req.shoot_date)
                  return (
                    <div key={req.id} style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>{req.production_name}</span>
                            <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: days <= 2 ? 'rgba(239,68,68,0.15)' : days <= 7 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: days <= 2 ? '#ef4444' : days <= 7 ? '#F59E0B' : '#22c55e' }}>
                              {days <= 0 ? 'TODAY' : `${days}d`}
                            </span>
                            {req.shoot_region_code && <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>📍 {getRegionName(req.shoot_region_code)}</span>}
                          </div>
                          <div style={{ fontSize: '13px', color: '#9ca3af' }}>{req.role_type} · {fmtDate(req.shoot_date)}</div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span onClick={() => { setKanbanRequest(req); openKanban(req); setActiveTab('Kanban') }} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', backgroundColor: '#374151', color: '#9ca3af', cursor: 'pointer' }}>{req.submissionCount} submitted</span>
                            {req.shortlistedCount > 0 && <span onClick={() => { setKanbanRequest(req); openKanban(req); setActiveTab('Kanban') }} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', cursor: 'pointer' }}>⭐ {req.shortlistedCount}</span>}
                            {req.confirmedCount > 0 && <span onClick={() => { setKanbanRequest(req); openKanban(req); setActiveTab('Kanban') }} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer' }}>✅ {req.confirmedCount}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setKanbanRequest(req); openKanban(req); setActiveTab('Kanban') }} style={{ padding: '7px 14px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>Manage</button>
                        </div>
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{req.confirmedCount}/{req.performers_needed} filled</div>
                        <div style={{ backgroundColor: '#374151', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: pct >= 100 ? '#22c55e' : '#F59E0B', width: `${Math.min(100, pct)}%`, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* ── KANBAN ────────────────────────────────────────────────────── */}
        {activeTab === 'Kanban' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: 0 }}>Submissions</h1>
              {kanbanRequest && <span style={{ fontSize: '14px', color: '#F59E0B', fontWeight: '600' }}>— {kanbanRequest.production_name}</span>}
            </div>

            {!kanbanRequest ? (
              <div>
                <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>Select a casting request to view its Kanban board:</div>
                {requests.map(req => (
                  <div key={req.id} onClick={() => openKanban(req)} style={{ backgroundColor: '#1e1e35', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'white' }}>{req.production_name}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{req.role_type} · {fmtDate(req.shoot_date)}</div>
                    </div>
                    <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '700' }}>{req.submissionCount} submissions →</span>
                  </div>
                ))}
                {requests.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No open requests. Create one in Casting Requests.</div>}
              </div>
            ) : kanbanLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Loading submissions...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', alignItems: 'start' }}>
                {KANBAN_COLS.map(col => {
                  const colSubs = kanbanSubs.filter(s => s.status === col.key)
                  return (
                    <div key={col.key}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleKanbanDrop(e, col.key)}
                      style={{ backgroundColor: '#1a1a2e', borderRadius: '12px', padding: '12px', minHeight: '120px', border: `1px solid ${col.color}22` }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: col.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                        {col.label} <span style={{ fontWeight: '400', color: '#6b7280' }}>({colSubs.length})</span>
                      </div>
                      {colSubs.map(sub => (
                        <KanbanCard key={sub.id} sub={sub} onMove={moveKanban} />
                      ))}
                      {colSubs.length === 0 && <div style={{ color: '#374151', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>—</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── UNION MEMBERS ─────────────────────────────────────────────── */}
        {activeTab === 'Union' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 8px' }}>Union Members</h1>
            <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#d97706', marginBottom: '20px' }}>
              Union Full Members (👑) and Apprentice Members (⭐) have preference of engagement on UBCP and ACTRA productions. These performers are always suggested first for all relevant casting requests.
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setUnionTierFilter('full')} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', backgroundColor: unionTierFilter === 'full' ? '#F59E0B' : '#1e1e35', color: unionTierFilter === 'full' ? '#1a1a2e' : '#9ca3af' }}>👑 Full Members</button>
              <button onClick={() => setUnionTierFilter('apprentice')} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', backgroundColor: unionTierFilter === 'apprentice' ? '#F59E0B' : '#1e1e35', color: unionTierFilter === 'apprentice' ? '#1a1a2e' : '#9ca3af' }}>⭐ Apprentice Members</button>
              <button onClick={() => setUnionTierFilter('bg')} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', backgroundColor: unionTierFilter === 'bg' ? '#F59E0B' : '#1e1e35', color: unionTierFilter === 'bg' ? '#1a1a2e' : '#9ca3af' }}>🟢 Extra Members</button>
              <select value={browseRegion} onChange={e => { setBrowseRegion(e.target.value) }} style={{ ...inp, marginLeft: 'auto', minWidth: '200px' }}>
                <option value="">All regions</option>
                {FILM_REGION_LIST.map(r => <option key={r.code} value={r.code}>{r.provinceCode} — {r.name}</option>)}
              </select>
            </div>

            {unionLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
              : (
                <>
                  <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '12px' }}>{unionPerformers.length} {unionTierFilter === 'full' ? 'Full Members' : unionTierFilter === 'apprentice' ? 'Apprentice Members' : 'Extra Members'} in system</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                    {unionPerformers.map(p => <PerformerCard key={p.user_id} p={p} onClick={() => setQuickView(p)} />)}
                  </div>
                  {unionPerformers.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', backgroundColor: '#1e1e35', borderRadius: '14px' }}>No {unionTierFilter} members found{browseRegion ? ' in this region' : ''}.</div>}
                </>
              )
            }
          </div>
        )}

        {/* ── DIGITAL SIGN-IN ───────────────────────────────────────────── */}
        {(activeTab as string) === 'Sign-In' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Digital Sign-In QR</h1>

            {/* Create new sign-in */}
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 14px' }}>Generate New Sign-In QR Code</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div><label style={reqLbl}>Shoot Date *</label><input type="date" value={newSigninDate} onChange={e => setNewSigninDate(e.target.value)} style={reqInp} /></div>
                <div><label style={reqLbl}>Location Name</label><input value={newSigninLocation} onChange={e => setNewSigninLocation(e.target.value)} placeholder="e.g. Studio A" style={reqInp} /></div>
                <div>
                  <label style={reqLbl}>Link to Casting Request (optional)</label>
                  <select value={newSigninRequest} onChange={e => setNewSigninRequest(e.target.value)} style={{ ...reqInp, backgroundColor: '#0f0f1a' }}>
                    <option value="">None — standalone sign-in</option>
                    {requests.map(r => <option key={r.id} value={r.id}>{r.production_name} · {r.shoot_date}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={createSignin} disabled={!newSigninDate} style={{ marginTop: '14px', padding: '10px 24px', backgroundColor: newSigninDate ? '#F59E0B' : '#374151', color: newSigninDate ? '#1a1a2e' : '#6b7280', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: newSigninDate ? 'pointer' : 'not-allowed', fontSize: '14px' }}>
                Generate QR Code
              </button>
            </div>

            {/* QR result */}
            {createdQR && (
              <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '24px', border: '1px solid rgba(34,197,94,0.3)', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔲</div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: 'white', marginBottom: '6px' }}>QR Code Generated!</div>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>Share this link with your AD. Performers scan to check in.</div>
                <div style={{ backgroundColor: '#0f0f1a', borderRadius: '8px', padding: '10px', fontFamily: 'monospace', fontSize: '13px', color: '#F59E0B', marginBottom: '14px', wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}${createdQR.url}` : createdQR.url}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => navigator.clipboard?.writeText(typeof window !== 'undefined' ? `${window.location.origin}${createdQR.url}` : createdQR.url)} style={{ padding: '8px 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>📋 Copy Link</button>
                  <button onClick={() => viewSigninDetail(createdQR.token)} style={{ padding: '8px 16px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>👁️ View Arrivals</button>
                </div>
              </div>
            )}

            {/* Arrivals list */}
            {signinDetail && (
              <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: 0 }}>Arrival List</h2>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#22c55e' }}>{signinDetail.totalSignedIn}/{signinDetail.totalConfirmed}</div>
                </div>
                {(signinDetail.performers || []).map((p: any) => (
                  <div key={p.performer_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '20px' }}>{p.signed_in ? '✅' : '⏳'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{p.name}</div>
                      {p.signed_in_at && <div style={{ fontSize: '12px', color: '#22c55e' }}>Checked in {new Date(p.signed_in_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}</div>}
                      {!p.signed_in && <div style={{ fontSize: '12px', color: '#9ca3af' }}>Not yet arrived</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
        {activeTab === 'Analytics' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Analytics</h1>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              {[
                { title: 'Total Requests Created', value: '—', sub: 'All time' },
                { title: 'Avg. Submissions per Request', value: '—', sub: 'Based on open requests' },
                { title: 'Confirmation Rate', value: '—', sub: 'Confirmed / Submitted' },
                { title: 'Most Active Region', value: '—', sub: 'By performer count' },
              ].map(card => (
                <div key={card.title} style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>{card.title}</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#F59E0B' }}>{card.value}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{card.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px', backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '14px' }}>Detailed analytics coming soon — charts for bookings per month, submission rates, and regional performance.</div>
            </div>
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────── */}
        {activeTab === 'Settings' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 20px' }}>Settings</h1>
            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 14px' }}>Request Templates</h2>
              {templates.length === 0
                ? <div style={{ color: '#9ca3af', fontSize: '13px' }}>No templates saved yet. Use "Save Template" when creating a request.</div>
                : templates.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontWeight: '600', color: 'white', fontSize: '14px' }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setReqForm(t.template_data); setStep(0) }} style={{ fontSize: '12px', padding: '5px 12px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Use</button>
                        <button onClick={async () => { await fetch('/api/casting/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id }) }); loadTemplates() }} style={{ fontSize: '12px', padding: '5px 12px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Delete</button>
                      </div>
                    </div>
                  ))
              }
            </div>

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

            <div style={{ backgroundColor: '#1e1e35', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={signOut} style={{ padding: '10px 20px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', background: 'transparent', color: '#ef4444', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Sign Out</button>
            </div>
          </div>
        )}

      </div>

      {/* ── PERFORMER QUICK VIEW MODAL ──────────────────────────────────────── */}
      {quickView && (
        <div onClick={() => setQuickView(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#1e1e35', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ width: '80px', height: '100px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#374151', position: 'relative' }}>
                {quickView.headshot_url
                  ? <Image src={quickView.headshot_url} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>👤</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '800', fontSize: '18px', color: 'white', marginBottom: '4px' }}>{pName(quickView)}</div>
                <div style={{ fontSize: '20px' }}>{unionBadge(quickView.union_status)}</div>
                <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '600' }}>{unionTierLabel(quickView.union_status)}</div>
                {quickView.film_region_code && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>📍 {getRegionName(quickView.film_region_code)}</div>}
                {quickView.agencies && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{quickView.agencies.name}</div>}
              </div>
              <button onClick={() => setQuickView(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {[
                ['Gender', quickView.gender],
                ['Age', quickView.age ? `${quickView.age}` : null],
                ['Height', quickView.height_cm ? `${quickView.height_cm} cm` : null],
                ['Hair', quickView.hair_color],
                ['Eyes', quickView.eye_color],
                ['Ethnicity', quickView.ethnicity],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={String(k)} style={{ backgroundColor: '#1a1a2e', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '2px' }}>{k}</div>
                  <div style={{ color: 'white', fontWeight: '600' }}>{v}</div>
                </div>
              ))}
            </div>
            {quickView.special_skills?.length ? (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: '600' }}>Special Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {quickView.special_skills.map(s => (
                    <span key={s} style={{ padding: '3px 8px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: '20px', fontSize: '12px' }}>{s}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {/* Place a Hold */}
            <div style={{ backgroundColor: '#1a1a2e', borderRadius: '12px', padding: '14px', marginBottom: '12px', border: '1px solid rgba(139,92,246,0.25)' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#8b5cf6', marginBottom: '10px' }}>Place a Hold</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Start Date</label>
                  <input type="date" value={holdStart} onChange={e => setHoldStart(e.target.value)} style={{ width: '100%', padding: '7px 9px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '12px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>End Date</label>
                  <input type="date" value={holdEnd} onChange={e => setHoldEnd(e.target.value)} style={{ width: '100%', padding: '7px 9px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '12px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <input value={holdProduction} onChange={e => setHoldProduction(e.target.value)} placeholder="Production name (optional)" style={{ width: '100%', padding: '7px 9px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '12px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', boxSizing: 'border-box', marginBottom: '6px' }} />
              <input value={holdNote} onChange={e => setHoldNote(e.target.value)} placeholder="Note (optional)" style={{ width: '100%', padding: '7px 9px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '12px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
              <button onClick={placeHold} disabled={holdSubmitting || !holdStart || !holdEnd} style={{ width: '100%', padding: '8px', backgroundColor: holdSubmitting || !holdStart || !holdEnd ? '#374151' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '13px', cursor: holdSubmitting || !holdStart || !holdEnd ? 'not-allowed' : 'pointer' }}>
                {holdSubmitting ? 'Placing…' : 'Place Hold'}
              </button>
              {holdMsg && <div style={{ fontSize: '12px', marginTop: '6px', color: holdMsg.includes('!') ? '#22c55e' : '#ef4444' }}>{holdMsg}</div>}
            </div>

            {/* Existing holds list */}
            {holdsLoading ? (
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>Loading holds…</div>
            ) : holds.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Holds & Bookings</div>
                {holds.map(h => (
                  <div key={h.id} style={{ backgroundColor: '#1a1a2e', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px', border: `1px solid ${h.status === 'confirmed' ? 'rgba(59,130,246,0.3)' : 'rgba(139,92,246,0.3)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: h.status === 'confirmed' ? '#3b82f6' : '#8b5cf6' }}>{h.status === 'confirmed' ? '● Confirmed' : '○ Pending'}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{h.start_date === h.end_date ? h.start_date : `${h.start_date} – ${h.end_date}`}</div>
                        {h.production && <div style={{ fontSize: '11px', color: '#e5e7eb' }}>{h.production}</div>}
                      </div>
                      {h.status !== 'cancelled' && (
                        <button onClick={() => cancelHold(h.id)} style={{ fontSize: '10px', padding: '3px 8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', flexShrink: 0 }}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setQuickView(null); router.push(`/profile/${quickView.user_id}`) }} style={{ width: '100%', padding: '11px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
              View Full Profile →
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const lbl: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '5px' }
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '13px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', boxSizing: 'border-box' }
const reqLbl: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '5px' }
const reqInp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px', color: 'white', backgroundColor: '#0f0f1a', outline: 'none', boxSizing: 'border-box' }
