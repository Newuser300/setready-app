'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/* ════════════════════════════════════════════════════════════════════
   A-LIST — the AI scene-partner game
   You audition opposite an AI character; a Director scores your take; you
   climb from Extra to Legend. Scenes are generated, so it never repeats.
   Visual identity: a screening room. Theatrical black, one tungsten-amber
   spotlight accent, shooting-script slates, a stamped director's verdict.
════════════════════════════════════════════════════════════════════ */

const SAVE_KEY = 'sr-alist-save'
const RANKS = ['Extra', 'Day Player', 'Supporting', 'Lead', 'A-List', 'Legend']
// Buzz thresholds to reach each rank (index aligns with RANKS).
const RANK_AT = [0, 120, 360, 800, 1600, 3200]
const GENRES = ['Drama', 'Rom-Com', 'Horror', 'Action', 'Thriller', 'Sci-Fi', 'Soap Opera', 'Period Drama', 'Comedy', 'Crime']

type Save = { buzz: number; auditions: number; bestOverall: number; filmography: any[]; lastDailyDate: string; dailyStreak: number }
const DEFAULT_SAVE: Save = { buzz: 0, auditions: 0, bestOverall: 0, filmography: [], lastDailyDate: '', dailyStreak: 0 }

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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSave(loadSave()); setReady(true) }, [])
  useEffect(() => { if (ready) try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch {} }, [save, ready])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [history, reacting])

  const rank = rankFor(save.buzz)
  const dailyAvailable = save.lastDailyDate !== todayStr()

  async function api(payload: any) {
    const res = await fetch('/api/alist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Request failed')
    return data
  }

  async function startScene(opts: { daily?: boolean; genre?: string }) {
    setErr(''); setLoading(true); setIsDaily(!!opts.daily)
    setLoadMsg(opts.daily ? 'Casting today’s audition…' : 'Finding you a scene…')
    try {
      const { scene } = await api({ action: 'scene', rank: rank.name, genre: opts.genre })
      setScene(scene)
      setHistory([{ who: 'partner', text: scene.partnerOpensWith, beat: 'opening' }])
      setResult(null); setDraft(''); setScreen('scene')
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
          <Link href="/dashboard" style={{ color: MUTE, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>← Dashboard</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div className="alist-display" style={{ fontSize: 22, color: AMBER }}>{save.buzz.toLocaleString()}<span style={{ fontSize: 12, color: MUTE, marginLeft: 4, letterSpacing: '.1em' }}>BUZZ</span></div>
            </div>
          </div>
        </div>

        {screen === 'stage' && <Stage save={save} rank={rank} dailyAvailable={dailyAvailable} loading={loading} loadMsg={loadMsg} err={err}
          onDaily={() => startScene({ daily: true })} onAudition={() => startScene({})} pickGenre={pickGenre} setPickGenre={setPickGenre}
          onGenre={(g: string) => startScene({ genre: g })} />}

        {screen === 'scene' && scene && <SceneView scene={scene} history={history} draft={draft} setDraft={setDraft} reacting={reacting}
          loading={loading} loadMsg={loadMsg} err={err} onDeliver={deliver} onCut={callCut} scrollRef={scrollRef} isDaily={isDaily} />}

        {screen === 'result' && result && <ResultView result={result} scene={scene} save={save} rank={rankFor(save.buzz)} isDaily={isDaily}
          onAgain={() => setScreen('stage')} />}
      </div>
    </div>
  )
}

/* ───────────────────────── STAGE (home) ───────────────────────── */
function Stage({ save, rank, dailyAvailable, loading, loadMsg, err, onDaily, onAudition, pickGenre, setPickGenre, onGenre }: any) {
  return (
    <div className="alist-in">
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <div style={{ color: AMBER, letterSpacing: '.35em', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>NOW CASTING</div>
        <h1 className="alist-display" style={{ fontSize: 'clamp(56px,16vw,108px)', margin: 0, color: TEXT }}>A&#8209;LIST</h1>
        <p style={{ color: MUTE, fontSize: 15, maxWidth: 440, margin: '8px auto 0', lineHeight: 1.5 }}>
          Step into a scene. Act opposite a partner who reacts to your every choice. The Director is watching.
        </p>
      </div>

      {/* rank panel */}
      <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: MUTE, letterSpacing: '.18em', fontWeight: 700 }}>YOUR STANDING</div>
            <div className="alist-display" style={{ fontSize: 38, color: TEXT }}>{rank.name}</div>
          </div>
          <div style={{ textAlign: 'right', color: MUTE, fontSize: 12 }}>
            {rank.next ? <>Next: <span style={{ color: AMBER }}>{RANKS[rank.idx + 1]}</span><br />{(rank.next - save.buzz).toLocaleString()} buzz to go</> : <span style={{ color: AMBER }}>Top of the call sheet ★</span>}
          </div>
        </div>
        <div style={{ height: 7, background: PANEL2, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${Math.round(rank.into * 100)}%`, height: '100%', background: `linear-gradient(90deg,${AMBER_DEEP},${AMBER})`, borderRadius: 99, transition: 'width .5s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, color: MUTE }}>
          <span>{save.auditions} auditions</span>
          <span>Best take: <span style={{ color: TEXT }}>{save.bestOverall}</span></span>
          {save.dailyStreak > 0 && <span>🔥 {save.dailyStreak}-day streak</span>}
        </div>
      </div>

      {err && <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff9b9b', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{err}</div>}

      {/* daily */}
      <button className="alist-btn" disabled={loading || !dailyAvailable} onClick={onDaily}
        style={{ width: '100%', textAlign: 'left', background: dailyAvailable ? `linear-gradient(135deg, ${AMBER_DEEP}, ${AMBER})` : PANEL, color: dailyAvailable ? INK : MUTE, border: dailyAvailable ? 'none' : `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', cursor: loading || !dailyAvailable ? 'default' : 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>🎬 Daily Audition</div>
            <div style={{ fontSize: 12, opacity: .85, marginTop: 2 }}>{dailyAvailable ? 'A fresh scene, once a day. Bonus buzz + keep your streak.' : 'Done for today — come back tomorrow.'}</div>
          </div>
          {dailyAvailable && <span style={{ fontSize: 22 }}>→</span>}
        </div>
      </button>

      {/* audition */}
      <button className="alist-btn" disabled={loading} onClick={onAudition}
        style={{ width: '100%', background: PANEL2, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', cursor: loading ? 'wait' : 'pointer', marginBottom: 12, fontFamily: 'inherit', textAlign: 'left' }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{loading ? loadMsg : '🎭 New Audition'}</div>
        <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>A surprise scene, scaled to your standing.</div>
      </button>

      {/* genre picker */}
      <button className="alist-btn" disabled={loading} onClick={() => setPickGenre(pickGenre ? null : 'open')}
        style={{ width: '100%', background: 'transparent', color: MUTE, border: `1px dashed ${LINE}`, borderRadius: 14, padding: '12px 18px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
        🎞️ Choose a genre instead
      </button>
      {pickGenre && (
        <div className="alist-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {GENRES.map(g => (
            <button key={g} className="alist-btn" disabled={loading} onClick={() => onGenre(g)}
              style={{ background: PANEL, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 99, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{g}</button>
          ))}
        </div>
      )}

      {/* filmography */}
      {save.filmography.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 11, color: MUTE, letterSpacing: '.18em', fontWeight: 700, marginBottom: 10 }}>YOUR FILMOGRAPHY</div>
          {save.filmography.slice(0, 6).map((f: any, i: number) => {
            const tone = VERDICT_TONE[f.verdict] || { c: MUTE, bg: 'transparent' }
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${LINE}` }}>
                <div><span style={{ color: TEXT, fontWeight: 600, fontSize: 14 }}>{f.title}</span> <span style={{ color: MUTE, fontSize: 12 }}>· {f.genre}</span></div>
                <span style={{ color: tone.c, background: tone.bg, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, letterSpacing: '.04em' }}>{f.verdict}</span>
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
            <span style={{ color: AMBER, fontSize: 11, letterSpacing: '.2em', fontWeight: 700 }}>{isDaily ? 'DAILY · ' : ''}{scene.genre?.toUpperCase()}</span>
            <span style={{ color: MUTE, fontSize: 11, letterSpacing: '.08em' }}>{scene.slug}</span>
          </div>
          <h2 className="alist-display" style={{ fontSize: 30, margin: '2px 0 8px', color: TEXT }}>{scene.title}</h2>
          <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.55, margin: '0 0 8px' }}>{scene.setup}</p>
          <p style={{ color: MUTE, fontSize: 12.5, margin: 0 }}><span style={{ color: AMBER }}>Your objective:</span> {scene.objective}</p>
        </div>
      </div>

      {/* dialogue */}
      <div ref={scrollRef} style={{ maxHeight: '42vh', overflowY: 'auto', padding: '2px 2px 4px', marginBottom: 12 }}>
        {history.map((h: Line, i: number) => (
          h.who === 'partner' ? (
            <div key={i} className="alist-in" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: '.08em', marginBottom: 3 }}>{scene.partnerName?.toUpperCase()}{h.beat ? <span style={{ color: MUTE, fontWeight: 500 }}> · {h.beat}</span> : ''}</div>
              <div style={{ background: PANEL2, border: `1px solid ${LINE}`, borderRadius: '4px 14px 14px 14px', padding: '11px 14px', fontSize: 14.5, lineHeight: 1.5, color: TEXT }}>{h.text}</div>
            </div>
          ) : (
            <div key={i} className="alist-in" style={{ marginBottom: 12, textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: MUTE, fontWeight: 700, letterSpacing: '.08em', marginBottom: 3 }}>YOU</div>
              <div style={{ display: 'inline-block', background: `linear-gradient(135deg,${AMBER_DEEP},${AMBER})`, color: INK, borderRadius: '14px 4px 14px 14px', padding: '11px 14px', fontSize: 14.5, lineHeight: 1.5, fontWeight: 500, maxWidth: '85%', textAlign: 'left' }}>{h.text}</div>
            </div>
          )
        ))}
        {reacting && <div style={{ fontSize: 12, color: MUTE, fontStyle: 'italic' }}>{scene.partnerName} reacts…</div>}
      </div>

      {err && <div style={{ color: '#ff9b9b', fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '18px', color: AMBER, fontSize: 14, fontWeight: 600 }}>{loadMsg}</div>
      ) : (
        <>
          {/* suggested lines (first turn only, as scaffolding) */}
          {playerTurns === 0 && scene.lines?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
              {scene.lines.map((l: string, i: number) => (
                <button key={i} className="alist-btn" disabled={reacting} onClick={() => onDeliver(l)}
                  style={{ textAlign: 'left', background: PANEL, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 11, padding: '11px 14px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.4 }}>
                  <span style={{ color: AMBER, marginRight: 6 }}>“</span>{l}<span style={{ color: AMBER }}>”</span>
                </button>
              ))}
              <div style={{ textAlign: 'center', color: MUTE, fontSize: 11, marginTop: 2 }}>— or write your own line below —</div>
            </div>
          )}

          {/* free input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Say your line…" rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onDeliver(draft) } }}
              disabled={reacting}
              style={{ flex: 1, background: PANEL, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 12, padding: '11px 14px', fontSize: 14.5, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.4 }} />
            <button className="alist-btn" disabled={reacting || !draft.trim()} onClick={() => onDeliver(draft)}
              style={{ background: draft.trim() ? `linear-gradient(135deg,${AMBER_DEEP},${AMBER})` : PANEL2, color: draft.trim() ? INK : MUTE, border: 'none', borderRadius: 12, padding: '12px 16px', cursor: draft.trim() ? 'pointer' : 'default', fontWeight: 800, fontFamily: 'inherit', fontSize: 14 }}>Deliver</button>
          </div>

          {/* CUT */}
          {playerTurns >= 1 && (
            <button className="alist-btn" disabled={reacting} onClick={onCut}
              style={{ width: '100%', marginTop: 12, background: 'transparent', color: AMBER, border: `1px solid ${AMBER_DEEP}`, borderRadius: 12, padding: '12px', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: 14, letterSpacing: '.05em' }}>
              ✂ CUT — end the take &amp; get the Director’s notes
            </button>
          )}
          <div style={{ textAlign: 'center', color: MUTE, fontSize: 11, marginTop: 8 }}>Play 1–4 exchanges, then call CUT when your scene lands.</div>
        </>
      )}
    </div>
  )
}

/* ───────────────────────── RESULT ───────────────────────── */
function ResultView({ result, scene, save, rank, isDaily, onAgain }: any) {
  const tone = VERDICT_TONE[result.verdict] || { c: AMBER, bg: 'rgba(232,163,61,0.14)' }
  const dailyBonus = isDaily ? Math.round(result.buzz * 0.5) : 0
  return (
    <div className="alist-in" style={{ textAlign: 'center' }}>
      <div style={{ color: MUTE, letterSpacing: '.3em', fontSize: 11, fontWeight: 700, marginBottom: 14 }}>THE DIRECTOR’S VERDICT</div>

      {/* stamped verdict */}
      <div style={{ display: 'inline-block', border: `2.5px solid ${tone.c}`, color: tone.c, background: tone.bg, borderRadius: 12, padding: '12px 26px', transform: 'rotate(-2.5deg)', marginBottom: 22 }}>
        <span className="alist-display" style={{ fontSize: 40 }}>{result.verdict}</span>
      </div>

      {/* score bars */}
      <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16, textAlign: 'left' }}>
        {[['Truth', result.scores?.truth], ['Presence', result.scores?.presence], ['Originality', result.scores?.originality]].map(([label, v]: any) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: MUTE }}>{label}</span><span style={{ color: TEXT, fontWeight: 700 }}>{v ?? 0}</span></div>
            <div style={{ height: 6, background: PANEL2, borderRadius: 99 }}><div style={{ width: `${v ?? 0}%`, height: '100%', background: `linear-gradient(90deg,${AMBER_DEEP},${AMBER})`, borderRadius: 99 }} /></div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
          <span style={{ color: MUTE, fontSize: 13 }}>Overall</span>
          <span className="alist-display" style={{ fontSize: 34, color: AMBER }}>{result.overall}</span>
        </div>
      </div>

      {/* note */}
      <div style={{ background: PANEL2, border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', marginBottom: 10, textAlign: 'left' }}>
        <div style={{ fontSize: 11, color: AMBER, letterSpacing: '.15em', fontWeight: 700, marginBottom: 6 }}>NOTES</div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: TEXT, fontStyle: 'italic' }}>“{result.note}”</p>
        {result.highlight && <p style={{ margin: '10px 0 0', fontSize: 13, color: MUTE }}><span style={{ color: AMBER }}>Best moment:</span> {result.highlight}</p>}
      </div>

      {/* buzz */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '18px 0' }}>
        <span className="alist-display" style={{ fontSize: 44, color: AMBER }}>+{result.buzz + dailyBonus}</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, color: MUTE, letterSpacing: '.1em' }}>BUZZ EARNED</div>
          {dailyBonus > 0 && <div style={{ fontSize: 11, color: AMBER }}>incl. +{dailyBonus} daily bonus 🔥</div>}
        </div>
      </div>

      {rank.next && save.buzz >= rank.next - result.buzz && save.buzz < rank.next ? null : null}

      <button className="alist-btn" onClick={onAgain}
        style={{ width: '100%', background: `linear-gradient(135deg,${AMBER_DEEP},${AMBER})`, color: INK, border: 'none', borderRadius: 14, padding: '15px', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: 16 }}>
        Back to the Stage
      </button>
    </div>
  )
}
