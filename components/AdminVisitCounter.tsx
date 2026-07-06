'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Visits = {
  lastHour: number
  last24h: number
  last7d: number
  last30d: number
  total: number
}

const supabase = createClient()

export default function AdminVisitCounter() {
  const [data, setData] = useState<Visits | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const res = await fetch('/api/admin/visits', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) {
          setErr('Could not load visits')
          return
        }
        setData(await res.json())
      } catch {
        setErr('Could not load visits')
      }
    })()
  }, [])

  const boxStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 90,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '12px 14px',
    textAlign: 'center',
  }

  const box = (label: string, val: number | undefined) => (
    <div style={boxStyle} key={label}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>
        {val ?? '—'}
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  )

  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', marginBottom: 10 }}>
        📈 Site Visits{' '}
        {err && <span style={{ color: '#dc2626', fontWeight: 400 }}>· {err}</span>}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {box('Past hour', data?.lastHour)}
        {box('24 hours', data?.last24h)}
        {box('7 days', data?.last7d)}
        {box('30 days', data?.last30d)}
        {box('All time', data?.total)}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
        Page views (excludes admin &amp; bots). Full charts in Vercel → Analytics.
      </div>
    </div>
  )
}
