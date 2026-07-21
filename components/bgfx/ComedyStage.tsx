'use client';

/**
 * The Stickman Comedy Theatre — five acts that play across the top banner,
 * one after another with a 2-second intermission, on a loop.
 * Purely decorative: pointer-events none, aria-hidden, reduced-motion exempt.
 */

const INK = '#e5e7eb';
const NAVY = '#1a1a2e';

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

function DirectorChair() {
  return (
    <div className="fig dchair">
      <svg width="42" height="48" viewBox="0 0 42 48" aria-hidden="true">
        <g stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <line x1="8" y1="26" x2="34" y2="26" />
          <line x1="9" y1="26" x2="4" y2="46" />
          <line x1="33" y1="26" x2="38" y2="46" />
          <line x1="11" y1="26" x2="35" y2="44" />
          <line x1="31" y1="26" x2="7" y2="44" />
          <rect x="8" y="10" width="4" height="14" fill="#F59E0B" stroke="none" />
        </g>
        <g stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none">
          <circle cx="22" cy="8" r="3.8" fill={NAVY} />
          <line x1="22" y1="12" x2="22" y2="24" />
          <line x1="22" y1="16" x2="30" y2="14" />
          <line x1="22" y1="16" x2="15" y2="20" />
          <line x1="22" y1="24" x2="16" y2="34" />
          <line x1="22" y1="24" x2="28" y2="33" />
        </g>
      </svg>
    </div>
  );
}

/* Act 1 — The Audition: full-body Shakespeare, instant "NEXT!", the long walk of shame. */
function Act1() {
  return (
    <div className="act act1" aria-hidden="true">
      <div className="fig perf"><Man flail /></div>
      <DirectorChair />
      <div className="note2">NEXT!</div>
    </div>
  );
}

/* Act 2 — The Coffee Run: six lattes, zero regrets, one landing on his head. */
function Act2() {
  return (
    <div className="act act2" aria-hidden="true">
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
      <div className="fig slateguy"><Man /></div>
      <div className="fig perf5"><Man /></div>
      <div className="slate">
        <svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true">
          <rect className="lid" x="1" y="1" width="24" height="5" rx="1" fill="#F59E0B" />
          <rect x="1" y="7" width="24" height="12" rx="1.5" fill={NAVY} stroke="#F59E0B" strokeWidth="1.4" />
        </svg>
      </div>
      <div className="note2 take2">TAKE 2</div>
      <i className="puff p1" /><i className="puff p2" /><i className="puff p3" />
    </div>
  );
}

const ACTS = [Act1, Act2, Act3, Act4, Act5];

export default function ComedyStage({ act }: { act: number }) {
  if (act < 0 || act >= ACTS.length) return null;
  const Act = ACTS[act];
  return (
    <div className="bgfx-stage" aria-hidden="true">
      <Act />
    </div>
  );
}
