'use client';

/**
 * BGReady FX — the film-set animation layer.
 *
 * One component, mounted once in the root layout. Everything it does is a
 * decoration: overlays, sprites and route-scoped CSS hooks. Every effect is
 * wrapped in try/catch and reduced-motion aware. If a target isn't found the
 * effect simply doesn't play — nothing here can break the app.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import ComedyStage from './ComedyStage';

/* ---------- tiny sprite library (inline SVG, stroke stickmen) ---------- */

const INK = '#e5e7eb';
const AMBER = '#F59E0B';

function Clapper() {
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true">
      <g className="stick">
        <rect x="8" y="18" width="104" height="16" rx="3" fill="#111327" stroke={AMBER} strokeWidth="2" />
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={12 + i * 26} y="20" width="14" height="12" fill={AMBER} transform={`skewX(-18)`} />
        ))}
      </g>
      <rect x="8" y="36" width="104" height="46" rx="4" fill="#111327" stroke={AMBER} strokeWidth="2" />
      <text x="16" y="53" fill={INK} fontSize="9" fontWeight="900" fontFamily="monospace">BGREADY</text>
      <text x="16" y="66" fill="#9ca3af" fontSize="7" fontFamily="monospace">SCENE 53 · TAKE 1</text>
      <text x="16" y="76" fill="#9ca3af" fontSize="7" fontFamily="monospace">DIR: YOU</text>
    </svg>
  );
}

