'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type Row = Record<string, any>
type Data = {
  configured: boolean
  error?: string
  days?: number
  totals?: { pageviews: number; visitors: number }
  daily?: Row[]
  topPages?: Row[]
  topReferrers?: Row[]
  topCountries?: Row[]
  devices?: Row[]
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const res = await fetch(`/api/admin/analytics?days=${days}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        setData(await res.json())
      } catch {
        setData({ configured: true, error: 'Could not reach the analytics endpoint.' })
      } finally {
        setLoading(false)
      }
    })()
  }, [days])

  if (loading) {
    return <div style={{ ...card, color: '#6b7280' }}>Loading Vercel analytics…</div>
  }

  if (!data) return null

  if (!data.configured) {
    return (
      <div style={{ ...card, borderColor: '#fcd34d', background: '#fffbeb' }}>
        <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
          ⚙️ One-time setup needed
        </div>
        <p style={{ color: '#78350f', fontSize: 14, margin: 0 }}>
          To show Vercel Analytics here, add these three Environment Variables in Vercel
          (Settings → Environment Variables), then redeploy:
        </p>
        <ul style={{ color: '#78350f', fontSize: 14, marginTop: 8 }}>
          <li><code>VERCEL_ANALYTICS_TOKEN</code> — a Vercel access token</li>
          <li><code>VERCEL_PROJECT_ID</code></li>
          <li><code>VERCEL_TEAM_ID</code></li>
        </ul>
      </div>
    )
  }

  if (data.error) {
    return (
      <div style={{ ...card, borderColor: '#fca5a5', background: '#fef2f2' }}>
        <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>Couldn&apos;t load analytics</div>
        <p style={{ color: '#7f1d1d', fontSize: 13, margin: 0, wordBreak: 'break-word' }}>{data.error}</p>
      </div>
    )
  }

  const daily = data.daily ?? []
  const maxViews = Math.max(1, ...daily.map((d) => Number(d.pageviews) || 0))

  const numFmt = (n: any) => (Number(n) || 0).toLocaleString()

  const RankList = ({ title, rows, keyField }: { title: string; rows: Row[]; keyField: string }) => {
    const max = Math.max(1, ...rows.map((r) => Number(r.pageviews ?? r.visitors) || 0))
    return (
      <div style={card}>
        <div style={{ fontWeight: 700, color: '#374151', marginBottom: 10, fontSize: 14 }}>{title}</div>
        {rows.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>No data yet</div>}
        {rows.map((r, i) => {
          const label = r[keyField] || '(direct / none)'
          const val = Number(r.pageviews ?? r.visitors) || 0
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{label}</span>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>{numFmt(val)}</span>
              </div>
              <div style={{ height: 6, background: '#f3f4f6', borderRadius: 4 }}>
                <div style={{ height: 6, width: `${(val / max) * 100}%`, background: '#6366f1', borderRadius: 4 }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header + range toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>📈 Vercel Web Analytics</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid ' + (days === d ? '#6366f1' : '#e5e7eb'),
                background: days === d ? '#6366f1' : '#fff',
                color: days === d ? '#fff' : '#374151',
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...card, flex: 1, minWidth: 140, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{numFmt(data.totals?.pageviews)}</div>
          <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Page views (all time)</div>
        </div>
        <div style={{ ...card, flex: 1, minWidth: 140, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{numFmt(data.totals?.visitors)}</div>
          <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unique visitors (all time)</div>
        </div>
      </div>

      {/* Daily trend */}
      <div style={card}>
        <div style={{ fontWeight: 700, color: '#374151', marginBottom: 12, fontSize: 14 }}>Daily page views · last {data.days} days</div>
        {daily.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 13 }}>No data in this window yet.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
            {daily.map((d, i) => {
              const v = Number(d.pageviews) || 0
              const h = Math.round((v / maxViews) * 100)
              return (
                <div
                  key={i}
                  title={`${(d.timestamp || '').slice(0, 10)}: ${numFmt(v)} views`}
                  style={{ flex: 1, height: `${Math.max(h, 2)}%`, background: '#6366f1', borderRadius: '3px 3px 0 0', minWidth: 3 }}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Breakdowns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <RankList title="Top pages" rows={data.topPages ?? []} keyField="route" />
        <RankList title="Top referrers" rows={data.topReferrers ?? []} keyField="referrerHostname" />
        <RankList title="Top countries" rows={data.topCountries ?? []} keyField="country" />
        <RankList title="Devices" rows={data.devices ?? []} keyField="deviceType" />
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af' }}>
        Live from Vercel Web Analytics. History depth depends on your Vercel plan&apos;s reporting window.
      </div>
    </div>
  )
}
