'use client';

/**
 * The Stickman Comedy Theatre — five acts playing along the bottom edge of the
 * dashboard hero banner, one after another with a 2-second intermission, looping.
 * Anchored inside the banner (scrolls away with it), pointer-transparent,
 * aria-hidden, disabled under reduced motion. Self-directing: mount it and go.
 */

import { useEffect, useState } from 'react';

const INK = '#e5e7eb';
const NAVY = '#1a1a2e';
const AMBER = '#F59E0B';

function Man({ cls, flail }: { cls?: string; flail?: boolean }) {
  return (
    <div className={cls || undefined}>
      <div className={flail ? 'bgfx-flail flailwrap' : undefined}>
        <svg width="24" height="42" viewBox="0 0 24 40" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" aria-hidden="true">
          <circle cx="12" cy="6" r="4.2" fill={NAVY} />
          <line x1="12" y1="10" x2="12" y2="24" />
          <line className="a1" x1="12" y1="14" x2="4" y2="19" />
          <line className="a2" x1="12" y1="14" x2="20" y2="18" />
          <line className="g1" x1="12" y1="24" x2="5" y2="37" />
          <line className="g2" x1="12" y1="24" x2="19" y2="37" />
        </svg>
      </div>
    </div>
  );
}

function MegaMan() {
  /* the assistant director: megaphone raised, zero patience */
  return (
    <svg width="34" height="42" viewBox="0 0 34 40" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" aria-hidden="true">
      <circle cx="12" cy="6" r="4.2" fill={NAVY} />
      <line x1="12" y1="10" x2="12" y2="24" />
      <line x1="12" y1="15" x2="4" y2="20" />
      <line x1="12" y1="24" x2="5" y2="37" />
      <line x1="12" y1="24" x2="19" y2="37" />
      <g className="marm">
        <line x1="12" y1="14" x2="22" y2="10" />
        <path d="M22 6 L31 2 L31 14 L22 11 Z" fill={AMBER} stroke="none" />
      </g>
    </svg>
  );
}

/* ---------- backdrops: set dressing per act, faint silhouettes ---------- */

function LightStand({ x }: { x: string }) {
  return (
    <div className="prop" style={{ left: x }}>
      <svg width="26" height="58" viewBox="0 0 26 58" aria-hidden="true">
        <g stroke="#4b5563" strokeWidth="2" fill="none">
          <line x1="13" y1="14" x2="13" y2="48" />
          <line x1="13" y1="48" x2="4" y2="57" /><line x1="13" y1="48" x2="22" y2="57" />
        </g>
        <rect x="5" y="2" width="16" height="12" rx="2" fill="#374151" />
        <rect x="7" y="4" width="12" height="8" rx="1" fill="rgba(245,158,11,.5)" />
      </svg>
    </div>
  );
}