function Megaphone() {
  return (
    <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true">
      <g className="bgfx-mega">
        <path d="M4 12 L18 6 L18 22 L4 16 Z" fill={AMBER} />
        <path d="M18 8 q8 6 0 12" stroke={AMBER} strokeWidth="2" fill="none" />
        <line x1="6" y1="16" x2="6" y2="24" stroke={AMBER} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function RunnerSVG({ note }: { note?: string }) {
  return (
    <div className="bgfx-run" style={{ position: 'relative' }}>
      {note ? <div className="note">{note}</div> : null}
      <svg width="34" height="44" viewBox="0 0 24 40" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" aria-hidden="true">
        <circle cx="12" cy="6" r="4.2" fill="#111327" />
        <line x1="12" y1="10" x2="12" y2="24" />
        <line className="a1" x1="12" y1="14" x2="4" y2="18" />
        <line className="a2" x1="12" y1="14" x2="20" y2="17" />
        <line className="g1" x1="12" y1="24" x2="5" y2="36" />
        <line className="g2" x1="12" y1="24" x2="19" y2="36" />
        {/* walkie */}
        <rect x="19" y="13" width="4" height="7" rx="1" fill={AMBER} stroke="none" />
        <line x1="21" y1="13" x2="21" y2="9" stroke={AMBER} />
      </svg>
    </div>
  );
}

function CraftSneak() {
  return (
    <div className="lean">
      <svg width="44" height="52" viewBox="0 0 30 44" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4.2" fill="#111327" />
        <line x1="12" y1="12" x2="12" y2="27" />
        <line x1="12" y1="16" x2="20" y2="13" />
        <line x1="12" y1="17" x2="21" y2="19" />
        <line x1="12" y1="27" x2="6" y2="39" />
        <line x1="12" y1="27" x2="18" y2="39" />
        <g className="stack" stroke="none">
          <rect x="18" y="2" width="9" height="4" rx="1" fill={AMBER} />
          <rect x="17.5" y="6.5" width="10" height="4" rx="1" fill="#d97706" />
          <rect x="18.5" y="11" width="8" height="4" rx="1" fill={AMBER} />
          <circle cx="22" cy="-1" r="2.4" fill="#d97706" />
        </g>
      </svg>
    </div>
  );
}

function BoomMic({ count }: { count: number }) {
  return (
    <div className="bgfx-boom" aria-hidden="true">
      <svg width="120" height="66" viewBox="0 0 120 66">
        <line x1="60" y1="-30" x2="60" y2="34" stroke="#6b7280" strokeWidth="4" />
        <ellipse cx="60" cy="46" rx="22" ry="13" fill="#374151" />
        <ellipse cx="60" cy="46" rx="22" ry="13" fill="none" stroke="#4b5563" strokeWidth="2" strokeDasharray="3 3" />
      </svg>
      <div className="cnt">{count} unread</div>
    </div>
  );
}

function TypistCameo() {
  return (
    <div className="bgfx-star" aria-hidden="true">
      <svg width="110" height="70" viewBox="0 0 110 70">
        {/* desk + typewriter */}
        <line x1="14" y1="56" x2="96" y2="56" stroke="#4b5563" strokeWidth="3" />
        <rect x="52" y="42" width="30" height="12" rx="2" fill="#374151" />
        <rect x="55" y="36" width="24" height="7" rx="1.5" fill="#111327" stroke="#6b7280" />
        <g stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none">
          <circle cx="34" cy="22" r="4" fill="#111327" />
          <line x1="34" y1="26" x2="34" y2="44" />
          <g className="arm" style={{ transformBox: 'fill-box', transformOrigin: '0 0', animation: 'bgfxHands .18s ease-in-out infinite alternate' }}>
            <line x1="34" y1="32" x2="54" y2="42" />
          </g>
          <line x1="34" y1="32" x2="50" y2="46" />
          <line x1="34" y1="44" x2="28" y2="56" />
          <line x1="34" y1="44" x2="40" y2="56" />
        </g>
        {/* flying letters */}
        <text x="86" y="26" fontSize="8" fill="#9ca3af" style={{ animation: 'bgfxMote 3s linear infinite' }}>a</text>
        <text x="92" y="18" fontSize="8" fill="#9ca3af" style={{ animation: 'bgfxMote 3.6s linear infinite' }}>k</text>
      </svg>
    </div>
  );
}

function RisingStar() {
  return (
    <div className="bgfx-star" aria-hidden="true">
      <svg width="120" height="72" viewBox="0 0 120 72">
        {/* risers */}
        <rect x="6" y="52" width="30" height="14" fill="#1f2937" />
        <rect x="36" y="42" width="30" height="24" fill="#273449" />
        <rect x="66" y="32" width="30" height="34" fill="#32415c" />
        <g className="climb">
          <g stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none">
            <circle cx="16" cy="30" r="3.6" fill="#111327" />
            <line x1="16" y1="34" x2="16" y2="44" />
            <line x1="16" y1="37" x2="10" y2="41" />
            <line x1="16" y1="37" x2="22" y2="40" />
            <line x1="16" y1="44" x2="12" y2="51" />
            <line x1="16" y1="44" x2="20" y2="51" />
          </g>
        </g>
        <text className="tw" x="100" y="26" fontSize="18" fill={AMBER}>★</text>
      </svg>
    </div>
  );
}

function Handshake() {
  return (
    <div className="bgfx-shake2" aria-hidden="true">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <g stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none">
          <circle cx="30" cy="16" r="4" fill="#111327" />
          <line x1="30" y1="20" x2="30" y2="40" />
          <line x1="30" y1="40" x2="24" y2="56" /><line x1="30" y1="40" x2="36" y2="56" />
          <line className="arm" x1="30" y1="26" x2="56" y2="32" />
          <circle cx="86" cy="16" r="4" fill="#111327" />
          <line x1="86" y1="20" x2="86" y2="40" />
          <line x1="86" y1="40" x2="80" y2="56" /><line x1="86" y1="40" x2="92" y2="56" />
          <line className="arm" x1="86" y1="26" x2="60" y2="32" />
        </g>
        <g fill={AMBER} stroke="none">
          <path className="hat1" d="M24 9 h12 l-2 -5 h-8 Z" />
          <path className="hat2" d="M80 9 h12 l-2 -5 h-8 Z" />
        </g>
        <text x="52" y="24" fontSize="11" fill={AMBER}>✦</text>
      </svg>
    </div>
  );
}

function DollyRig() {
  return (
    <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden="true">
      {/* track */}
      <line x1="0" y1="37" x2="64" y2="37" stroke="#4b5563" strokeWidth="2" />
      {/* dolly cart */}
      <rect x="18" y="28" width="26" height="6" rx="2" fill="#374151" />
      <circle cx="24" cy="36" r="3" fill="#6b7280" /><circle cx="38" cy="36" r="3" fill="#6b7280" />
      {/* camera */}
      <rect x="24" y="18" width="14" height="9" rx="2" fill="#111327" stroke="#6b7280" />
      <circle cx="41" cy="22" r="4" fill="#111327" stroke={AMBER} strokeWidth="1.5" />
      {/* operator */}
      <g stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none">
        <circle cx="12" cy="14" r="3" fill="#111327" />
        <line x1="12" y1="17" x2="12" y2="27" />
        <line x1="12" y1="20" x2="20" y2="22" />
        <line x1="12" y1="27" x2="9" y2="34" /><line x1="12" y1="27" x2="15" y2="34" />
      </g>
    </svg>
  );
}

/* ---------- helpers ---------- */

function reduced(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/* ---------- the FX director ---------- */

export default function BgFx() {
  const pathname = usePathname() || '/';
  const [clap, setClap] = useState(0);          // route clapper (key to retrigger)
  const [action, setAction] = useState(false);  // director banner
  const [craft, setCraft] = useState(0);        // craft services run
  const [pa, setPa] = useState<string | null>(null);
  const [gate, setGate] = useState<string | null>(null);
  const [boom, setBoom] = useState(0);
  const [wrap, setWrap] = useState(false);
  const [spot, setSpot] = useState(0);
  const [carpet, setCarpet] = useState(false);
  const [flashes, setFlashes] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [dollyX, setDollyX] = useState(0);
  const seenFirst = useRef(false);
  const lastGate = useRef(0);
  const [stageAct, setStageAct] = useState(-1);
  const stageT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionShown = useRef(false);

  const seg = pathname.split('/')[1] || 'home';

  /* route-scoped CSS hook */
  useEffect(() => {
    try { document.body.dataset.bgfx = seg; } catch {}
  }, [seg]);

  /* #1 clapper on route change (skip very first paint) */
  useEffect(() => {
    if (reduced()) return;
    if (!seenFirst.current) { seenFirst.current = true; return; }
    setClap(c => c + 1);
    const t = setTimeout(() => setClap(0), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* #2 director ACTION on first dashboard visit per session */
  useEffect(() => {
    if (reduced() || actionShown.current) return;
    if (seg !== 'dashboard') return;
    actionShown.current = true;
    setAction(true);
    const t = setTimeout(() => setAction(false), 3600);
    return () => clearTimeout(t);
  }, [seg]);

  /* #4 craft services sneak — every ~3 minutes, anywhere */
  useEffect(() => {
    if (reduced()) return;
    const iv = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setCraft(c => c + 1);
      setTimeout(() => setCraft(0), 9200);
    }, 180000);
    return () => clearInterval(iv);
  }, []);

  /* #10 PA sprint when arriving at casting pages; also via window event */
  useEffect(() => {
    if (reduced()) return;
    if (seg === 'casting' || seg === 'casting-portal') {
      const t = setTimeout(() => {
        setPa('NEW CASTING NOTICE!');
        setTimeout(() => setPa(null), 5600);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [seg]);

  /* event bus: other code (or the console) can trigger effects */
  useEffect(() => {
    const onPa = (e: Event) => { if (!reduced()) { setPa((e as CustomEvent).detail || 'CASTING UPDATE!'); setTimeout(() => setPa(null), 5600); } };
    const onGate = (e: Event) => { if (!reduced()) { setGate((e as CustomEvent).detail === false ? 'HAIR IN THE GATE — GOING AGAIN' : "GATE'S CLEAN ✓"); setTimeout(() => setGate(null), 1600); } };
    const onUnread = (e: Event) => { const n = Number((e as CustomEvent).detail) || 0; if (!reduced() && n > 0) { setBoom(n); setTimeout(() => setBoom(0), 4800); } };
    window.addEventListener('bgfx:pa', onPa);
    window.addEventListener('bgfx:gate', onGate);
    window.addEventListener('bgfx:unread', onUnread);
    return () => {
      window.removeEventListener('bgfx:pa', onPa);
      window.removeEventListener('bgfx:gate', onGate);
      window.removeEventListener('bgfx:unread', onUnread);
    };
  }, []);

  /* #16 boom mic on messages: read any numeric badge, best effort */
  useEffect(() => {
    if (reduced() || seg !== 'messages') return;
    const t = setTimeout(() => {
      try {
        const badge = document.querySelector('[class*="badge"], [class*="unread"]');
        const n = badge ? parseInt(badge.textContent || '', 10) : NaN;
        if (!isNaN(n) && n > 0) { setBoom(n); setTimeout(() => setBoom(0), 4800); }
      } catch {}
    }, 900);
    return () => clearTimeout(t);
  }, [seg]);

  /* #20 wrap on sign-out clicks (non-blocking; logout proceeds untouched) */
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (reduced()) return;
      try {
        const el = (ev.target as HTMLElement)?.closest('button, a, [role="button"]') as HTMLElement | null;
        if (!el) return;
        const t = (el.textContent || '').trim().toLowerCase();
        if (/^(sign out|log out|logout|sign-out)$/.test(t)) {
          setWrap(true);
          setTimeout(() => setWrap(false), 2000);
        } else if (/^(save|save changes|save entry|update|submit)$/.test(t)) {
          const now = Date.now();
          if (now - lastGate.current > 4000) {
            lastGate.current = now;
            setTimeout(() => {
              setGate("GATE'S CLEAN ✓");
              setTimeout(() => setGate(null), 1600);
            }, 450);
          }
        }
      } catch {}
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  /* #15 glossary spotlight sweep on entry */
  useEffect(() => {
    if (reduced() || seg !== 'glossary') return;
    setSpot(s => s + 1);
    const t = setTimeout(() => setSpot(0), 2600);
    return () => clearTimeout(t);
  }, [seg]);

  /* #9 a-list: red carpet + paparazzi flashes */
  useEffect(() => {
    if (reduced() || seg !== 'a-list') { setCarpet(false); return; }
    setCarpet(true);
    let n = 0;
    const iv = setInterval(() => {
      n++;
      if (n > 7) { clearInterval(iv); return; }
      setFlashes(f => [...f.slice(-4), {
        x: 6 + Math.random() * 88,
        y: 12 + Math.random() * 60,
        id: Date.now() + n,
      }]);
    }, 420);
    const t = setTimeout(() => { setCarpet(false); setFlashes([]); }, 4200);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [seg]);

  /* #13 scroll dolly on learning module pages */
  useEffect(() => {
    if (reduced() || seg !== 'module') { setDollyX(-1); return; }
    setDollyX(0);
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        try {
          const h = document.documentElement.scrollHeight - window.innerHeight;
          const f = h > 80 ? Math.min((window.scrollY || 0) / h, 1) : 0;
          setDollyX(f);
        } catch {}
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [seg]);

  /* #14 games marquee: decorate game links, best effort */
  useEffect(() => {
    if (reduced() || seg !== 'games') return;
    const t = setTimeout(() => {
      try {
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href*="film-trivia"], a[href*="set-crashers"], a[href*="set-match"], a[href*="studio-tycoon"]'
        ).forEach(a => a.classList.add('bgfx-marquee'));
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [seg]);

  /* The Stickman Comedy Theatre: 5 acts, 2s intermissions, on the dashboard banner */
  useEffect(() => {
    if (reduced() || seg !== 'dashboard') { setStageAct(-1); return; }
    let alive = true;
    let i = 0;
    const ACT_MS = 8000, GAP_MS = 2000, FIRST_MS = 2500;
    const play = () => {
      if (!alive) return;
      setStageAct(i % 5);
      stageT.current = setTimeout(() => {
        if (!alive) return;
        setStageAct(-1);
        i++;
        stageT.current = setTimeout(play, GAP_MS);
      }, ACT_MS);
    };
    stageT.current = setTimeout(play, FIRST_MS);
    return () => { alive = false; if (stageT.current) clearTimeout(stageT.current); setStageAct(-1); };
  }, [seg]);

  /* Nicola port: amber shimmer on plain-text page headings */
  useEffect(() => {
    if (reduced()) return;
    const t = setTimeout(() => {
      try {
        document.querySelectorAll<HTMLElement>('h1, h2').forEach(el => {
          const txt = el.textContent || '';
          if (el.childElementCount === 0 && txt.trim().length > 0 && txt.length < 60
              && !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt)
              && !el.classList.contains('bgfx-shimmer')) {
            el.classList.add('bgfx-shimmer');
          }
        });
      } catch {}
    }, 450);
    return () => clearTimeout(t);
  }, [pathname]);

  /* #8 odometer: roll big stat numbers on dashboard, best effort */
  useEffect(() => {
    if (reduced() || seg !== 'dashboard') return;
    const t = setTimeout(() => {
      try {
        document.querySelectorAll<HTMLElement>('h1,h2,h3,p,span,div,b,strong').forEach(el => {
          if (el.childElementCount === 0 && /^\$?\d{1,6}(\.\d{1,2})?$/.test((el.textContent || '').trim())
              && el.offsetHeight > 0 && parseFloat(getComputedStyle(el).fontSize) >= 18
              && !el.classList.contains('bgfx-odo')) {
            el.classList.add('bgfx-odo');
          }
        });
      } catch {}
    }, 700);
    return () => clearTimeout(t);
  }, [seg]);

  const flash = useCallback((f: { x: number; y: number; id: number }) => (
    <i key={f.id} className="bgfx-flash" style={{ left: `${f.x}%`, top: `${f.y}%` }} />
  ), []);

  return (
    <>
      {clap > 0 && <div className="bgfx-clap" key={clap}><Clapper /></div>}

      {action && (
        <div className="bgfx-action" aria-hidden="true">
          <div className="inner">
            <Megaphone />
            <span className="txt">BACKGROUND… <i>ACTION!</i></span>
          </div>
        </div>
      )}

      {craft > 0 && <div className="bgfx-craft" key={`c${craft}`} aria-hidden="true"><CraftSneak /></div>}

      {pa && <div className="bgfx-pa" aria-hidden="true"><RunnerSVG note={pa} /></div>}

      {gate && (
        <div className="bgfx-gate" aria-hidden="true">
          <div className="iris" />
          <div className="msg">{gate}</div>
        </div>
      )}

      {boom > 0 && <BoomMic count={boom} />}

      {wrap && (
        <div className="bgfx-wrap" aria-hidden="true">
          <div className="lights"><i /><i /><i /><i /><i /></div>
          <div className="t">THAT&rsquo;S A WRAP!</div>
        </div>
      )}

      {spot > 0 && <div className="bgfx-spot" key={`s${spot}`} aria-hidden="true" />}

      {carpet && <div className="bgfx-carpet" aria-hidden="true" />}
      {flashes.map(flash)}

      {seg === 'module' && dollyX >= 0 && (
        <div className="bgfx-dolly" style={{ transform: `translateX(${dollyX * 88}vw)` }} aria-hidden="true">
          <DollyRig />
        </div>
      )}

      {seg === 'install' && !reduced() && (
        <div className="bgfx-beam" aria-hidden="true"><i /><i /><i /><i /></div>
      )}

      {seg === 'journal' && !reduced() && <TypistCameo />}
      {seg === 'dashboard' && <ComedyStage act={stageAct} />}
      {seg === 'membership' && !reduced() && <RisingStar />}
      {seg === 'agencies' && !reduced() && <Handshake />}
    </>
  );
}
