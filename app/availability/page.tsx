'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'

const COLORS = {
  available: '#22c55e',
  unavailable: '#ef4444',
  booked: '#3b82f6',
  tentative: '#f59e0b',
  none: '#f3f4f6'
}

const STATUS_LABELS = {
  available: '🟢 Available',
  unavailable: '🔴 Unavailable',
  booked: '🔵 Booked',
  tentative: '🟡 Tentative',
  none: '⬜ Not Set'
}

export default function AvailabilityPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('') // '' | 'saved' | 'error'
  const [saveError, setSaveError] = useState('')
  const [authReady, setAuthReady] = useState(false)

  const month = currentDate.toISOString().slice(0, 7)

  // Auth guard — uses cookie-based client so server can read the same session
  useEffect(() => {
    const checkAuth = async () => {
      const { createBrowserClient } = await import('@supabase/ssr')
      const browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user }, error } = await browserClient.auth.getUser()
      if (error || !user) { router.push('/auth/sign-in'); return }
      setAuthReady(true)
    }
    checkAuth()
  }, [])

  // Only fetch once auth is confirmed
  useEffect(() => {
    if (authReady) fetchAvailability()
  }, [month, authReady])

  const fetchAvailability = async () => {
    setLoading(true)
    const res = await fetch(`/api/availability?month=${month}`, { credentials: 'include' })
    if (res.status === 401) { router.push('/auth/sign-in'); return }
    const data = await res.json()
    const map: Record<string, string> = {}
    data.forEach((a: any) => { map[a.date] = a.status })
    setAvailability(map)
    setLoading(false)
  }

  const toggleDay = async (dateStr: string) => {
    const today = new Date().toISOString().slice(0, 10)
    if (dateStr < today) return

    const current = availability[dateStr]
    const next: string | null = !current ? 'available'
      : current === 'available' ? 'unavailable'
      : null

    // Optimistic update
    const prev = { ...availability }
    const optimistic = { ...availability }
    if (next === null) { delete optimistic[dateStr] } else { optimistic[dateStr] = next }
    setAvailability(optimistic)

    setSaving(true)
    setSaveError('')
    console.log('Saving date:', dateStr, 'status:', next)

    try {
      if (next === null) {
        const res = await fetch('/api/availability', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ date: dateStr })
        })
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      } else {
        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ date: dateStr, status: next })
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Save failed: ${res.status}`)
        }
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 1500)
    } catch (err: any) {
      console.error('Save failed:', err)
      setAvailability(prev) // revert
      setSaveError('Failed to save. Please try again.')
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const bulkSet = async (status: string | null) => {
    const year = currentDate.getFullYear()
    const mon = currentDate.getMonth()
    const daysInMonth = new Date(year, mon + 1, 0).getDate()
    const todayStr = new Date().toISOString().slice(0, 10)
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, mon, i + 1)
      return d.toISOString().slice(0, 10)
    }).filter(d => d >= todayStr) // future dates only

    const prev = { ...availability }
    const optimistic = { ...availability }
    if (status === null) {
      dates.forEach(d => delete optimistic[d])
    } else {
      dates.forEach(d => { optimistic[d] = status })
    }
    setAvailability(optimistic)
    setSaving(true)
    setSaveError('')

    try {
      if (status === null) {
        for (const date of dates) {
          await fetch('/api/availability', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ date })
          })
        }
      } else {
        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ bulk: true, dates, status })
        })
        if (!res.ok) throw new Error('Bulk save failed')
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (err) {
      console.error('Bulk save error:', err)
      setAvailability(prev) // revert
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const mon = currentDate.getMonth()
    const first = new Date(year, mon, 1).getDay()
    const total = new Date(year, mon + 1, 0).getDate()
    const days: (string | null)[] = []
    for (let i = 0; i < first; i++) days.push(null)
    for (let i = 1; i <= total; i++) {
      const d = new Date(year, mon, i)
      days.push(d.toISOString().slice(0, 10))
    }
    return days
  }

  // ── Availability stats ────────────────────────────────────────────────────

  const monthName = currentDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  const today = new Date().toISOString().slice(0, 10)
  const days = getDaysInMonth()

  const { year: cYear, mon: cMon } = (() => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth()
    return { year: y, mon: m }
  })()
  const daysInCurrentMonth = new Date(cYear, cMon + 1, 0).getDate()
  const allDates = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const d = new Date(cYear, cMon, i + 1)
    return d.toISOString().slice(0, 10)
  })
  const availCount = allDates.filter(d => availability[d] === 'available').length
  const unavailCount = allDates.filter(d => availability[d] === 'unavailable').length
  const notSetCount = allDates.filter(d => !availability[d]).length

  // ── Weekdays / weekends helper ────────────────────────────────────────────

  async function setWeekdaysAvailableWeekendsUnavailable() {
    const newMap = { ...availability }
    const records: { date: string; status: string }[] = []
    allDates.forEach(d => {
      const dow = new Date(d + 'T12:00:00').getDay()
      const status = (dow === 0 || dow === 6) ? 'unavailable' : 'available'
      newMap[d] = status
      records.push({ date: d, status })
    })
    setAvailability(newMap)
    setSaving(true)
    for (const { date, status } of records) {
      await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date, status }),
      })
    }
    setSaving(false)
  }

  // ── Copy previous month ───────────────────────────────────────────────────

  async function copyPreviousMonth() {
    const prevDate = new Date(cYear, cMon - 1, 1)
    const prevMonth = prevDate.toISOString().slice(0, 7)
    const res = await fetch(`/api/availability?month=${prevMonth}`, { credentials: 'include' })
    if (!res.ok) return
    const prevData = await res.json()
    const prevMap: Record<string, string> = {}
    prevData.forEach((a: any) => { prevMap[a.date] = a.status })

    const newMap = { ...availability }
    const toSet: { date: string; status: string }[] = []

    allDates.forEach(d => {
      if (availability[d]) return // skip already-set days
      const prevDay = d.replace(`${cYear}-${String(cMon + 1).padStart(2, '0')}`, prevMonth)
      const status = prevMap[prevDay]
      if (status) {
        newMap[d] = status
        toSet.push({ date: d, status })
      }
    })

    if (!toSet.length) { alert('No previous month data to copy.'); return }
    setAvailability(newMap)
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
  }

  if (!authReady) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', color: 'white', padding: '20px 24px' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '8px', fontSize: '14px' }}
        >
          ← Dashboard
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>
          📅 My Availability
        </h1>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>
          Tap a day to cycle: Available → Unavailable → Clear
        </p>
        {saving && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid #F59E0B', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', color: '#F59E0B', marginTop: '6px' }}>
            <span>●</span> Saving...
          </div>
        )}
        {saveStatus === 'saved' && !saving && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', color: '#22c55e', marginTop: '6px' }}>
            ✓ Saved
          </div>
        )}
        {saveError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#DC2626', marginTop: '6px' }}>
            {saveError}
          </div>
        )}
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

        {/* Casting visibility banner */}
        <div style={{ backgroundColor: '#1a1a2e', border: '1px solid #F59E0B', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>📅</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', color: 'white', margin: '0 0 6px', lineHeight: 1.5 }}>
              Your availability is visible to approved agents and casting directors on SetReady Casting. Keep it updated to improve your chances of being booked.
            </p>
            <a href="/profile" style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600', textDecoration: 'none' }}>View My Casting Profile →</a>
          </div>
        </div>

        {/* Month navigation */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '16px', backgroundColor: 'white', borderRadius: '12px',
          padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '18px' }}
          >←</button>
          <span style={{ fontWeight: '700', fontSize: '18px' }}>{monthName}</span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontSize: '18px' }}
          >→</button>
        </div>

        {/* Bulk actions — row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
          {[
            { label: '✅ Select Entire Month', status: 'available', bg: '#22c55e' },
            { label: '❌ Mark Month Unavailable', status: 'unavailable', bg: '#ef4444' },
            { label: '🗑 Clear Entire Month', status: null, bg: '#6b7280' }
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => bulkSet(btn.status)}
              style={{
                backgroundColor: btn.bg, color: 'white', border: 'none',
                borderRadius: '8px', padding: '8px 4px',
                fontSize: '11px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Bulk actions — row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={setWeekdaysAvailableWeekendsUnavailable}
            style={{ backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
          >
            📆 Weekdays ✅ / Weekends ❌
          </button>
          <button
            onClick={copyPreviousMonth}
            style={{ backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
          >
            📋 Copy Last Month
          </button>
        </div>

        {/* Calendar grid */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#6b7280', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {loading ? (
              <div style={{ gridColumn: 'span 7', textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                Loading calendar...
              </div>
            ) : days.map((dateStr, i) => {
              if (!dateStr) return <div key={`empty-${i}`} />
              const status = availability[dateStr]
              const isToday = dateStr === today
              const isPast = dateStr < today

              return (
                <button
                  key={dateStr}
                  onClick={() => !isPast && toggleDay(dateStr)}
                  disabled={isPast}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '8px',
                    border: isToday ? '2px solid #1a1a2e' : '1px solid #e5e7eb',
                    backgroundColor: status
                      ? COLORS[status as keyof typeof COLORS]
                      : isPast ? '#f9fafb' : 'white',
                    color: status ? 'white' : isPast ? '#d1d5db' : '#1a1a2e',
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: isToday ? '700' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isPast ? 0.5 : 1,
                    transition: 'all 0.1s ease'
                  }}
                >
                  {new Date(dateStr + 'T12:00:00').getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px' }}>
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <div key={status} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'white', borderRadius: '8px',
              padding: '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '4px',
                backgroundColor: status === 'none' ? '#f3f4f6' : COLORS[status as keyof typeof COLORS],
                border: '1px solid #e5e7eb', flexShrink: 0
              }} />
              <span style={{ fontSize: '12px', color: '#374151' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Monthly summary */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
          {[
            { label: 'Available', count: availCount, color: '#22c55e' },
            { label: 'Unavailable', count: unavailCount, color: '#ef4444' },
            { label: 'Not Set', count: notSetCount, color: '#9ca3af' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '14px' }}>
          🔒 Your availability is visible to approved agents and casting directors on SetReady Casting.
        </p>
      </div>
    </div>
  )
}
