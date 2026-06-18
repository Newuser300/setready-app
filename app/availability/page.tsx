'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'
import { createClient } from '@/utils/supabase/client'

type AvailEntry = { date: string; status: string; notes?: string | null }

const STATUS_BG: Record<string, string> = {
  available: 'rgba(34,197,94,0.25)',
  unavailable: 'rgba(239,68,68,0.25)',
  booked: 'rgba(59,130,246,0.25)',
  morning: 'rgba(245,158,11,0.15)',
  afternoon: 'rgba(245,158,11,0.28)',
}
const STATUS_BORDER: Record<string, string> = {
  available: '#22c55e',
  unavailable: '#ef4444',
  booked: '#3b82f6',
  morning: '#f59e0b',
  afternoon: '#f59e0b',
}
const STATUS_ICON: Record<string, string> = {
  available: '🟢',
  unavailable: '🔴',
  booked: '🔵',
  morning: '🌅',
  afternoon: '🌙',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDatesInRange(start: string, end: string): string[] {
  const a = new Date(start + 'T12:00:00')
  const b = new Date(end + 'T12:00:00')
  const from = a <= b ? a : b
  const to = a <= b ? b : a
  const dates: string[] = []
  const cur = new Date(from)
  while (cur <= to) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export default function AvailabilityPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'' | 'saved' | 'error'>('')
  const [authReady, setAuthReady] = useState(false)

  // Drag refs (avoids stale closures in event listeners)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<string | null>(null)
  const dragEndRef = useRef<string | null>(null)
  const dragStatusRef = useRef<string | null>('available')
  const dragMovedRef = useRef(false)
  const availabilityRef = useRef<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [highlightedDates, setHighlightedDates] = useState<Set<string>>(new Set())

  // Day popup
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [popupNote, setPopupNote] = useState('')
  const [popupStatus, setPopupStatus] = useState('')
  const [savingPopup, setSavingPopup] = useState(false)

  // Active Booking Mode
  const [activeBookingMode, setActiveBookingMode] = useState(false)
  const [bookingModeLoading, setBookingModeLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // iCal
  const [icalToken, setIcalToken] = useState('')
  const [userId, setUserId] = useState('')
  const [showIcalSection, setShowIcalSection] = useState(false)
  const [showGcalModal, setShowGcalModal] = useState(false)
  const [gcalUrl, setGcalUrl] = useState('')
  const [importingGcal, setImportingGcal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // Next month count
  const [nextMonthCount, setNextMonthCount] = useState(-1) // -1 = not loaded

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const today = new Date().toISOString().slice(0, 10)
  const monthName = currentDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  const isCurrentMonth =
    currentYear === new Date().getFullYear() && currentMonth === new Date().getMonth()

  useEffect(() => { availabilityRef.current = availability }, [availability])

  // Auth guard
  useEffect(() => {
    localStorage.setItem('sr-availability-touched', '1')
    ;(async () => {
      const bc = createClient()
      const { data: { user }, error } = await bc.auth.getUser()
      if (error || !user) { router.push('/auth/sign-in'); return }
      setUserId(user.id)
      setAuthReady(true)
      loadUserData()
    })()
  }, [])

  useEffect(() => {
    if (authReady) {
      fetchAvailability()
      fetchNextMonthCount()
    }
  }, [monthStr, authReady])

  // Sync nextMonthCount when month changes
  useEffect(() => {
    if (authReady) fetchNextMonthCount()
  }, [currentYear, currentMonth, authReady])

  const loadUserData = async () => {
    const res = await fetch('/api/availability/user-data', { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      setActiveBookingMode(d.active_booking_mode || false)
      setIcalToken(d.ical_token || '')
    }
  }

  const fetchAvailability = async () => {
    setLoading(true)
    const res = await fetch(`/api/availability?month=${monthStr}`, { credentials: 'include' })
    if (res.status === 401) { router.push('/auth/sign-in'); return }
    const data: AvailEntry[] = await res.json()
    const sm: Record<string, string> = {}
    const nm: Record<string, string> = {}
    data.forEach(a => { sm[a.date] = a.status; if (a.notes) nm[a.date] = a.notes })
    setAvailability(sm)
    setNotes(nm)
    setLoading(false)
  }

  const fetchNextMonthCount = async () => {
    const next = new Date(currentYear, currentMonth + 1, 1)
    const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    const res = await fetch(`/api/availability?month=${nextStr}`, { credentials: 'include' })
    if (res.ok) {
      const data: AvailEntry[] = await res.json()
      setNextMonthCount(data.length)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3200)
  }

  // ── Calendar grid helpers ─────────────────────────────────────────────────

  const getDaysInMonth = () => {
    const first = new Date(currentYear, currentMonth, 1)
    const startOffset = (first.getDay() + 6) % 7 // Monday-first
    const total = new Date(currentYear, currentMonth + 1, 0).getDate()
    const days: (string | null)[] = []
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let i = 1; i <= total; i++) {
      days.push(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`)
    }
    return days
  }

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const allDatesThisMonth = useMemo(() =>
    Array.from({ length: daysInCurrentMonth }, (_, i) => {
      const d = new Date(currentYear, currentMonth, i + 1)
      return d.toISOString().slice(0, 10)
    }),
    [currentYear, currentMonth, daysInCurrentMonth]
  )

  const stats = useMemo(() => {
    const entries = allDatesThisMonth.map(d => availability[d]).filter(Boolean)
    return {
      available: entries.filter(s => s === 'available' || s === 'morning' || s === 'afternoon').length,
      unavailable: entries.filter(s => s === 'unavailable').length,
      booked: entries.filter(s => s === 'booked').length,
      notSet: daysInCurrentMonth - entries.length,
    }
  }, [availability, allDatesThisMonth, daysInCurrentMonth])

  // ── Save helpers ──────────────────────────────────────────────────────────

  const saveOne = async (date: string, status: string | null, note?: string) => {
    setSaving(true)
    setSaveStatus('')
    try {
      if (status === null) {
        await fetch('/api/availability', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ date }),
        })
      } else {
        await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ date, status, notes: note ?? null }),
        })
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const saveBulk = useCallback(async (dates: string[], status: string | null) => {
    setSaving(true)
    setSaveStatus('')
    try {
      if (status === null) {
        for (const date of dates) {
          await fetch('/api/availability', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ date }),
          })
        }
      } else {
        await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ bulk: true, dates, status }),
        })
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }, [])

  // ── Drag selection ────────────────────────────────────────────────────────

  const applyDragSelection = useCallback(async () => {
    if (!dragMovedRef.current) {
      // Single-cell press with no movement → let onClick handle it as a click
      isDraggingRef.current = false
      setIsDragging(false)
      setHighlightedDates(new Set())
      return
    }

    const start = dragStartRef.current
    const end = dragEndRef.current
    const status = dragStatusRef.current
    if (!start || !end) {
      isDraggingRef.current = false
      setIsDragging(false)
      setHighlightedDates(new Set())
      return
    }

    const dates = getDatesInRange(start, end).filter(d => d >= today)
    if (dates.length > 0) {
      const newAvail = { ...availabilityRef.current }
      dates.forEach(d => {
        if (status === null) delete newAvail[d]
        else newAvail[d] = status
      })
      setAvailability(newAvail)
      await saveBulk(dates, status)
    }

    isDraggingRef.current = false
    setIsDragging(false)
    setHighlightedDates(new Set())
  }, [today, saveBulk])

  useEffect(() => {
    const onUp = () => { if (isDraggingRef.current) applyDragSelection() }
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [applyDragSelection])

  const handleCellMouseDown = (e: React.MouseEvent | React.TouchEvent, dateStr: string) => {
    if (dateStr < today) return
    e.preventDefault()
    const cur = availabilityRef.current[dateStr]
    let next: string | null
    if (!cur) next = 'available'
    else if (cur === 'available') next = 'unavailable'
    else next = null

    isDraggingRef.current = true
    dragStartRef.current = dateStr
    dragEndRef.current = dateStr
    dragStatusRef.current = next
    dragMovedRef.current = false
    setIsDragging(true)
    setHighlightedDates(new Set([dateStr]))
  }

  const handleCellMouseEnter = (dateStr: string) => {
    if (!isDraggingRef.current || dateStr < today) return
    if (dateStr !== dragStartRef.current) dragMovedRef.current = true
    dragEndRef.current = dateStr
    const range = getDatesInRange(dragStartRef.current!, dateStr)
    setHighlightedDates(new Set(range.filter(d => d >= today)))
  }

  const handleCellClick = (dateStr: string) => {
    if (dateStr < today) return
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    setSelectedDay(dateStr)
    setPopupStatus(availability[dateStr] || '')
    setPopupNote(notes[dateStr] || '')
  }

  // ── Presets ───────────────────────────────────────────────────────────────

  const openForWork = async () => {
    const dates = allDatesThisMonth.filter(d => d >= today && availability[d] !== 'booked')
    const newAvail = { ...availability }
    dates.forEach(d => { newAvail[d] = 'available' })
    setAvailability(newAvail)
    await saveBulk(dates, 'available')
    showToast('✅ All remaining days this month set to Available')
  }

  const weekdayWorker = async () => {
    const dates = allDatesThisMonth.filter(d => d >= today && availability[d] !== 'booked')
    const weekdays = dates.filter(d => { const dow = new Date(d + 'T12:00:00').getDay(); return dow !== 0 && dow !== 6 })
    const weekends = dates.filter(d => { const dow = new Date(d + 'T12:00:00').getDay(); return dow === 0 || dow === 6 })
    const newAvail = { ...availability }
    weekdays.forEach(d => { newAvail[d] = 'available' })
    weekends.forEach(d => { newAvail[d] = 'unavailable' })
    setAvailability(newAvail)
    setSaving(true)
    await Promise.all([
      weekdays.length > 0 && saveBulk(weekdays, 'available'),
      weekends.length > 0 && saveBulk(weekends, 'unavailable'),
    ])
    setSaving(false)
    showToast('✅ Weekdays set to Available, weekends set to Unavailable')
  }

  const weekendsOnly = async () => {
    const dates = allDatesThisMonth.filter(d => d >= today && availability[d] !== 'booked')
    const weekdays = dates.filter(d => { const dow = new Date(d + 'T12:00:00').getDay(); return dow !== 0 && dow !== 6 })
    const weekends = dates.filter(d => { const dow = new Date(d + 'T12:00:00').getDay(); return dow === 0 || dow === 6 })
    const newAvail = { ...availability }
    weekdays.forEach(d => { newAvail[d] = 'unavailable' })
    weekends.forEach(d => { newAvail[d] = 'available' })
    setAvailability(newAvail)
    setSaving(true)
    await Promise.all([
      weekdays.length > 0 && saveBulk(weekdays, 'unavailable'),
      weekends.length > 0 && saveBulk(weekends, 'available'),
    ])
    setSaving(false)
    showToast('✅ Weekends set to Available')
  }

  const clearMonth = async () => {
    const dates = allDatesThisMonth.filter(d => d >= today && availability[d] !== 'booked')
    const newAvail = { ...availability }
    dates.forEach(d => { delete newAvail[d] })
    setAvailability(newAvail)
    await saveBulk(dates, null)
    showToast('✅ Month cleared')
  }

  // ── Copy previous month ───────────────────────────────────────────────────

  const copyPreviousMonth = async () => {
    const prevDate = new Date(currentYear, currentMonth - 1, 1)
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    const res = await fetch(`/api/availability?month=${prevMonth}`, { credentials: 'include' })
    if (!res.ok) return
    const prevData: AvailEntry[] = await res.json()
    const prevMap: Record<string, string> = {}
    prevData.forEach(a => { prevMap[a.date] = a.status })

    const newAvail = { ...availability }
    const toSet: { date: string; status: string }[] = []
    allDatesThisMonth.forEach(d => {
      if (newAvail[d] === 'booked') return
      const prevDay = d.replace(monthStr, prevMonth)
      const st = prevMap[prevDay]
      if (st && st !== 'booked') { newAvail[d] = st; toSet.push({ date: d, status: st }) }
    })

    if (!toSet.length) { showToast('No previous month data to copy.'); return }
    setAvailability(newAvail)
    setSaving(true)
    for (const { date, status } of toSet) {
      await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date, status }),
      })
    }
    setSaving(false)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(''), 2000)
    showToast(`📋 Last month's availability copied to ${monthName}`)
  }

  // ── Active Booking Mode ───────────────────────────────────────────────────

  const toggleBookingMode = async () => {
    setBookingModeLoading(true)
    const newMode = !activeBookingMode
    try {
      if (newMode) {
        const dates: string[] = []
        const now = new Date()
        for (let i = 0; i < 60; i++) {
          const d = new Date(now)
          d.setDate(now.getDate() + i)
          dates.push(d.toISOString().slice(0, 10))
        }
        await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ bulk: true, dates, status: 'available' }),
        })
        await fetchAvailability()
      }
      await fetch('/api/availability/booking-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: newMode }),
      })
      setActiveBookingMode(newMode)
      showToast(newMode ? '🎬 Active Booking Mode ON — 60 days set to Available' : '⏸ Active Booking Mode disabled')
    } finally {
      setBookingModeLoading(false)
    }
  }

  // ── Popup save ────────────────────────────────────────────────────────────

  const savePopup = async () => {
    if (!selectedDay) return
    setSavingPopup(true)
    const newAvail = { ...availability }
    const newNotes = { ...notes }
    const statusToSave = popupStatus === 'clear' ? null : popupStatus || null
    if (!statusToSave) { delete newAvail[selectedDay] } else { newAvail[selectedDay] = statusToSave }
    if (popupNote.trim()) newNotes[selectedDay] = popupNote.trim()
    else delete newNotes[selectedDay]
    setAvailability(newAvail)
    setNotes(newNotes)
    await saveOne(selectedDay, statusToSave, popupNote.trim() || undefined)
    setSavingPopup(false)
    setSelectedDay(null)
  }

  // ── iCal ─────────────────────────────────────────────────────────────────

  const copyIcalLink = async () => {
    let token = icalToken
    if (!token) {
      const res = await fetch('/api/availability/ical-token', { credentials: 'include' })
      if (res.ok) { const d = await res.json(); token = d.token; setIcalToken(d.token) }
    }
    const url = `${window.location.origin}/api/availability/ical?userId=${userId}&token=${token}`
    await navigator.clipboard.writeText(url)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const resetIcalLink = async () => {
    const ok = window.confirm(
      'Reset your calendar link?\n\nYour current link will stop working immediately. Anyone you shared it with — and any calendar app where you added it — will lose access until you add the new link.'
    )
    if (!ok) return
    const res = await fetch('/api/availability/ical-token', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      setIcalToken(d.token)
      showToast('🔑 Calendar link reset — your old link no longer works. Copy and re-add the new one.')
    } else {
      showToast('❌ Could not reset the link. Please try again.')
    }
  }

  const importGcal = async () => {
    if (!gcalUrl.trim()) return
    setImportingGcal(true)
    try {
      const res = await fetch('/api/availability/import-gcal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: gcalUrl.trim() }),
      })
      if (res.ok) {
        const d = await res.json()
        showToast(`✅ Imported ${d.imported} busy days from Google Calendar`)
        fetchAvailability()
        setShowGcalModal(false)
        setGcalUrl('')
      } else {
        showToast('❌ Failed to import. Check the URL and try again.')
      }
    } finally {
      setImportingGcal(false)
    }
  }

  if (!authReady) return <LoadingScreen />

  const days = getDaysInMonth()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', paddingBottom: '80px' }}>

      {/* ── Header ── */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '16px 20px', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '6px', display: 'block', padding: 0 }}
              >
                ← Dashboard
              </button>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 2px', color: 'white' }}>📅 Availability Calendar</h1>
              <p style={{ color: '#9ca3af', margin: 0, fontSize: '13px', lineHeight: '1.4' }}>
                Keep your calendar updated so agents and casting directors can find you
              </p>
              <p style={{ color: '#22c55e', margin: '6px 0 0', fontSize: '12px', fontWeight: '600', lineHeight: '1.4' }}>
                ✓ Dates save automatically when you select them — no save button needed
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '24px' }}>
              {saving && (
                <span style={{ fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B', animation: 'pulse 1s infinite' }} />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && !saving && <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ Saved</span>}
              {saveStatus === 'error' && <span style={{ fontSize: '12px', color: '#ef4444' }}>✗ Error</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '12px 12px' }}>

        {/* ── Active Booking Mode Banner ── */}
        {activeBookingMode && (
          <div style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: '1px' }}>🎬</span>
            <p style={{ color: '#F59E0B', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
              <strong>You are in Active Booking Mode.</strong> Your profile shows as actively seeking work. Agents and casting directors can see you are available for the next 60 days.
            </p>
          </div>
        )}

        {/* ── Active Booking Mode Toggle ── */}
        <div style={{ backgroundColor: '#1e1e35', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', border: `1px solid ${activeBookingMode ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.07)'}` }}>
          <div>
            <div style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>🎬 Active Booking Mode</div>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>Sets next 60 days to Available. Shows you're actively seeking work.</div>
          </div>
          <button
            onClick={toggleBookingMode}
            disabled={bookingModeLoading}
            style={{ padding: '8px 18px', borderRadius: '20px', border: 'none', backgroundColor: activeBookingMode ? '#F59E0B' : '#2a2a3e', color: activeBookingMode ? '#1a1a2e' : '#9ca3af', fontWeight: '800', fontSize: '13px', cursor: bookingModeLoading ? 'not-allowed' : 'pointer', flexShrink: 0, minWidth: '56px' }}
          >
            {bookingModeLoading ? '...' : activeBookingMode ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* ── Stats Strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
          {[
            { icon: '✅', count: stats.available, label: 'Available', color: '#22c55e' },
            { icon: '❌', count: stats.unavailable, label: 'Unavailable', color: '#ef4444' },
            { icon: '📋', count: stats.booked, label: 'Booked', color: '#3b82f6' },
            { icon: '⬜', count: stats.notSet, label: 'Not Set', color: '#6b7280' },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: '#1e1e35', borderRadius: '10px', padding: '10px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{s.icon} {s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Next Month Note ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 2px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Next month: {nextMonthCount < 0 ? '...' : nextMonthCount} day{nextMonthCount !== 1 ? 's' : ''} set
          </span>
          {nextMonthCount === 0 && (
            <button
              onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
              style={{ fontSize: '12px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', fontWeight: '700' }}
            >
              ⚠️ Set next month →
            </button>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '12px', scrollbarWidth: 'none' }}>
          {[
            { label: '🟢 Open For Work', fn: openForWork },
            { label: '📆 Weekday Worker', fn: weekdayWorker },
            { label: '🌙 Weekends Only', fn: weekendsOnly },
            { label: '📋 Copy Last Month', fn: copyPreviousMonth },
            { label: '🗑 Clear Month', fn: clearMonth },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.fn}
              style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.08)', color: '#F59E0B', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '10px 14px', backgroundColor: '#1e1e35', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[['🟢', 'Available'], ['🔴', 'Unavailable'], ['🔵', 'Booked'], ['🌅', 'Morning'], ['🌙', 'Afternoon'], ['⬜', 'Not Set']].map(([icon, label]) => (
            <span key={label} style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{icon} {label}</span>
          ))}
        </div>

        {/* ── Month Navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
          <button
            onClick={() => !isCurrentMonth && setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
            disabled={isCurrentMonth}
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: isCurrentMonth ? 'transparent' : '#1e1e35', color: isCurrentMonth ? '#3a3a4e' : 'white', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >◀</button>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '20px', minWidth: '200px', textAlign: 'center' }}>{monthName}</span>
          <button
            onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1e1e35', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >▶</button>
        </div>

        {/* ── Calendar Grid ── */}
        <div
          style={{ backgroundColor: '#1a1a2e', borderRadius: '16px', padding: '12px', marginBottom: '16px', userSelect: 'none', border: '1px solid rgba(255,255,255,0.05)' }}
          onMouseLeave={() => { if (isDraggingRef.current) { dragEndRef.current = dragStartRef.current; setHighlightedDates(new Set()) } }}
        >
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '8px' }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: i >= 5 ? '#F59E0B' : 'rgba(255,255,255,0.7)', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading calendar...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {days.map((dateStr, i) => {
                if (!dateStr) return <div key={`e-${i}`} />
                const status = availability[dateStr]
                const isToday = dateStr === today
                const isPast = dateStr < today
                const hasNote = !!notes[dateStr]
                const isHighlighted = highlightedDates.has(dateStr)
                const dow = new Date(dateStr + 'T12:00:00').getDay()
                const isWeekend = dow === 0 || dow === 6
                const dayNum = parseInt(dateStr.slice(8), 10)

                const bgColor = isPast ? '#18182a'
                  : isHighlighted ? (dragStatusRef.current ? STATUS_BG[dragStatusRef.current] || 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)')
                  : status ? STATUS_BG[status] || '#2a2a3e' : '#2a2a3e'

                const borderColor = isToday ? '#F59E0B'
                  : isHighlighted ? (dragStatusRef.current ? STATUS_BORDER[dragStatusRef.current] || '#F59E0B' : '#F59E0B')
                  : status ? STATUS_BORDER[status] || 'transparent' : 'transparent'

                return (
                  <div
                    key={dateStr}
                    data-date={dateStr}
                    onMouseDown={e => handleCellMouseDown(e, dateStr)}
                    onMouseEnter={() => handleCellMouseEnter(dateStr)}
                    onClick={() => handleCellClick(dateStr)}
                    onTouchStart={e => handleCellMouseDown(e, dateStr)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '7px',
                      border: `2px solid ${borderColor}`,
                      backgroundColor: bgColor,
                      cursor: isPast ? 'default' : 'pointer',
                      opacity: isPast ? 0.38 : 1,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.08s, border-color 0.08s',
                      minHeight: '40px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: isToday ? '900' : '500', color: isWeekend && !isPast ? '#F59E0B' : 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
                      {dayNum}
                    </span>
                    {status && !isPast && (
                      <span style={{ fontSize: '9px', lineHeight: 1, marginTop: '1px' }}>
                        {STATUS_ICON[status] || ''}
                      </span>
                    )}
                    {hasNote && !isPast && (
                      <span style={{ position: 'absolute', bottom: '2px', right: '3px', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#F59E0B', flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Calendar Sync Section ── */}
        <div style={{ backgroundColor: '#1e1e35', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => setShowIcalSection(s => !s)}
            style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>📅 Calendar Sync</span>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>{showIcalSection ? '▲' : '▼'}</span>
          </button>

          {showIcalSection && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: 'white', fontWeight: '600', fontSize: '13px', margin: '0 0 4px' }}>📤 Subscribe to Your SetReady Calendar</p>
                <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 10px', lineHeight: '1.5' }}>
                  Add this link to Google Calendar, Apple Calendar or Outlook to see your SetReady availability on your personal calendar.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, backgroundColor: '#0f0f1a', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {icalToken ? `/api/availability/ical?userId=${userId.slice(0, 8)}...&token=${icalToken.slice(0, 8)}...` : 'Click "Copy Link" to generate your personal URL'}
                  </div>
                  <button
                    onClick={copyIcalLink}
                    style={{ padding: '8px 14px', backgroundColor: copySuccess ? '#22c55e' : '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    {copySuccess ? '✓ Copied!' : 'Copy Link'}
                  </button>
                </div>
                {icalToken && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ color: '#6b7280', fontSize: '11px', margin: 0, lineHeight: '1.4', flex: 1, minWidth: '180px' }}>
                      Shared your link with the wrong person, or want to cut off access? Reset it — your old link stops working immediately.
                    </p>
                    <button
                      onClick={resetIcalLink}
                      style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Reset Link
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p style={{ color: 'white', fontWeight: '600', fontSize: '13px', margin: '0 0 6px' }}>📥 Import from Google Calendar</p>
                <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 8px' }}>Mark your Google Calendar busy times as Unavailable in SetReady automatically.</p>
                <button
                  onClick={() => setShowGcalModal(true)}
                  style={{ padding: '8px 16px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', color: '#3b82f6', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Import Google Calendar Busy Times →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Day Popup ── */}
      {selectedDay && (
        <div
          onClick={() => setSelectedDay(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#1e1e35', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', padding: '20px 20px 36px', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}
          >
            <div style={{ width: '40px', height: '4px', backgroundColor: '#3a3a4e', borderRadius: '2px', margin: '0 auto 16px' }} />
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div style={{ color: availability[selectedDay] ? STATUS_BORDER[availability[selectedDay]] || 'white' : '#6b7280', fontWeight: '700', fontSize: '15px', marginBottom: '16px' }}>
              {availability[selectedDay] ? `Currently: ${availability[selectedDay]}` : 'Currently: Not set'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: '🌕 All Day Available', val: 'available' },
                { label: '🌅 Morning Only (before 2pm)', val: 'morning' },
                { label: '🌙 Afternoon Only (after 2pm)', val: 'afternoon' },
                { label: '❌ Unavailable', val: 'unavailable' },
                { label: '🗑 Clear', val: 'clear' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setPopupStatus(opt.val)}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: `2px solid ${popupStatus === opt.val ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`, backgroundColor: popupStatus === opt.val ? 'rgba(245,158,11,0.15)' : '#2a2a3e', color: popupStatus === opt.val ? '#F59E0B' : 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📝 Note for this day (optional)
              </label>
              <textarea
                value={popupNote}
                onChange={e => setPopupNote(e.target.value.slice(0, 100))}
                placeholder="e.g. Available after 2pm, need 48hr notice, have car"
                rows={2}
                style={{ width: '100%', backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
              />
              <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right', marginTop: '2px' }}>{popupNote.length}/100</div>
            </div>

            <button
              onClick={savePopup}
              disabled={savingPopup}
              style={{ width: '100%', padding: '14px', backgroundColor: savingPopup ? '#3a3a4e' : '#F59E0B', color: savingPopup ? '#6b7280' : '#1a1a2e', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: savingPopup ? 'not-allowed' : 'pointer' }}
            >
              {savingPopup ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* ── Google Calendar Import Modal ── */}
      {showGcalModal && (
        <div onClick={() => setShowGcalModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#1e1e35', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', padding: '20px 20px 36px', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div style={{ width: '40px', height: '4px', backgroundColor: '#3a3a4e', borderRadius: '2px', margin: '0 auto 16px' }} />
            <h2 style={{ color: 'white', fontWeight: '700', fontSize: '18px', margin: '0 0 16px' }}>📥 Import from Google Calendar</h2>
            <div style={{ backgroundColor: '#0f0f1a', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '600', margin: '0 0 10px' }}>How to get your Google Calendar iCal URL:</p>
              {['Open Google Calendar on your computer', 'Click the three dots next to your calendar name', 'Click Settings and Sharing', 'Scroll to Integrate Calendar', 'Copy the Secret Address in iCal format'].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: '#F59E0B', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ color: '#9ca3af', fontSize: '13px' }}>{step}</span>
                </div>
              ))}
            </div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>Paste your iCal URL:</label>
            <input
              type="url"
              value={gcalUrl}
              onChange={e => setGcalUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/..."
              style={{ width: '100%', backgroundColor: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '13px', boxSizing: 'border-box', outline: 'none', marginBottom: '8px' }}
            />
            <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 12px' }}>Busy events will be marked as Unavailable in SetReady.</p>
            <button
              onClick={importGcal}
              disabled={importingGcal || !gcalUrl.trim()}
              style={{ width: '100%', padding: '14px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', opacity: importingGcal || !gcalUrl.trim() ? 0.5 : 1 }}
            >
              {importingGcal ? 'Importing...' : 'Import →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1e1e35', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '10px', padding: '12px 20px', color: 'white', fontSize: '14px', fontWeight: '600', zIndex: 99999, maxWidth: '92vw', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </div>
  )
}