'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/* ════════════════════════════════════════════════════════════════════
   A-LIST: INTERACTIVE SCENES — the AI scene-partner game
   You audition opposite an AI character; a Director scores your take; you
   climb from Extra to Legend. Scenes are generated, so it never repeats.
   First scene is free; after that, a 20-scene pass unlocks more for $4.98.
   You can TYPE or SPEAK your own lines (on-device voice, no extra cost).
   Visual identity: a screening room. Theatrical black, one tungsten-amber
   spotlight accent, shooting-script slates, a stamped director's verdict.
════════════════════════════════════════════════════════════════════ */

const SAVE_KEY = 'sr-alist-save'
const FREE_SCENES = 1            // free taste before the paywall
const PACK_SCENES = 20           // scenes granted per $4.98 pass
// Buzz thresholds to reach each rank (index aligns with RANKS).
const RANKS = ['Extra', 'Day Player', 'Supporting', 'Lead', 'A-List', 'Legend']
const RANK_AT = [0, 120, 360, 800, 1600, 3200]
const GENRES = ['Drama', 'Rom-Com', 'Horror', 'Action', 'Thriller', 'Sci-Fi', 'Soap Opera', 'Period Drama', 'Comedy', 'Crime']

type Save = { buzz: number; auditions: number; bestOverall: number; filmography: any[]; lastDailyDate: string; dailyStreak: number; scenesUsed: number; scenesPurchased: number; claimedPurchases: string[]; seenTutorial: boolean }
const DEFAULT_SAVE: Save = { buzz: 0, auditions: 0, bestOverall: 0, filmography: [], lastDailyDate: '', dailyStreak: 0, scenesUsed: 0, scenesPurchased: 0, claimedPurchases: [], seenTutorial: false }

function loadSave(): Save {
  try { const r = localStorage.getItem(SAVE_KEY); if (r) return { ...DEFAULT_SAVE, ...JSON.parse(r) } } catch {}
  return { ...DEFAULT_SAVE }
}
function rankFor(buzz: number): { name: string; idx: number; next: number | null; into: number } {
  let idx = 0
  for (let i = RANKS.length - 1; i >= 0; i--) { if (buzz >= RANK_AT[i]) { idx = i; break } }
  const next = idx < RANKS.length - 1 ? RANK_AT[idx + 1] : null
  const base = RANK_AT[idx]
  const into = next ? (buzz - base) / (next - base) : 1
  return { name: RANKS[idx], idx, next, into }
}
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// ── palette / type tokens ──
const AMBER = '#E8A33D'      // tungsten spotlight
const AMBER_DEEP = '#B97515'
const INK = '#0B0B0F'        // theatrical black
const PANEL = '#15151C'
const PANEL2 = '#1E1E27'
const LINE = '#2A2A35'
const TEXT = '#ECE6DA'
const MUTE = '#8A8597'

const VERDICT_TONE: Record<string, { c: string; bg: string }> = {
  'CUT IT': { c: '#ff6b6b', bg: 'rgba(255,107,107,0.12)' },
  'NEEDS WORK': { c: '#f0a44a', bg: 'rgba(240,164,74,0.12)' },
  'SOLID TAKE': { c: '#7bd0a0', bg: 'rgba(123,208,160,0.12)' },
  "THAT'S A WRAP": { c: '#5bc8e0', bg: 'rgba(91,200,224,0.12)' },
  'STAR IS BORN': { c: AMBER, bg: 'rgba(232,163,61,0.16)' },
}

type Screen = 'stage' | 'scene' | 'result'
type Line = { who: 'player' | 'partner'; text: string; beat?: string }

