'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Copyright from '@/components/Copyright';
import { openCheckout } from '@/utils/isAndroidApp';

const SIZE = 8;
const TILES = ['🎬', '🎥', '💡', '🎤', '🎞️', '⭐'];
const SAVE_KEY = 'sr-set-match';
const MAX_LIVES = 5;
const REFILL_MS = 20 * 60 * 1000;
const BASE_MOVES = 22;

type Save = { level: number; lives: number; lastLifeAt: number; shuffles: number; best: number };
const DEFAULT_SAVE: Save = { level: 1, lives: MAX_LIVES, lastLifeAt: Date.now(), shuffles: 3, best: 0 };

const PERKS = [
  { id: 'unlimited_lives', emoji: '❤️‍🔥', name: 'Unlimited Lives', desc: 'Never wait for lives again.', price: '$4.99' },
  { id: 'extra_moves', emoji: '➕', name: '+5 Moves Every Level', desc: 'Start every level with 5 extra moves.', price: '$2.99' },
  { id: 'pro_player', emoji: '🌀', name: 'Pro Player', desc: 'Get 3 Shuffles at the start of every level.', price: '$2.99' },
];

function rt() { return Math.floor(Math.random() * TILES.length); }
function makeBoard(): number[][] {
  const b: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < SIZE; c++) {
      let t = rt(); let g = 0;
      while (g < 25 && ((c >= 2 && row[c - 1] === t && row[c - 2] === t) || (r >= 2 && b[r - 1][c] === t && b[r - 2][c] === t))) { t = rt(); g++; }
      row.push(t);
    }
    b.push(row);
  }
  return b;
}
function findMatches(b: number[][]): Set<number> {
  const m = new Set<number>();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE - 2; c++) {
    const t = b[r][c]; if (t < 0) continue;
    if (b[r][c + 1] === t && b[r][c + 2] === t) { let k = c; while (k < SIZE && b[r][k] === t) { m.add(r * SIZE + k); k++; } }
  }
  for (let c = 0; c < SIZE; c++) for (let r = 0; r < SIZE - 2; r++) {
    const t = b[r][c]; if (t < 0) continue;
    if (b[r + 1][c] === t && b[r + 2][c] === t) { let k = r; while (k < SIZE && b[k][c] === t) { m.add(k * SIZE + c); k++; } }
  }
  return m;
}
function collapse(b: number[][]): number[][] {
  const nb = b.map(r => r.slice());
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) { if (nb[r][c] >= 0) { const v = nb[r][c]; nb[r][c] = -1; nb[write][c] = v; write--; } }
    for (let r = write; r >= 0; r--) nb[r][c] = rt();
  }
  return nb;
}
function resolve(b: number[][]): { board: number[][]; cleared: number } {
  let board = b.map(r => r.slice()); let cleared = 0; let iter = 0;
  while (iter < 50) {
    const m = findMatches(board); if (m.size === 0) break;
    cleared += m.size;
    for (const i of m) board[Math.floor(i / SIZE)][i % SIZE] = -1;
    board = collapse(board); iter++;
  }
  return { board, cleared };
}
function hasAnyMove(b: number[][]): boolean {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc; if (r2 >= SIZE || c2 >= SIZE) continue;
      const nb = b.map(x => x.slice()); const tmp = nb[r][c]; nb[r][c] = nb[r2][c2]; nb[r2][c2] = tmp;
      if (findMatches(nb).size > 0) return true;
    }
  }
  return false;
}
function freshBoard(): number[][] { let b = makeBoard(); let g = 0; while (!hasAnyMove(b) && g < 12) { b = makeBoard(); g++; } return b; }
function targetFor(level: number) { return 600 + (level - 1) * 350; }