function CameraProp({ x }: { x: string }) {
  return (
    <div className="prop" style={{ left: x }}>
      <svg width="34" height="50" viewBox="0 0 34 50" aria-hidden="true">
        <g stroke="#4b5563" strokeWidth="2" fill="none">
          <line x1="17" y1="26" x2="17" y2="40" />
          <line x1="17" y1="40" x2="8" y2="49" /><line x1="17" y1="40" x2="26" y2="49" />
        </g>
        <rect x="6" y="14" width="18" height="12" rx="2" fill="#374151" />
        <circle cx="28" cy="20" r="5" fill="#1f2937" stroke="#6b7280" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function Backdrop({ kind }: { kind: number }) {
  return (
    <div className="setbg" aria-hidden="true">
      <div className="setline" />
      {kind === 1 && (<><LightStand x="8%" /><LightStand x="88%" /><div className="tapex" style={{ left: '43%' }}>✕</div></>)}
      {kind === 2 && (
        <>
          <div className="prop" style={{ right: '6%' }}>
            <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden="true">
              <line x1="2" y1="20" x2="62" y2="20" stroke="#4b5563" strokeWidth="2.5" />
              <line x1="8" y1="20" x2="8" y2="38" stroke="#4b5563" strokeWidth="2" />
              <line x1="56" y1="20" x2="56" y2="38" stroke="#4b5563" strokeWidth="2" />
              <rect x="12" y="12" width="7" height="8" rx="1" fill="#374151" />
              <rect x="24" y="14" width="9" height="6" rx="1" fill="#374151" />
              <rect x="40" y="11" width="6" height="9" rx="1" fill="#374151" />
            </svg>
          </div>
          <div className="signtxt" style={{ right: '8%', top: 0 }}>CRAFTY</div>
        </>
      )}
      {kind === 3 && (
        <>
          <div className="prop" style={{ left: '12%' }}>
            <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true">
              <path d="M4 34 L4 12 Q4 3 15 3 Q26 3 26 12 L26 34 Z" fill="#374151" />
              <text x="15" y="20" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="monospace">RIP</text>
            </svg>
          </div>
          <div className="fog" />
        </>
      )}
      {kind === 4 && (
        <div className="prop" style={{ left: '6%' }}>
          <svg width="80" height="52" viewBox="0 0 80 52" aria-hidden="true">
            <path d="M2 52 L2 14 L12 14 L12 6 L22 6 L22 14 L34 14 L34 6 L44 6 L44 14 L56 14 L56 6 L66 6 L66 14 L78 14 L78 52 Z" fill="#26314a" />
          </svg>
        </div>
      )}
      {kind === 5 && (<><LightStand x="10%" /><CameraProp x="80%" /></>)}
    </div>
  );
}

/* Act 1 — The Dance Direction: the AD yells DANCE!, and by god, he dances. */
function Act1() {
  return (
    <div className="act act1" aria-hidden="true">
      <Backdrop kind={1} />
      <div className="fig dancer">
        <div className="idle"><Man /></div>
        <div className="dancing"><div className="spin"><div className="bob"><Man flail /></div></div></div>
      </div>
      <div className="fig megaman"><MegaMan /></div>
      <div className="note2 shout">DANCE!</div>
      <span className="notesong n1">♪</span>
      <span className="notesong n2">♫</span>
    </div>
  );
}

/* Act 2 — The Coffee Run: gravity 0, PA 1. */
function Act2() {
  return (
    <div className="act act2" aria-hidden="true">
      <Backdrop kind={2} />
      <div className="fig runner">
        <div className="bgfx-run">
          <svg width="24" height="42" viewBox="0 0 24 40" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" aria-hidden="true">
            <circle cx="12" cy="6" r="4.2" fill={NAVY} />
            <line x1="12" y1="10" x2="12" y2="24" />
            <line className="a1" x1="12" y1="14" x2="4" y2="19" />
            <line className="a2" x1="12" y1="14" x2="20" y2="18" />
            <line className="g1" x1="12" y1="24" x2="5" y2="37" />
            <line className="g2" x1="12" y1="24" x2="19" y2="37" />
          </svg>
        </div>
      </div>
      <i className="cup c1" /><i className="cup c2" /><i className="cup c3" />
      <div className="note2">nailed it</div>
    </div>
  );
}

/* Act 3 — The Zombie Extra: undead until Mom calls. */
function Act3() {
  return (
    <div className="act act3" aria-hidden="true">
      <Backdrop kind={3} />
      <div className="fig zom"><Man /></div>
      <div className="note2 ring">RING RING</div>
      <div className="note2 himom">hi mom</div>
    </div>
  );
}

/* Act 4 — The Never-Ending Death Scene: stabbed once, dies four times. */
function Act4() {
  return (
    <div className="act act4" aria-hidden="true">
      <Backdrop kind={4} />
      <div className="fig duel1"><Man /></div>
      <div className="fig duel2"><Man /></div>
      <i className="sword sw1" /><i className="sword sw2" />
      <i className="thumb" />
    </div>
  );
}

/* Act 5 — The Slate Snap: TAKE 2 claims another nose. */
function Act5() {
  return (
    <div className="act act5" aria-hidden="true">
      <Backdrop kind={5} />
      <div className="fig slateguy"><Man /></div>
      <div className="fig perf5"><Man /></div>
      <div className="slate">
        <svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true">
          <rect className="lid" x="1" y="1" width="24" height="5" rx="1" fill={AMBER} />
          <rect x="1" y="7" width="24" height="12" rx="1.5" fill={NAVY} stroke={AMBER} strokeWidth="1.4" />
        </svg>
      </div>
      <div className="note2 take2">TAKE 2</div>
      <i className="puff p1" /><i className="puff p2" /><i className="puff p3" />
    </div>
  );
}

const ACTS = [Act1, Act2, Act3, Act4, Act5];
const ACT_MS = 8000;
const GAP_MS = 2000;
const FIRST_MS = 2000;

export default function ComedyStage() {
  const [act, setAct] = useState(-1);

  useEffect(() => {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch {}
    let alive = true;
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const play = () => {
      if (!alive) return;
      setAct(i % ACTS.length);
      t = setTimeout(() => {
        if (!alive) return;
        setAct(-1);
        i++;
        t = setTimeout(play, GAP_MS);
      }, ACT_MS);
    };
    t = setTimeout(play, FIRST_MS);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  if (act < 0) return null;
  const Act = ACTS[act];
  return (
    <div className="bgfx-stage" aria-hidden="true">
      <Act />
    </div>
  );
}