export default function AListPage() {
  const [ready, setReady] = useState(false)
  const [save, setSave] = useState<Save>(DEFAULT_SAVE)
  const [screen, setScreen] = useState<Screen>('stage')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [err, setErr] = useState('')

  const [scene, setScene] = useState<any>(null)
  const [history, setHistory] = useState<Line[]>([])
  const [draft, setDraft] = useState('')
  const [reacting, setReacting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [isDaily, setIsDaily] = useState(false)
  const [pickGenre, setPickGenre] = useState<string | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [buying, setBuying] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const s = loadSave(); setSave(s); setReady(true); if (!s.seenTutorial) setShowTutorial(true) }, [])
  useEffect(() => { if (ready) try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch {} }, [save, ready])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [history, reacting])

  // Reconcile any completed scene-pass purchases (mirrors other games' pattern).
  useEffect(() => {
    if (!ready) return
    fetch('/api/game-purchases?game=a-list').then(r => r.ok ? r.json() : null).then((data: any) => {
      const rows: any[] = Array.isArray(data) ? data : (data?.purchases || [])
      if (!rows.length) return
      setSave(s => {
        const claimed = [...(s.claimedPurchases || [])]
        let added = 0
        for (const p of rows) {
          const id = p.stripe_session_id || p.id
          if (!id || claimed.includes(id)) continue
          if (p.item === 'scenes_20') added += PACK_SCENES
          claimed.push(id)
        }
        if (!added) return s
        return { ...s, scenesPurchased: s.scenesPurchased + added, claimedPurchases: claimed }
      })
      // clear the ?purchase=success flag
      try { if (window.location.search.includes('purchase=')) window.history.replaceState({}, '', '/a-list') } catch {}
    }).catch(() => {})
  }, [ready])

  const rank = rankFor(save.buzz)
  const dailyAvailable = save.lastDailyDate !== todayStr()
  const scenesLeft = (FREE_SCENES + save.scenesPurchased) - save.scenesUsed
  const canPlay = scenesLeft > 0

  async function api(payload: any) {
    const res = await fetch('/api/alist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Request failed')
    return data
  }

  async function buyScenes() {
    setBuying(true); setErr('')
    try {
      const res = await fetch('/api/checkout/a-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: 'scenes_20' }) })
      const data = await res.json()
      if (data?.url) { window.location.href = data.url; return }
      setErr(data?.error || 'Could not start checkout — are you signed in?')
    } catch { setErr('Could not start checkout. Please try again.') }
    finally { setBuying(false) }
  }

  async function startScene(opts: { daily?: boolean; genre?: string }) {
    if (!canPlay) { setShowPaywall(true); return }
    setErr(''); setLoading(true); setIsDaily(!!opts.daily)
    setLoadMsg(opts.daily ? 'Casting today’s audition…' : 'Finding you a scene…')
    try {
      const { scene } = await api({ action: 'scene', rank: rank.name, genre: opts.genre })
      setScene(scene)
      setHistory([{ who: 'partner', text: scene.partnerOpensWith, beat: 'opening' }])
      setResult(null); setDraft(''); setScreen('scene')
      // a scene is "used" the moment it's generated (that's the costly call)
      setSave(s => ({ ...s, scenesUsed: s.scenesUsed + 1 }))
    } catch (e: any) { setErr(e.message || 'Could not start the scene.') }
    finally { setLoading(false); setPickGenre(null) }
  }

  async function deliver(line: string) {
    const clean = line.trim(); if (!clean || reacting) return
    setDraft(''); setErr('')
    const nextHist: Line[] = [...history, { who: 'player', text: clean }]
    setHistory(nextHist)
    setReacting(true)
    try {
      const { reaction } = await api({ action: 'react', scene, history: nextHist, playerLine: clean })
      setHistory(h => [...h, { who: 'partner', text: reaction.line, beat: reaction.beat }])
    } catch (e: any) { setErr(e.message || 'The scene partner lost their place.') }
    finally { setReacting(false) }
  }

  async function callCut() {
    if (reacting || loading) return
    setLoading(true); setLoadMsg('The Director is watching the take back…'); setErr('')
    try {
      const { result } = await api({ action: 'score', scene, history })
      setResult(result)
      setSave(s => {
        const film = [{ title: scene.title, genre: scene.genre, verdict: result.verdict, overall: result.overall, when: todayStr() }, ...s.filmography].slice(0, 30)
        let streak = s.dailyStreak; let lastDailyDate = s.lastDailyDate
        if (isDaily && s.lastDailyDate !== todayStr()) {
          const y = new Date(); y.setDate(y.getDate() - 1)
          const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
          streak = s.lastDailyDate === yStr ? s.dailyStreak + 1 : 1
          lastDailyDate = todayStr()
        }
        const dailyBonus = isDaily ? Math.round(result.buzz * 0.5) : 0
        return { ...s, buzz: s.buzz + result.buzz + dailyBonus, auditions: s.auditions + 1, bestOverall: Math.max(s.bestOverall, result.overall), filmography: film, dailyStreak: streak, lastDailyDate }
      })
      setScreen('result')
    } catch (e: any) { setErr(e.message || 'The Director walked off set.') }
    finally { setLoading(false) }
  }

  if (!ready) return <div style={{ minHeight: '100vh', background: INK }} />

  return (
    <div style={{ minHeight: '100vh', background: INK, color: TEXT, fontFamily: '"Inter", system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* ambient spotlight */}
      <div aria-hidden style={{ position: 'fixed', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: '120vw', height: '80vh', background: `radial-gradient(ellipse at center, rgba(232,163,61,0.10), transparent 60%)`, pointerEvents: 'none', zIndex: 0 }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        .alist-display{font-family:"Bebas Neue",sans-serif;letter-spacing:.02em;line-height:.95}
        .alist-btn{transition:transform .12s ease, box-shadow .12s ease, background .15s ease}
        .alist-btn:hover{transform:translateY(-1px)}
        .alist-btn:active{transform:translateY(0)}
        @keyframes alistIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .alist-in{animation:alistIn .35s ease both}
        @media (prefers-reduced-motion: reduce){.alist-in{animation:none}}
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', padding: '20px 18px 80px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Link href="/dashboard" style={{ color: MUTE, fontSize: 15, textDecoration: 'none', fontWeight: 600 }}>← Dashboard</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setShowTutorial(true)} style={{ background: 'none', border: `1px solid ${LINE}`, color: MUTE, borderRadius: 8, padding: '5px 10px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>How to play</button>
            <div style={{ textAlign: 'right' }}>
              <div className="alist-display" style={{ fontSize: 22, color: AMBER }}>{save.buzz.toLocaleString()}<span style={{ fontSize: 14, color: MUTE, marginLeft: 4, letterSpacing: '.1em' }}>BUZZ</span></div>
              <div style={{ fontSize: 13, color: scenesLeft > 0 ? MUTE : '#ff9b9b' }}>{scenesLeft > 0 ? `${scenesLeft} scene${scenesLeft === 1 ? '' : 's'} left` : 'No scenes left'}</div>
            </div>
          </div>
        </div>

        {screen === 'stage' && <Stage save={save} rank={rank} dailyAvailable={dailyAvailable} loading={loading} loadMsg={loadMsg} err={err}
          scenesLeft={scenesLeft} onBuy={() => setShowPaywall(true)}
          onDaily={() => startScene({ daily: true })} onAudition={() => startScene({})} pickGenre={pickGenre} setPickGenre={setPickGenre}
          onGenre={(g: string) => startScene({ genre: g })} />}

        {screen === 'scene' && scene && <SceneView scene={scene} history={history} draft={draft} setDraft={setDraft} reacting={reacting}
          loading={loading} loadMsg={loadMsg} err={err} onDeliver={deliver} onCut={callCut} scrollRef={scrollRef} isDaily={isDaily} />}

        {screen === 'result' && result && <ResultView result={result} scene={scene} save={save} rank={rankFor(save.buzz)} isDaily={isDaily}
          scenesLeft={scenesLeft} onBuy={() => setShowPaywall(true)}
          onAgain={() => setScreen('stage')} />}
      </div>

      {showTutorial && <Tutorial onClose={() => { setShowTutorial(false); setSave(s => ({ ...s, seenTutorial: true })) }} />}
      {showPaywall && <Paywall buying={buying} err={err} scenesLeft={scenesLeft} onBuy={buyScenes} onClose={() => setShowPaywall(false)} />}
    </div>
  )
}

/* ───────────────────────── STAGE (home) ───────────────────────── */
function Stage({ save, rank, dailyAvailable, loading, loadMsg, err, scenesLeft, onBuy, onDaily, onAudition, pickGenre, setPickGenre, onGenre }: any) {
  return (
    <div className="alist-in">
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <div style={{ color: AMBER, letterSpacing: '.35em', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>NOW CASTING</div>
        <h1 className="alist-display" style={{ fontSize: 'clamp(52px,14vw,96px)', margin: 0, color: TEXT }}>A&#8209;LIST</h1>
        <div className="alist-display" style={{ fontSize: 'clamp(20px,5vw,30px)', color: AMBER, letterSpacing: '.06em', marginTop: -4 }}>INTERACTIVE SCENES</div>
        <p style={{ color: MUTE, fontSize: 17, maxWidth: 440, margin: '10px auto 0', lineHeight: 1.5 }}>
          Step into a scene. Act opposite a partner who reacts to your every choice. The Director is watching.
        </p>
      </div>

      {/* rank panel */}
      <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, color: MUTE, letterSpacing: '.18em', fontWeight: 700 }}>YOUR STANDING</div>
            <div className="alist-display" style={{ fontSize: 38, color: TEXT }}>{rank.name}</div>
          </div>
          <div style={{ textAlign: 'right', color: MUTE, fontSize: 14 }}>
            {rank.next ? <>Next: <span style={{ color: AMBER }}>{RANKS[rank.idx + 1]}</span><br />{(rank.next - save.buzz).toLocaleString()} buzz to go</> : <span style={{ color: AMBER }}>Top of the call sheet ★</span>}
          </div>
        </div>
        <div style={{ height: 7, background: PANEL2, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${Math.round(rank.into * 100)}%`, height: '100%', background: `linear-gradient(90deg,${AMBER_DEEP},${AMBER})`, borderRadius: 99, transition: 'width .5s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 14, color: MUTE }}>
          <span>{save.auditions} auditions</span>
          <span>Best take: <span style={{ color: TEXT }}>{save.bestOverall}</span></span>
          {save.dailyStreak > 0 && <span>🔥 {save.dailyStreak}-day streak</span>}
        </div>
      </div>

      {err && <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff9b9b', padding: '10px 14px', borderRadius: 10, fontSize: 15, marginBottom: 14 }}>{err}</div>}

      {/* daily */}
      <button className="alist-btn" disabled={loading || !dailyAvailable} onClick={onDaily}
        style={{ width: '100%', textAlign: 'left', background: dailyAvailable ? `linear-gradient(135deg, ${AMBER_DEEP}, ${AMBER})` : PANEL, color: dailyAvailable ? INK : MUTE, border: dailyAvailable ? 'none' : `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', cursor: loading || !dailyAvailable ? 'default' : 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>🎬 Daily Audition</div>
            <div style={{ fontSize: 14, opacity: .85, marginTop: 2 }}>{dailyAvailable ? 'A fresh scene, once a day. Bonus buzz + keep your streak.' : 'Done for today — come back tomorrow.'}</div>
          </div>
          {dailyAvailable && <span style={{ fontSize: 22 }}>→</span>}
        </div>
      </button>

      {/* audition */}
      <button className="alist-btn" disabled={loading} onClick={onAudition}
        style={{ width: '100%', background: PANEL2, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', cursor: loading ? 'wait' : 'pointer', marginBottom: 12, fontFamily: 'inherit', textAlign: 'left' }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{loading ? loadMsg : '🎭 New Audition'}</div>
        <div style={{ fontSize: 14, color: MUTE, marginTop: 2 }}>A surprise scene, scaled to your standing.</div>
      </button>

      {/* genre picker */}
      <button className="alist-btn" disabled={loading} onClick={() => setPickGenre(pickGenre ? null : 'open')}
        style={{ width: '100%', background: 'transparent', color: MUTE, border: `1px dashed ${LINE}`, borderRadius: 14, padding: '12px 18px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 600 }}>
        🎞️ Choose a genre instead
      </button>
      {pickGenre && (
        <div className="alist-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {GENRES.map(g => (
            <button key={g} className="alist-btn" disabled={loading} onClick={() => onGenre(g)}
              style={{ background: PANEL, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 99, padding: '8px 14px', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>{g}</button>
          ))}
        </div>
      )}

      {/* scenes / buy */}
      <div style={{ marginTop: 16, background: scenesLeft > 0 ? 'transparent' : PANEL, border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, color: TEXT, fontWeight: 700 }}>{scenesLeft > 0 ? `${scenesLeft} scene${scenesLeft === 1 ? '' : 's'} remaining` : 'You’re out of scenes'}</div>
          <div style={{ fontSize: 14, color: MUTE, marginTop: 2 }}>{scenesLeft > 0 ? 'Each audition uses one scene.' : 'Unlock 20 more to keep performing.'}</div>
        </div>
        <button className="alist-btn" onClick={onBuy} style={{ background: `linear-gradient(135deg,${AMBER_DEEP},${AMBER})`, color: INK, border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 800, fontFamily: 'inherit', fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap' }}>+20 · $4.98</button>
      </div>

      {/* filmography */}
      {save.filmography.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 13, color: MUTE, letterSpacing: '.18em', fontWeight: 700, marginBottom: 10 }}>YOUR FILMOGRAPHY</div>
          {save.filmography.slice(0, 6).map((f: any, i: number) => {
            const tone = VERDICT_TONE[f.verdict] || { c: MUTE, bg: 'transparent' }
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${LINE}` }}>
                <div><span style={{ color: TEXT, fontWeight: 600, fontSize: 16 }}>{f.title}</span> <span style={{ color: MUTE, fontSize: 14 }}>· {f.genre}</span></div>
                <span style={{ color: tone.c, background: tone.bg, fontSize: 13, fontWeight: 700, padding: '3px 9px', borderRadius: 99, letterSpacing: '.04em' }}>{f.verdict}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── SCENE ───────────────────────── */
function SceneView({ scene, history, draft, setDraft, reacting, loading, loadMsg, err, onDeliver, onCut, scrollRef, isDaily }: any) {
  const playerTurns = history.filter((h: Line) => h.who === 'player').length
  return (
    <div className="alist-in">
      {/* slate */}
      <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ background: `repeating-linear-gradient(45deg, ${INK} 0 18px, ${PANEL2} 18px 36px)`, height: 14 }} />
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: AMBER, fontSize: 13, letterSpacing: '.2em', fontWeight: 700 }}>{isDaily ? 'DAILY · ' : ''}{scene.genre?.toUpperCase()}</span>
            <span style={{ color: MUTE, fontSize: 13, letterSpacing: '.08em' }}>{scene.slug}</span>
          </div>
          <h2 className="alist-display" style={{ fontSize: 30, margin: '2px 0 8px', color: TEXT }}>{scene.title}</h2>
          <p style={{ color: TEXT, fontSize: 16, lineHeight: 1.55, margin: '0 0 8px' }}>{scene.setup}</p>
          <p style={{ color: MUTE, fontSize: 17, margin: 0 }}><span style={{ color: AMBER }}>Your objective:</span> {scene.objective}</p>
        </div>
      </div>

      {/* dialogue */}
      <div ref={scrollRef} style={{ maxHeight: '42vh', overflowY: 'auto', padding: '2px 2px 4px', marginBottom: 12 }}>
        {history.map((h: Line, i: number) => (
          h.who === 'partner' ? (
            <div key={i} className="alist-in" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: AMBER, fontWeight: 700, letterSpacing: '.08em', marginBottom: 3 }}>{scene.partnerName?.toUpperCase()}{h.beat ? <span style={{ color: MUTE, fontWeight: 500 }}> · {h.beat}</span> : ''}</div>
              <div style={{ background: PANEL2, border: `1px solid ${LINE}`, borderRadius: '4px 14px 14px 14px', padding: '11px 14px', fontSize: 17, lineHeight: 1.5, color: TEXT }}>{h.text}</div>
            </div>
          ) : (
            <div key={i} className="alist-in" style={{ marginBottom: 12, textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: MUTE, fontWeight: 700, letterSpacing: '.08em', marginBottom: 3 }}>YOU</div>
              <div style={{ display: 'inline-block', background: `linear-gradient(135deg,${AMBER_DEEP},${AMBER})`, color: INK, borderRadius: '14px 4px 14px 14px', padding: '11px 14px', fontSize: 17, lineHeight: 1.5, fontWeight: 500, maxWidth: '85%', textAlign: 'left' }}>{h.text}</div>
            </div>
          )
        ))}
        {reacting && <div style={{ fontSize: 14, color: MUTE, fontStyle: 'italic' }}>{scene.partnerName} reacts…</div>}
      </div>

      {err && <div style={{ color: '#ff9b9b', fontSize: 17, marginBottom: 10 }}>{err}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '18px', color: AMBER, fontSize: 16, fontWeight: 600 }}>{loadMsg}</div>
      ) : (
        <>
          {/* suggested lines (first turn only, as scaffolding) */}
          {playerTurns === 0 && scene.lines?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
              {scene.lines.map((l: string, i: number) => (
                <button key={i} className="alist-btn" disabled={reacting} onClick={() => onDeliver(l)}
                  style={{ textAlign: 'left', background: PANEL, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 11, padding: '11px 14px', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit', lineHeight: 1.4 }}>
                  <span style={{ color: AMBER, marginRight: 6 }}>“</span>{l}<span style={{ color: AMBER }}>”</span>
                </button>
              ))}
              <div style={{ textAlign: 'center', color: MUTE, fontSize: 13, marginTop: 2 }}>— or write your own line below —</div>
            </div>
          )}

          {/* free input — type or speak */}
          <VoiceInput draft={draft} setDraft={setDraft} reacting={reacting} onDeliver={onDeliver} />

          {/* CUT */}
          {playerTurns >= 1 && (
            <button className="alist-btn" disabled={reacting} onClick={onCut}
              style={{ width: '100%', marginTop: 12, background: 'transparent', color: AMBER, border: `1px solid ${AMBER_DEEP}`, borderRadius: 12, padding: '12px', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: 16, letterSpacing: '.05em' }}>
              ✂ CUT — end the take &amp; get the Director’s notes
            </button>
          )}
          <div style={{ textAlign: 'center', color: MUTE, fontSize: 13, marginTop: 8 }}>Play 1–4 exchanges, then call CUT when your scene lands.</div>
        </>
      )}
    </div>
  )
}

/* ───────────────────────── RESULT ───────────────────────── */
function ResultView({ result, scene, save, rank, isDaily, scenesLeft, onBuy, onAgain }: any) {
  const tone = VERDICT_TONE[result.verdict] || { c: AMBER, bg: 'rgba(232,163,61,0.14)' }
  const dailyBonus = isDaily ? Math.round(result.buzz * 0.5) : 0
  return (
    <div className="alist-in" style={{ textAlign: 'center' }}>
      <div style={{ color: MUTE, letterSpacing: '.3em', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>THE DIRECTOR’S VERDICT</div>

      {/* stamped verdict */}
      <div style={{ display: 'inline-block', border: `2.5px solid ${tone.c}`, color: tone.c, background: tone.bg, borderRadius: 12, padding: '12px 26px', transform: 'rotate(-2.5deg)', marginBottom: 22 }}>
        <span className="alist-display" style={{ fontSize: 40 }}>{result.verdict}</span>
      </div>

      {/* score bars */}
      <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16, textAlign: 'left' }}>
        {[['Truth', result.scores?.truth], ['Presence', result.scores?.presence], ['Originality', result.scores?.originality]].map(([label, v]: any) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, marginBottom: 5 }}><span style={{ color: MUTE }}>{label}</span><span style={{ color: TEXT, fontWeight: 700 }}>{v ?? 0}</span></div>
            <div style={{ height: 6, background: PANEL2, borderRadius: 99 }}><div style={{ width: `${v ?? 0}%`, height: '100%', background: `linear-gradient(90deg,${AMBER_DEEP},${AMBER})`, borderRadius: 99 }} /></div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
          <span style={{ color: MUTE, fontSize: 15 }}>Overall</span>
          <span className="alist-display" style={{ fontSize: 34, color: AMBER }}>{result.overall}</span>
        </div>
      </div>

      {/* note */}
      <div style={{ background: PANEL2, border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', marginBottom: 10, textAlign: 'left' }}>
        <div style={{ fontSize: 13, color: AMBER, letterSpacing: '.15em', fontWeight: 700, marginBottom: 6 }}>NOTES</div>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: TEXT, fontStyle: 'italic' }}>“{result.note}”</p>
        {result.highlight && <p style={{ margin: '10px 0 0', fontSize: 15, color: MUTE }}><span style={{ color: AMBER }}>Best moment:</span> {result.highlight}</p>}
      </div>

      {/* buzz */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '18px 0' }}>
        <span className="alist-display" style={{ fontSize: 44, color: AMBER }}>+{result.buzz + dailyBonus}</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, color: MUTE, letterSpacing: '.1em' }}>BUZZ EARNED</div>
          {dailyBonus > 0 && <div style={{ fontSize: 13, color: AMBER }}>incl. +{dailyBonus} daily bonus 🔥</div>}
        </div>
      </div>

      {rank.next && save.buzz >= rank.next - result.buzz && save.buzz < rank.next ? null : null}

      <button className="alist-btn" onClick={onAgain}
        style={{ width: '100%', background: `linear-gradient(135deg,${AMBER_DEEP},${AMBER})`, color: INK, border: 'none', borderRadius: 14, padding: '15px', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: 18 }}>
        Back to the Stage
      </button>
      {scenesLeft <= 0 && (
        <button className="alist-btn" onClick={onBuy}
          style={{ width: '100%', marginTop: 10, background: 'transparent', color: AMBER, border: `1px solid ${AMBER_DEEP}`, borderRadius: 14, padding: '13px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: 16 }}>
          That was your last scene — unlock 20 more for $4.98
        </button>
      )}
    </div>
  )
}

/* ───────────────────────── VOICE INPUT (type or speak) ───────────────────────── */
function VoiceInput({ draft, setDraft, reacting, onDeliver }: any) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recRef = useRef<any>(null)
  const silenceTimer = useRef<any>(null)
  const manualStop = useRef(false)
  const finalRef = useRef('')

  useEffect(() => {
    const SR = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    setSupported(!!SR)
    return () => { if (silenceTimer.current) clearTimeout(silenceTimer.current) }
  }, [])

  function clearSilence() { if (silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null } }

  function armSilence() {
    // Stop only after 2 full seconds of silence.
    clearSilence()
    silenceTimer.current = setTimeout(() => {
      manualStop.current = true
      try { recRef.current?.stop() } catch {}
    }, 2000)
  }

  function startMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true
    manualStop.current = false
    finalRef.current = draft ? draft + ' ' : ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current += t + ' '; else interim += t
      }
      setDraft((finalRef.current + interim).trim())
      armSilence() // reset the 2s countdown every time speech is heard
    }
    rec.onaudiostart = () => armSilence()
    rec.onend = () => {
      clearSilence()
      // If it ended on its own (not a real stop) and the user hasn't tapped stop, keep going.
      if (!manualStop.current) {
        try { rec.start(); return } catch {}
      }
      setListening(false)
    }
    rec.onerror = () => { clearSilence(); setListening(false) }
    recRef.current = rec
    try { rec.start(); setListening(true); armSilence() } catch {}
  }

  function toggleMic() {
    if (!supported) return
    if (listening) { manualStop.current = true; clearSilence(); try { recRef.current?.stop() } catch {}; setListening(false); return }
    startMic()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder={supported ? 'Type your line — or tap the mic to speak it…' : 'Say your line…'} rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onDeliver(draft) } }}
          disabled={reacting}
          style={{ flex: 1, background: PANEL, color: TEXT, border: `1px solid ${listening ? AMBER : LINE}`, borderRadius: 12, padding: '11px 14px', fontSize: 17, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.4 }} />
        {supported && (
          <button className="alist-btn" disabled={reacting} onClick={toggleMic} title={listening ? 'Stop' : 'Speak your line'}
            style={{ background: listening ? '#ff5a5a' : PANEL2, color: listening ? '#fff' : TEXT, border: `1px solid ${listening ? '#ff5a5a' : LINE}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 18, lineHeight: 1 }}>
            {listening ? '◉' : '🎤'}
          </button>
        )}
        <button className="alist-btn" disabled={reacting || !draft.trim()} onClick={() => onDeliver(draft)}
          style={{ background: draft.trim() ? `linear-gradient(135deg,${AMBER_DEEP},${AMBER})` : PANEL2, color: draft.trim() ? INK : MUTE, border: 'none', borderRadius: 12, padding: '12px 16px', cursor: draft.trim() ? 'pointer' : 'default', fontWeight: 800, fontFamily: 'inherit', fontSize: 16 }}>Deliver</button>
      </div>
      {listening && <div style={{ fontSize: 13, color: AMBER, marginTop: 6, textAlign: 'center' }}>🎙️ Listening… speak your line, then tap ◉ to stop.</div>}
    </div>
  )
}

/* ───────────────────────── TUTORIAL ───────────────────────── */
function Tutorial({ onClose }: any) {
  const steps = [
    { icon: '🎬', t: 'Step into a scene', d: 'Each audition drops you into a fresh, AI-generated scene — a setting, a character to play opposite, and an objective your character wants. No two are ever the same.' },
    { icon: '💬', t: 'Perform your lines', d: 'Pick a suggested opening line, or write your own. Your scene partner reacts in character to exactly what you say — play it honest, surprising, committed.' },
    { icon: '🎤', t: 'Type or speak', d: 'When you write your own line, tap the mic to speak it instead — your words are transcribed live (works best in Chrome). It’s acting, after all.' },
    { icon: '✂️', t: 'Call “CUT”', d: 'Play a few exchanges, then end the take. The Director scores your performance on Truth, Presence, and Originality — with real, personal notes.' },
    { icon: '⭐', t: 'Build your career', d: 'Every take earns Buzz. Climb from Extra to Legend, keep a daily streak, and grow your filmography. Your first scene is free.' },
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 18, maxWidth: 460, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="alist-display" style={{ fontSize: 34, color: TEXT }}>HOW IT WORKS</div>
          <div style={{ color: AMBER, fontSize: 14, letterSpacing: '.2em', fontWeight: 700 }}>A-LIST: INTERACTIVE SCENES</div>
        </div>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 26, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 700, color: TEXT, fontSize: 17, marginBottom: 2 }}>{s.t}</div>
              <div style={{ color: MUTE, fontSize: 15, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          </div>
        ))}
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, background: `linear-gradient(135deg,${AMBER_DEEP},${AMBER})`, color: INK, border: 'none', borderRadius: 12, padding: '14px', fontWeight: 800, fontFamily: 'inherit', fontSize: 17, cursor: 'pointer' }}>
          Got it — let’s audition
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── PAYWALL ───────────────────────── */
function Paywall({ buying, err, scenesLeft, onBuy, onClose }: any) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: PANEL, border: `1px solid ${AMBER_DEEP}`, borderRadius: 18, maxWidth: 420, width: '100%', padding: '28px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎬</div>
        <div className="alist-display" style={{ fontSize: 30, color: TEXT }}>KEEP PERFORMING</div>
        <p style={{ color: MUTE, fontSize: 16, lineHeight: 1.55, margin: '10px 0 18px' }}>
          {scenesLeft > 0 ? 'Stock up on scenes so the cameras never stop rolling.' : 'You’ve used your scenes. Unlock a fresh pass and pick up where you left off — your buzz and career carry over.'}
        </p>
        <div style={{ background: PANEL2, border: `1px solid ${LINE}`, borderRadius: 14, padding: '18px', marginBottom: 16 }}>
          <div className="alist-display" style={{ fontSize: 44, color: AMBER }}>20 SCENES</div>
          <div style={{ color: TEXT, fontSize: 17, fontWeight: 700 }}>$4.98</div>
          <div style={{ color: MUTE, fontSize: 14, marginTop: 4 }}>One-time. ~25¢ a scene. Type or speak your lines.</div>
        </div>
        {err && <div style={{ color: '#ff9b9b', fontSize: 17, marginBottom: 10 }}>{err}</div>}
        <button disabled={buying} onClick={onBuy} style={{ width: '100%', background: `linear-gradient(135deg,${AMBER_DEEP},${AMBER})`, color: INK, border: 'none', borderRadius: 12, padding: '15px', fontWeight: 800, fontFamily: 'inherit', fontSize: 18, cursor: buying ? 'wait' : 'pointer' }}>
          {buying ? 'Opening checkout…' : 'Unlock 20 Scenes — $4.98'}
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 10, background: 'transparent', color: MUTE, border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>
          Maybe later
        </button>
      </div>
    </div>
  )
}