export default function SetMatch() {
  const [s, setS] = useState<Save>(DEFAULT_SAVE);
  const [ready, setReady] = useState(false);
  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(BASE_MOVES);
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'play' | 'won' | 'lost'>('play');
  const [owned, setOwned] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [showIntro, setShowIntro] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [now, setNow] = useState(Date.now());
  const sRef = useRef<Save>(s); sRef.current = s;
  const ownedRef = useRef<string[]>(owned); ownedRef.current = owned;

  const unlimited = owned.includes('unlimited_lives');
  const outOfLives = !unlimited && s.lives <= 0;
  const target = targetFor(s.level);

  useEffect(() => {
    let save: Save = { ...DEFAULT_SAVE };
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) save = { ...DEFAULT_SAVE, ...JSON.parse(raw) }; } catch {}
    const t = Date.now();
    if (save.lives < MAX_LIVES) {
      const ref = Math.floor((t - (save.lastLifeAt || t)) / REFILL_MS);
      if (ref > 0) { save.lives = Math.min(MAX_LIVES, save.lives + ref); save.lastLifeAt = save.lives >= MAX_LIVES ? t : (save.lastLifeAt || t) + ref * REFILL_MS; }
    }
    setS(save); setReady(true);
    setBoard(freshBoard()); setScore(0); setMoves(BASE_MOVES);
    setStatus(!(save.lives > 0) ? 'lost' : 'play');
    try { if (!localStorage.getItem('sr-setmatch-intro')) setShowIntro(true); } catch {}
  }, []);

  useEffect(() => { if (!ready) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(sRef.current)); } catch {} }, [s, ready]);

  useEffect(() => {
    if (!ready) return; let cancel = false;
    (async () => {
      try {
        const res = await fetch('/api/game-purchases?game=set-match');
        const d = await res.json();
        if (cancel || !d) return;
        setOwned(Array.isArray(d.items) ? d.items : []);
        if (window.location.search.includes('purchase=success')) { setNotice('Purchase complete!'); setTimeout(() => setNotice(''), 2600); window.history.replaceState({}, '', '/games/set-match'); }
      } catch {}
    })();
    return () => { cancel = true; };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      setNow(Date.now());
      setS(p => {
        if (ownedRef.current.includes('unlimited_lives') || p.lives >= MAX_LIVES) return p;
        const n = Date.now(); const ref = Math.floor((n - (p.lastLifeAt || n)) / REFILL_MS);
        if (ref <= 0) return p;
        const lives = Math.min(MAX_LIVES, p.lives + ref);
        return { ...p, lives, lastLifeAt: lives >= MAX_LIVES ? n : (p.lastLifeAt || n) + ref * REFILL_MS };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ready]);

  function startLevel() {
    setBoard(freshBoard()); setScore(0);
    const em = ownedRef.current.includes('extra_moves') ? 5 : 0;
    setMoves(BASE_MOVES + em);
    if (ownedRef.current.includes('pro_player')) setS(p => ({ ...p, shuffles: Math.max(p.shuffles, 3) }));
    setSel(null); setStatus('play');
  }

  function clickTile(r: number, c: number) {
    if (busy || status !== 'play' || outOfLives) return;
    if (!sel) { setSel({ r, c }); return; }
    if (sel.r === r && sel.c === c) { setSel(null); return; }
    if (Math.abs(sel.r - r) + Math.abs(sel.c - c) !== 1) { setSel({ r, c }); return; }
    const nb = board.map(x => x.slice());
    const tmp = nb[sel.r][sel.c]; nb[sel.r][sel.c] = nb[r][c]; nb[r][c] = tmp;
    if (findMatches(nb).size === 0) { setSel(null); return; }
    setBusy(true); setSel(null);
    const { board: solved, cleared } = resolve(nb);
    const ns = score + cleared * 10; const nm = moves - 1;
    setBoard(solved); setScore(ns);
    setTimeout(() => {
      let fin = solved;
      if (!hasAnyMove(fin)) { fin = freshBoard(); setBoard(fin); }
      setMoves(nm); setBusy(false);
      if (ns >= target) { setStatus('won'); setS(p => ({ ...p, level: p.level + 1, best: Math.max(p.best, ns) })); }
      else if (nm <= 0) { if (!unlimited) setS(p => ({ ...p, lives: Math.max(0, p.lives - 1), lastLifeAt: p.lives >= MAX_LIVES ? Date.now() : (p.lastLifeAt || Date.now()) })); setStatus('lost'); }
    }, 170);
  }

  function useShuffle() {
    if (busy || status !== 'play' || outOfLives) return;
    if ((s.shuffles || 0) <= 0) { setNotice('No shuffles left'); setTimeout(() => setNotice(''), 1600); return; }
    setS(p => ({ ...p, shuffles: p.shuffles - 1 })); setBoard(freshBoard()); setSel(null);
  }

  async function buyItem(item: string) {
    try {
      const res = await fetch('/api/checkout/set-match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item }) });
      const d = await res.json();
      if (d?.url) { openCheckout(d.url as string); return; }
      setNotice(d?.error || 'Could not start checkout — are you signed in?'); setTimeout(() => setNotice(''), 2600);
    } catch { setNotice('Could not start checkout.'); setTimeout(() => setNotice(''), 2600); }
  }

  const timeLeft = unlimited ? 0 : Math.max(0, REFILL_MS - (now - (s.lastLifeAt || now)));
  const countdown = `${Math.floor(timeLeft / 60000)}:${String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}`;
  const pct = Math.min(100, Math.round((score / target) * 100));
  const card = { backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif' }}>
      <div style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🎞️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '17px' }}>Set Match</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Match the props, clear the set</div>
              </div>
            </div>
            <Link href="/games" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}>← Games</Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px 16px 48px' }}>
        <div style={{ ...card, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '15px', color: '#1a1a2e' }}>Level {s.level}</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>{unlimited ? '❤️‍🔥 ∞' : '❤️ ' + s.lives}</span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', backgroundColor: '#16a34a', transition: 'width 0.2s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
            <span>Score {score} / {target}</span>
            <span style={{ fontWeight: 700, color: moves <= 5 ? '#dc2626' : '#374151' }}>Moves: {moves}</span>
          </div>
        </div>

        <div style={{ ...card, marginTop: '12px', padding: '10px 14px', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <div style={{ fontSize: '13px', color: '#1e40af', fontWeight: 600, lineHeight: '1.45' }}>👆 Tap a tile, then tap a neighbour to swap them. Line up <strong>3 or more</strong> of the same prop in a row or column to clear them and score.</div>
        </div>

        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: '4px' }}>
          {board.map((row, r) => row.map((v, c) => {
            const seld = !!sel && sel.r === r && sel.c === c;
            return (
              <button key={`${r}-${c}`} onClick={() => clickTile(r, c)}
                style={{ aspectRatio: '1', border: seld ? '3px solid #F59E0B' : '1px solid #e5e7eb', borderRadius: '8px', background: seld ? '#FEF3C7' : 'white', fontSize: '22px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                {TILES[v] ?? ''}
              </button>
            );
          }))}
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button onClick={useShuffle} disabled={busy || outOfLives}
            style={{ ...card, flex: 1, padding: '12px', textAlign: 'center', cursor: busy || outOfLives ? 'not-allowed' : 'pointer', opacity: busy || outOfLives ? 0.5 : 1, fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>
            🌀 Shuffle ({s.shuffles})
          </button>
          <button onClick={() => setShowHow(true)} style={{ ...card, padding: '12px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#6b7280' }}>ℹ️</button>
        </div>

        <div style={{ ...card, marginTop: '16px', padding: '14px 16px' }}>
          <button onClick={() => setGuideOpen(v => !v)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#374151' }}>ℹ️ How to play</span>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>{guideOpen ? 'Hide' : 'Show'}</span>
          </button>
          {guideOpen && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#4b5563', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 8px' }}><strong>The goal:</strong> clear each level by reaching the target score before your Moves run out.</p>
              <p style={{ margin: '0 0 8px' }}><strong>1. Pick a tile.</strong> Tap any prop on the board — it lights up with an orange border to show it is selected.</p>
              <p style={{ margin: '0 0 8px' }}><strong>2. Swap it.</strong> Tap a tile right next to it — up, down, left, or right. The two trade places.</p>
              <p style={{ margin: '0 0 8px' }}><strong>3. Make a line of 3 or more.</strong> A swap only works if it lines up three or more of the same prop in a row or column. If it would not, the tiles stay put and no Move is used — just try a different pair.</p>
              <p style={{ margin: '0 0 8px' }}><strong>What to look for:</strong> two of the same prop side by side, with a third of that prop one tile away that you can slide into line.</p>
              <p style={{ margin: '0 0 8px' }}>Matched props vanish, the ones above drop down, and fresh props fall in from the top — which can chain into more matches for bonus points.</p>
              <p style={{ margin: '0 0 8px' }}>The green bar tracks your progress to the target. Each swap spends one <strong>Move</strong>. Reach the target before Moves hit 0 to win the level and move on.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Lives:</strong> fail a level and you lose a heart ❤️. Hearts refill over time, or get Unlimited Lives in the Store.</p>
              <p style={{ margin: 0 }}><strong>No good moves left?</strong> Tap <strong>🌀 Shuffle</strong> to rearrange the whole board.</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', fontWeight: 800, fontSize: '14px', color: '#374151' }}>Store 💎</div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', marginBottom: '8px' }}>Optional — the game is free to play.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PERKS.map(p => {
            const have = owned.includes(p.id);
            return (
              <div key={p.id} style={{ ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.desc}</div>
                </div>
                {have
                  ? <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>Owned</span>
                  : <button onClick={() => buyItem(p.id)} style={{ backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{p.price}</button>}
              </div>
            );
          })}
        </div>

        <Copyright />
      </div>

      {notice && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#374151', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, zIndex: 85, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{notice}</div>
      )}

      {status === 'won' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 60 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '28px 24px', maxWidth: '320px', textAlign: 'center' }}>
            <div style={{ fontSize: '44px' }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a2e', marginTop: '8px' }}>Level {s.level - 1} complete!</div>
            <div style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 0' }}>Best score: {s.best}</div>
            <button onClick={startLevel} style={{ marginTop: '18px', width: '100%', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>Next Level →</button>
          </div>
        </div>
      )}

      {status === 'lost' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 60 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '28px 24px', maxWidth: '320px', textAlign: 'center' }}>
            <div style={{ fontSize: '44px' }}>{outOfLives ? '💔' : '😬'}</div>
            <div style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a2e', marginTop: '8px' }}>{outOfLives ? 'Out of lives' : 'Out of moves'}</div>
            {outOfLives ? (
              <>
                <div style={{ fontSize: '13px', color: '#6b7280', margin: '8px 0' }}>Next life in {countdown}</div>
                <button onClick={() => buyItem('unlimited_lives')} style={{ marginTop: '8px', width: '100%', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>❤️‍🔥 Get Unlimited Lives</button>
              </>
            ) : (
              <button onClick={startLevel} style={{ marginTop: '16px', width: '100%', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>Retry Level</button>
            )}
          </div>
        </div>
      )}

      {(showIntro || showHow) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 70 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '26px 24px', maxWidth: '360px' }}>
            <div style={{ fontSize: '40px', textAlign: 'center' }}>🎞️</div>
            <div style={{ fontWeight: 800, fontSize: '19px', color: '#1a1a2e', textAlign: 'center', marginTop: '6px' }}>How to play Set Match</div>
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6', marginTop: '12px' }}>
              <p style={{ margin: '0 0 8px' }}><strong>Goal:</strong> swap two side-by-side tiles to line up 3 or more of the same prop. They clear, new tiles drop in, and you score points.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Win a level</strong> by reaching the target score before you run out of moves.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Lives:</strong> fail a level and you lose a heart. Hearts refill over time, or get Unlimited Lives in the store.</p>
              <p style={{ margin: 0 }}><strong>Stuck?</strong> Use a Shuffle for a fresh board. Each level needs a higher score — see how far you can climb.</p>
            </div>
            <button onClick={() => { setShowIntro(false); setShowHow(false); try { localStorage.setItem('sr-setmatch-intro', '1'); } catch {} }} style={{ marginTop: '18px', width: '100%', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
