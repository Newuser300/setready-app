// ════════════════════════════════════════════════════════════════════
// SET CRASHERS — LEADERBOARD MODAL (drop-in component)
// Paste this component into the page file. Render it when `showBoard` is true.
// Requires: a getAccessToken() that returns the Supabase access token (the page
// already uses browserClient.auth.getSession()).
// ════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

type Row = { rank: number; handle: string; score: number; totalStars: number; levelsCleared: number; bestCombo: number; userId: string }

export function Leaderboard({ getAccessToken, onClose, myHandle, onSetHandle }: {
  getAccessToken: () => Promise<string | null>
  onClose: () => void
  myHandle?: string
  onSetHandle?: (h: string) => void
}) {
  const [editingHandle, setEditingHandle] = useState(false)
  const [handleDraft, setHandleDraft] = useState(myHandle || '')
  const [mode, setMode] = useState<'all' | 'week'>('all')
  const [top, setTop] = useState<Row[]>([])
  const [you, setYou] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true); setErr('')
    ;(async () => {
      try {
        const token = await getAccessToken()
        const res = await fetch(`/api/games/set-crashers/leaderboard?mode=${mode}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json()
        if (!alive) return
        if (!res.ok) { setErr(data?.error || 'Could not load leaderboard'); return }
        setTop(data.top || [])
        setYou(data.you || null)
      } catch {
        if (alive) setErr('Could not load leaderboard')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [mode, getAccessToken])

  const GOLD = '#F5C542', INK = '#12121a', PANEL = '#1c1c28', LINE = '#2c2c3a', TEXT = '#ECE6DA', MUTE = '#8a8597'
  const medal = (r: number) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `${r}`

  const Tab = ({ id, label }: { id: 'all' | 'week'; label: string }) => (
    <button onClick={() => setMode(id)} style={{
      flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: 14,
      background: mode === id ? GOLD : 'transparent', color: mode === id ? INK : MUTE, borderRadius: 10,
    }}>{label}</button>
  )

  const Line = ({ r }: { r: Row }) => {
    const mine = myHandle && r.handle === myHandle
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
        background: mine ? 'rgba(245,197,66,0.14)' : 'transparent', border: mine ? `1px solid ${GOLD}` : '1px solid transparent',
      }}>
        <div style={{ width: 30, textAlign: 'center', fontWeight: 800, color: r.rank <= 3 ? GOLD : MUTE, fontSize: r.rank <= 3 ? 18 : 14 }}>{medal(r.rank)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: TEXT, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.handle}{mine ? ' (you)' : ''}
          </div>
          <div style={{ color: MUTE, fontSize: 12 }}>⭐ {r.totalStars} · {r.levelsCleared} cleared · 🎯 combo {r.bestCombo}</div>
        </div>
        <div style={{ color: GOLD, fontWeight: 800, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{r.score.toLocaleString()}</div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 18px 12px', textAlign: 'center', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: GOLD, letterSpacing: '.02em' }}>🏆 BOX OFFICE</div>
          <div style={{ color: MUTE, fontSize: 12, letterSpacing: '.18em', fontWeight: 700 }}>TOP DIRECTORS</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, background: INK, borderRadius: 12, padding: 4 }}>
            <Tab id="all" label="All-Time" />
            <Tab id="week" label="This Week" />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: MUTE, padding: 40 }}>Loading the charts…</div>
          ) : err ? (
            <div style={{ textAlign: 'center', color: '#ff9b9b', padding: 40 }}>{err}</div>
          ) : top.length === 0 ? (
            <div style={{ textAlign: 'center', color: MUTE, padding: 40 }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>🎬</div>
              No scores yet this {mode === 'week' ? 'week' : 'season'}.<br />Be the first on the board!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {top.map(r => <Line key={r.userId} r={r} />)}
            </div>
          )}
        </div>

        {/* Your rank pinned at bottom if outside the visible top */}
        {you && !top.find(t => t.handle === you!.handle) && (
          <div style={{ borderTop: `1px solid ${LINE}`, padding: '8px 12px', background: INK }}>
            <Line r={you} />
          </div>
        )}

        {onSetHandle && (
          <div style={{ padding: '0 12px 4px' }}>
            {editingHandle ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={handleDraft} maxLength={20} onChange={e => setHandleDraft(e.target.value)} placeholder="Your name on the board"
                  style={{ flex: 1, background: INK, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
                <button onClick={() => { const h = handleDraft.trim().slice(0, 20); if (h) { onSetHandle(h); } setEditingHandle(false) }}
                  style={{ background: GOLD, color: INK, border: 'none', borderRadius: 10, padding: '0 14px', fontWeight: 800, cursor: 'pointer' }}>Save</button>
              </div>
            ) : (
              <button onClick={() => { setHandleDraft(myHandle || ''); setEditingHandle(true) }}
                style={{ width: '100%', background: 'transparent', color: MUTE, border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                {myHandle ? `Your board name: ${myHandle} — tap to change` : 'Set your name on the board'}
              </button>
            )}
          </div>
        )}
        <button onClick={onClose} style={{ margin: 12, padding: '13px', background: GOLD, color: INK, border: 'none', borderRadius: 12, fontWeight: 800, fontFamily: 'inherit', fontSize: 15, cursor: 'pointer' }}>
          Back to the Set
        </button>
      </div>
    </div>
  )
}
