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
        <g stroke="#9ca3af" strokeWidth="2" fill="none">
          <line x1="13" y1="14" x2="13" y2="48" />
          <line x1="13" y1="48" x2="4" y2="57" /><line x1="13" y1="48" x2="22" y2="57" />
        </g>
        <rect x="5" y="2" width="16" height="12" rx="2" fill="#6b7280" />
        <rect x="7" y="4" width="12" height="8" rx="1" fill="rgba(245,158,11,.8)" />
      </svg>
    </div>
  );
}

function CameraProp({ x }: { x: string }) {
  return (
    <div className="prop" style={{ left: x }}>
      <svg width="34" height="50" viewBox="0 0 34 50" aria-hidden="true">
        <g stroke="#9ca3af" strokeWidth="2" fill="none">
          <line x1="17" y1="26" x2="17" y2="40" />
          <line x1="17" y1="40" x2="8" y2="49" /><line x1="17" y1="40" x2="26" y2="49" />
        </g>
        <rect x="6" y="14" width="18" height="12" rx="2" fill="#6b7280" />
        <circle cx="28" cy="20" r="5" fill="#4b5563" stroke="#6b7280" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function Backdrop({ kind }: { kind: number }) {
  return (
    <div className="setbg" aria-hidden="true">
      <div className="setline" />
      {kind === 1 && (<><LightStand x="8%" /><LightStand x="88%" /><div className="tapex" style={{ left: '43%' }}>✕</div></>)}
            {kind === 3 && (
        <>
          <div className="prop" style={{ left: '12%' }}>
            <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true">
              <path d="M4 34 L4 12 Q4 3 15 3 Q26 3 26 12 L26 34 Z" fill="#6b7280" />
              <text x="15" y="20" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="monospace">RIP</text>
            </svg>
          </div>
          <div className="fog" />
        </>
      )}
      {kind === 4 && (
        <div className="prop" style={{ left: '6%' }}>
          <svg width="80" height="52" viewBox="0 0 80 52" aria-hidden="true">
            <path d="M2 52 L2 14 L12 14 L12 6 L22 6 L22 14 L34 14 L34 6 L44 6 L44 14 L56 14 L56 6 L66 6 L66 14 L78 14 L78 52 Z" fill="#44536e" />
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
      <i className="banana" />
      <i className="cup c1" /><i className="cup c2" /><i className="cup c3" />
      <div className="note2 lattes">MY LATTES!</div>
      <div className="note2 nailed">nailed it</div>
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
      <div className="note2 himom">yes mom, I&rsquo;m being scary</div>
    </div>
  );
}

/* Act 4 — The Never-Ending Death Scene: stabbed once, dies four times. */
function Act4() {
  return (
    <div className="act act4" aria-hidden="true">
      <Backdrop kind={4} />
      <div className="fig duel1"><Man /></div>
      <div className="fig duel2"><div><Man /></div></div>
      <i className="sword sw1" /><i className="sword sw2" />
      <span className="sp sp1">✦</span><span className="sp sp2">✦</span><span className="sp sp3">✦</span>
      <i className="thumb" />
    </div>
  );
}

/* Act 5 — The Stunt: wire work, wire snap, "he\u2019s fine", triumphant exit. */
function Act5() {
  return (
    <div className="act act5" aria-hidden="true">
      <Backdrop kind={5} />
      <i className="wire" />
      <div className="fig stunt">
        <svg width="26" height="42" viewBox="0 0 26 40" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" aria-hidden="true">
          <path d="M13 12 L4 16 L6 27 L13 22 Z" fill={AMBER} stroke="none" opacity=".85" />
          <circle cx="13" cy="6" r="4.2" fill={NAVY} />
          <line x1="13" y1="10" x2="13" y2="24" />
          <line className="warm" x1="13" y1="14" x2="5" y2="19" />
          <line x1="13" y1="14" x2="21" y2="18" />
          <line x1="13" y1="24" x2="6" y2="37" />
          <line x1="13" y1="24" x2="20" y2="37" />
        </svg>
      </div>
      <div className="note2 snap">SNAP!</div>
      <div className="note2 fine">he&rsquo;s fine</div>
      <i className="puff p1" /><i className="puff p2" /><i className="puff p3" />
    </div>
  );
}


function SupeFly() {
  /* horizontal hero: fist forward, cape mid-flutter, dignity on cables */
  return (
    <svg width="46" height="26" viewBox="0 0 46 26" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" aria-hidden="true">
      <path className="cape" d="M18 10 L6 4 L9 13 L5 20 L18 15 Z" fill={AMBER} stroke="none" opacity=".9" />
      <circle cx="34" cy="8" r="4.2" fill={NAVY} />
      <line x1="16" y1="12" x2="30" y2="10" />
      <line x1="30" y1="10" x2="42" y2="6" />
      <line x1="24" y1="11" x2="28" y2="18" />
      <line x1="16" y1="12" x2="8" y2="17" />
      <line x1="16" y1="12" x2="7" y2="10" />
    </svg>
  );
}

function CraneRig() {
  /* camera crane + operator, pointed at the talent */
  return (
    <svg width="86" height="60" viewBox="0 0 86 60" aria-hidden="true">
      <g stroke="#9ca3af" strokeWidth="2.4" fill="none">
        <line x1="66" y1="56" x2="66" y2="34" />
        <line x1="66" y1="56" x2="56" y2="59" /><line x1="66" y1="56" x2="76" y2="59" />
      </g>
      <g className="carm">
        <line x1="66" y1="34" x2="14" y2="16" stroke="#9ca3af" strokeWidth="2.6" />
        <rect x="4" y="10" width="16" height="11" rx="2" fill="#6b7280" />
        <circle cx="2" cy="15" r="4" fill="#4b5563" stroke="#cbd5e1" strokeWidth="1.5" />
      </g>
      <g stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none">
        <circle cx="78" cy="30" r="3.8" fill={NAVY} />
        <line x1="78" y1="34" x2="78" y2="46" />
        <line x1="78" y1="38" x2="70" y2="40" />
        <line x1="78" y1="46" x2="73" y2="57" /><line x1="78" y1="46" x2="83" y2="57" />
      </g>
    </svg>
  );
}

function CloudGrip() {
  /* a grip walking a cloud-on-a-stick past the "flying" hero — movie magic */
  return (
    <svg width="40" height="62" viewBox="0 0 40 62" aria-hidden="true">
      <path d="M8 12 Q8 4 17 4 Q20 -2 27 2 Q36 0 36 8 Q40 14 32 16 L12 16 Q6 16 8 12 Z" fill="#e5e7eb" opacity=".95" />
      <line x1="22" y1="16" x2="22" y2="34" stroke="#9ca3af" strokeWidth="2" />
      <g stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none">
        <circle cx="18" cy="30" r="3.8" fill={NAVY} />
        <line x1="18" y1="34" x2="18" y2="46" />
        <line x1="18" y1="37" x2="24" y2="33" />
        <line x1="18" y1="38" x2="12" y2="42" />
        <line className="gl1" x1="18" y1="46" x2="12" y2="58" />
        <line className="gl2" x1="18" y1="46" x2="24" y2="58" />
      </g>
    </svg>
  );
}

function StickCar({ amber, beacon }: { amber?: boolean; beacon?: boolean }) {
  return (
    <svg width="52" height="30" viewBox="0 0 52 30" aria-hidden="true">
      {beacon && <rect className="beacon" x="22" y="0" width="7" height="4" rx="1.5" fill="#ef4444" />}
      <circle cx="20" cy="6" r="3.6" fill={NAVY} stroke={INK} strokeWidth="2" />
      <path d="M4 22 L8 13 L36 13 L44 18 L48 22 Z" fill={amber ? AMBER : '#9ca3af'} />
      <rect x="2" y="21" width="48" height="5" rx="2.5" fill={amber ? '#d97706' : '#6b7280'} />
      <g className="wh"><circle cx="13" cy="26" r="4" fill="#4b5563" stroke="#e5e7eb" strokeWidth="1.6" /><line x1="13" y1="23" x2="13" y2="29" stroke="#e5e7eb" strokeWidth="1.2" /></g>
      <g className="wh"><circle cx="39" cy="26" r="4" fill="#4b5563" stroke="#e5e7eb" strokeWidth="1.6" /><line x1="39" y1="23" x2="39" y2="29" stroke="#e5e7eb" strokeWidth="1.2" /></g>
    </svg>
  );
}

/* Act 6 — The Flying Shot: cables, crane, and a cloud on a stick. Cinema. */
function Act6() {
  return (
    <div className="act act6" aria-hidden="true">
      <div className="setbg"><div className="setline" /></div>
      <i className="cab cabA" /><i className="cab cabB" />
      <div className="supeF"><SupeFly /></div>
      <div className="fig supeW"><Man /></div>
      <div className="crane"><CraneRig /></div>
      <div className="grip"><CloudGrip /></div>
      <div className="note2 fly1">FLY HARDER!</div>
      <div className="note2 winch">MORE WINCH!</div>
    </div>
  );
}

/* Act 7 — The Car Chase: two cars, one ramp, zero permits. */
function Act7() {
  return (
    <div className="act act7" aria-hidden="true">
      <div className="setbg"><div className="setline" /></div>
      <i className="ramp" />
      <div className="car car1"><StickCar amber /></div>
      <div className="car car2"><StickCar beacon /></div>
      <div className="ped ped1"><Man /></div>
      <div className="ped ped2"><Man /></div>
      <div className="note2 yikes1">!</div>
      <div className="note2 yikes2">MY LUNCH!</div>
      <i className="puff q1" /><i className="puff q2" />
    </div>
  );
}

/* Act 8 — The Crossing: asked to cross. Moonwalks it. Backwards. */
function Act8() {
  return (
    <div className="act act8" aria-hidden="true">
      <div className="setbg"><div className="setline" /><div className="tapex" style={{ left: '20%' }}>✕</div><div className="tapex" style={{ left: '86%' }}>✕</div></div>
      <div className="fig ad8"><MegaMan /></div>
      <div className="note2 cross">CROSS!</div>
      <div className="mw">
        <div className="flip">
          <div className="leanb">
            <svg width="24" height="42" viewBox="0 0 24 40" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" aria-hidden="true">
              <path d="M5 3 L19 3 L17 -1 L7 -1 Z" fill={AMBER} stroke="none" />
              <circle cx="12" cy="6" r="4.2" fill={NAVY} />
              <line x1="12" y1="10" x2="12" y2="24" />
              <line className="a1" x1="12" y1="14" x2="4" y2="19" />
              <line className="a2" x1="12" y1="14" x2="20" y2="18" />
              <line className="g1" x1="12" y1="24" x2="5" y2="37" />
              <line className="g2" x1="12" y1="24" x2="19" y2="37" />
            </svg>
          </div>
        </div>
      </div>
      <div className="note2 heehee">♪ hee-hee</div>
    </div>
  );
}

const ACTS = [Act1, Act2, Act3, Act4, Act5, Act6, Act7, Act8];
const ACT_MS = 10000;
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
