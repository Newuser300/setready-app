'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Copyright from '@/components/Copyright';

/* ============================================================================
   SET CRASHERS — slingshot physics game (Angry Birds genre), film-set themed.
   Built on matter-js. Launch film objects at wobbly structures to knock out
   every ⭐ target. 3-star scoring, level packs, special + free-unlock
   projectiles, falling prize drops, a 15-second bonus round, hints/skips.
   Progress persists in localStorage. matter-js loads dynamically (client-only).
   ========================================================================== */

const SAVE_KEY = 'sr-set-crashers';
const WORLD_W = 1280, WORLD_H = 720;
const GROUND_Y = 660;
const SLING = { x: 200, y: 470 };
const MAX_PULL = 150;          // max drag distance (px in world space)
const LAUNCH_SCALE = 0.12;     // pull -> velocity (calibrated: full pull reaches far targets with impact to smash)

type ProjDef = { emoji: string; name: string; r: number; density: number; power: string; desc: string; color: string; free?: boolean };
const PROJECTILES: Record<string, ProjDef> = {
  clapper:   { emoji: '🎬', name: 'Clapperboard',  r: 24, density: 0.004, power: 'none',      desc: 'The reliable all-rounder.', color: '#1f2937' },
  coffee:    { emoji: '☕', name: 'Hot Coffee',    r: 22, density: 0.004, power: 'explode',   desc: 'Explodes on impact — blast radius. (Or tap to detonate early.)', color: '#7c3f1d' },
  boom:      { emoji: '🎤', name: 'Boom Mic',      r: 20, density: 0.012, power: 'heavy',     desc: 'Heavy. Tap to dive down and smash through stacks.', color: '#374151' },
  reel:      { emoji: '🎞️', name: 'Film Reel',     r: 26, density: 0.003, power: 'split',     desc: 'Tap mid-flight — splits into 3.', color: '#4b5563' },
  // ---- free unlock (earned by catching prize drops or by star milestones) ----
  boomerang: { emoji: '🪃', name: 'Boomerang',     r: 22, density: 0.004, power: 'boomerang', desc: 'Curves back mid-flight — hit targets behind cover.', color: '#a16207', free: true },
  bomb:      { emoji: '💣', name: 'Bomb',          r: 22, density: 0.005, power: 'bomb',      desc: 'Explodes on impact with a huge blast. (Or tap to detonate early.)', color: '#111827', free: true },
  stunt:     { emoji: '🎭', name: 'Stunt Doubles', r: 24, density: 0.004, power: 'multi',     desc: 'Tap mid-flight — splits into a wide 5-way spread.', color: '#4b5563', free: true },
};
const FREE_PROJECTILE = 'clapper';
const FREE_UNLOCK_KEYS = ['boomerang', 'bomb', 'stunt']; // unlockable without paying
// star milestones that guarantee a free projectile even if you never catch a drop
const STAR_MILESTONES: { stars: number; key: string }[] = [
  { stars: 6, key: 'boomerang' }, { stars: 12, key: 'bomb' }, { stars: 18, key: 'stunt' },
];

const STORE = [
  { id: 'pack_studio', emoji: '🎟️', name: 'Studio Lot Pack', desc: '12 extra levels — trickier stacks, new targets.', price: '$2.99', kind: 'pack' },
  { id: 'proj_coffee', emoji: '☕', name: 'Hot Coffee Ammo',  desc: 'Unlock the exploding coffee projectile.',       price: '$1.99', kind: 'proj' },
  { id: 'proj_boom',   emoji: '🎤', name: 'Boom Mic Ammo',    desc: 'Unlock the heavy smashing boom mic.',           price: '$1.99', kind: 'proj' },
  { id: 'proj_reel',   emoji: '🎞️', name: 'Film Reel Ammo',  desc: 'Unlock the splitting film reel.',               price: '$1.99', kind: 'proj' },
  // free-earn power-ups, also buyable as a shortcut (Option A)
  { id: 'proj_boomerang', emoji: '🪃', name: 'Boomerang Ammo', desc: 'Unlock now (or earn it free through play).',    price: '$1.99', kind: 'proj' },
  { id: 'proj_bomb',      emoji: '💣', name: 'Bomb Ammo',      desc: 'Unlock now (or earn it free through play).',    price: '$1.99', kind: 'proj' },
  { id: 'proj_stunt',     emoji: '🎭', name: 'Stunt Doubles Ammo', desc: 'Unlock now (or earn it free through play).', price: '$1.99', kind: 'proj' },
  // bundles (discounted vs buying separately)
  { id: 'bundle_powerups', emoji: '🎁', name: 'Power-Up Bundle', desc: 'All 6 special projectiles — save vs buying separately.', price: '$6.99', kind: 'bundle', grants: ['proj_coffee', 'proj_boom', 'proj_reel', 'proj_boomerang', 'proj_bomb', 'proj_stunt'] },
  { id: 'bundle_mega',     emoji: '🏆', name: 'Mega Pack',      desc: 'Every projectile PLUS the Studio Lot level pack — best value.', price: '$8.99', kind: 'bundle', grants: ['proj_coffee', 'proj_boom', 'proj_reel', 'proj_boomerang', 'proj_bomb', 'proj_stunt', 'pack_studio'] },
  { id: 'hints_5',     emoji: '💡', name: '5 Hints',          desc: 'See a suggested shot arc.',                     price: '$0.99', kind: 'consumable' },
  { id: 'skips_3',     emoji: '⏭️', name: '3 Level Skips',    desc: 'Stuck? Skip a level and keep 1 star.',          price: '$0.99', kind: 'consumable' },
];
// what each bundle unlocks, used to mark them owned + to grant on purchase reconcile
const BUNDLE_GRANTS: Record<string, string[]> = {
  bundle_powerups: ['proj_coffee', 'proj_boom', 'proj_reel', 'proj_boomerang', 'proj_bomb', 'proj_stunt'],
  bundle_mega: ['proj_coffee', 'proj_boom', 'proj_reel', 'proj_boomerang', 'proj_bomb', 'proj_stunt', 'pack_studio'],
};

type Block = { x: number; y: number; w: number; h: number; kind: 'crate' | 'rig' | 'plank' | 'target'; angle?: number };
type Level = { name: string; pack: 'free' | 'studio'; ammo: number; par: number; blocks: Block[] };

const LEVELS: Level[] = [
  // ===== ON LOCATION (free) — all targets ELEVATED; complexity & domino effects ramp up =====
  { name: 'First Take', pack: 'free', ammo: 5, par: 1, blocks: [
    // single elevated target on a simple table — gentle intro
    { x: 850, y: 600, w: 38, h: 92, kind: 'plank' },
    { x: 970, y: 600, w: 38, h: 92, kind: 'plank' },
    { x: 910, y: 540, w: 180, h: 26, kind: 'plank' },
    { x: 910, y: 500, w: 46, h: 46, kind: 'target' },
  ]},
  { name: 'Stack Attack', pack: 'free', ammo: 5, par: 2, blocks: [
    // two separate stacks, targets perched on top
    { x: 860, y: 628, w: 52, h: 52, kind: 'crate' },
    { x: 860, y: 576, w: 52, h: 52, kind: 'crate' },
    { x: 860, y: 524, w: 46, h: 46, kind: 'target' },
    { x: 1010, y: 628, w: 52, h: 52, kind: 'crate' },
    { x: 1010, y: 576, w: 46, h: 46, kind: 'target' },
  ]},
  { name: 'Top Heavy', pack: 'free', ammo: 5, par: 2, blocks: [
    // wide platform on legs, target crowning a mini-stack on top
    { x: 800, y: 604, w: 38, h: 96, kind: 'plank' },
    { x: 1000, y: 604, w: 38, h: 96, kind: 'plank' },
    { x: 900, y: 540, w: 250, h: 26, kind: 'plank' },
    { x: 860, y: 502, w: 50, h: 50, kind: 'crate' },
    { x: 940, y: 502, w: 50, h: 50, kind: 'crate' },
    { x: 900, y: 470, w: 46, h: 46, kind: 'target' },
  ]},
  { name: 'The Tower', pack: 'free', ammo: 5, par: 2, blocks: [
    // tall single tower + a second target on its OWN raised plinth (no ground target)
    { x: 900, y: 624, w: 62, h: 62, kind: 'rig' },
    { x: 900, y: 564, w: 52, h: 52, kind: 'crate' },
    { x: 900, y: 514, w: 52, h: 52, kind: 'crate' },
    { x: 900, y: 466, w: 46, h: 46, kind: 'target' },
    { x: 1090, y: 600, w: 46, h: 120, kind: 'rig' },
    { x: 1090, y: 530, w: 46, h: 46, kind: 'target' },
  ]},
  { name: 'Chain Start', pack: 'free', ammo: 4, par: 2, blocks: [
    // FIRST DOMINO LEVEL: three tall planks close together — topple the first into the next,
    // each carries a target. Tight ammo nudges you toward the chain.
    { x: 840, y: 566, w: 24, h: 188, kind: 'plank' },
    { x: 840, y: 458, w: 42, h: 42, kind: 'target' },
    { x: 898, y: 566, w: 24, h: 188, kind: 'plank' },
    { x: 898, y: 458, w: 42, h: 42, kind: 'target' },
    { x: 956, y: 566, w: 24, h: 188, kind: 'plank' },
    { x: 956, y: 458, w: 42, h: 42, kind: 'target' },
  ]},
  { name: 'Double Trouble', pack: 'free', ammo: 5, par: 3, blocks: [
    // two tables, each with an elevated target
    { x: 760, y: 600, w: 38, h: 96, kind: 'plank' },
    { x: 860, y: 600, w: 38, h: 96, kind: 'plank' },
    { x: 810, y: 540, w: 150, h: 24, kind: 'plank' },
    { x: 810, y: 504, w: 46, h: 46, kind: 'target' },
    { x: 1010, y: 600, w: 38, h: 96, kind: 'plank' },
    { x: 1110, y: 600, w: 38, h: 96, kind: 'plank' },
    { x: 1060, y: 540, w: 150, h: 24, kind: 'plank' },
    { x: 1060, y: 504, w: 46, h: 46, kind: 'target' },
  ]},
  { name: 'Fortress', pack: 'free', ammo: 5, par: 3, blocks: [
    // walled platform; two stacked targets up top, all elevated
    { x: 850, y: 600, w: 56, h: 120, kind: 'rig' },
    { x: 1010, y: 600, w: 56, h: 120, kind: 'rig' },
    { x: 930, y: 540, w: 250, h: 28, kind: 'plank' },
    { x: 870, y: 498, w: 50, h: 50, kind: 'crate' },
    { x: 990, y: 498, w: 50, h: 50, kind: 'crate' },
    { x: 930, y: 500, w: 46, h: 46, kind: 'target' },
    { x: 930, y: 454, w: 46, h: 46, kind: 'target' },
  ]},
  { name: 'Domino Row', pack: 'free', ammo: 3, par: 2, blocks: [
    // STRONGER DOMINO: four tall planks in a tight row, each topped with a target.
    // Knock the near end and they cascade into each other. Only 3 ammo — chain it.
    { x: 830, y: 566, w: 22, h: 188, kind: 'plank' },
    { x: 830, y: 458, w: 40, h: 40, kind: 'target' },
    { x: 884, y: 566, w: 22, h: 188, kind: 'plank' },
    { x: 884, y: 458, w: 40, h: 40, kind: 'target' },
    { x: 938, y: 566, w: 22, h: 188, kind: 'plank' },
    { x: 938, y: 458, w: 40, h: 40, kind: 'target' },
    { x: 992, y: 566, w: 22, h: 188, kind: 'plank' },
    { x: 992, y: 458, w: 40, h: 40, kind: 'target' },
  ]},
  { name: 'Pyramid', pack: 'free', ammo: 5, par: 3, blocks: [
    // pyramid of crates with targets nested up off the ground
    { x: 840, y: 628, w: 52, h: 52, kind: 'crate' },
    { x: 898, y: 628, w: 52, h: 52, kind: 'crate' },
    { x: 956, y: 628, w: 52, h: 52, kind: 'crate' },
    { x: 1014, y: 628, w: 52, h: 52, kind: 'crate' },
    { x: 869, y: 576, w: 52, h: 52, kind: 'crate' },
    { x: 927, y: 574, w: 46, h: 46, kind: 'target' },
    { x: 985, y: 576, w: 52, h: 52, kind: 'crate' },
    { x: 927, y: 524, w: 46, h: 46, kind: 'target' },
  ]},
  { name: 'Watchtower', pack: 'free', ammo: 5, par: 3, blocks: [
    // tall tower with crowning target + a second target on a raised post
    { x: 950, y: 624, w: 62, h: 62, kind: 'rig' },
    { x: 950, y: 564, w: 56, h: 56, kind: 'crate' },
    { x: 950, y: 510, w: 52, h: 52, kind: 'crate' },
    { x: 950, y: 460, w: 48, h: 48, kind: 'crate' },
    { x: 950, y: 414, w: 46, h: 46, kind: 'target' },
    { x: 800, y: 590, w: 44, h: 140, kind: 'rig' },
    { x: 800, y: 514, w: 46, h: 46, kind: 'target' },
  ]},
  { name: 'Crossfire', pack: 'free', ammo: 5, par: 3, blocks: [
    // mixed: a raised target left, a table-mounted target right with a rig topper
    { x: 780, y: 588, w: 50, h: 144, kind: 'rig' },
    { x: 780, y: 512, w: 46, h: 46, kind: 'target' },
    { x: 960, y: 600, w: 38, h: 100, kind: 'plank' },
    { x: 1080, y: 600, w: 38, h: 100, kind: 'plank' },
    { x: 1020, y: 540, w: 150, h: 24, kind: 'plank' },
    { x: 1020, y: 504, w: 46, h: 46, kind: 'target' },
    { x: 1020, y: 458, w: 50, h: 50, kind: 'rig' },
  ]},
  { name: "That's a Wrap", pack: 'free', ammo: 5, par: 3, blocks: [
    // finale of the free pack: a table target, a tower target, and a high-shelf target.
    // Toppling the tower can knock the shelf target too (light domino).
    { x: 780, y: 600, w: 38, h: 100, kind: 'plank' },
    { x: 880, y: 600, w: 38, h: 100, kind: 'plank' },
    { x: 830, y: 540, w: 150, h: 24, kind: 'plank' },
    { x: 830, y: 504, w: 46, h: 46, kind: 'target' },
    { x: 1000, y: 624, w: 62, h: 62, kind: 'rig' },
    { x: 1000, y: 564, w: 52, h: 52, kind: 'crate' },
    { x: 1000, y: 514, w: 46, h: 46, kind: 'target' },
    { x: 1130, y: 560, w: 30, h: 200, kind: 'rig' },
    { x: 1130, y: 448, w: 44, h: 44, kind: 'target' },
  ]},
  // ===== STUDIO LOT PACK (paid) — 12 harder levels with escalating domino chains =====
  ...Array.from({ length: 12 }, (_, i): Level => {
    const tier = Math.floor(i / 4); // 0,1,2 — difficulty/complexity tiers
    const base: Block[] = [
      { x: 830, y: 600, w: 56, h: 120, kind: 'rig' },
      { x: 990, y: 600, w: 56, h: 120, kind: 'rig' },
      { x: 910, y: 540, w: 240, h: 28, kind: 'plank' },
      { x: 870, y: 498, w: 50, h: 50, kind: 'crate' },
      { x: 950, y: 498, w: 50, h: 50, kind: 'crate' },
      { x: 910, y: 500, w: 46, h: 46, kind: 'target' },
      { x: 910, y: 454, w: 46, h: 46, kind: 'target' },
    ];
    // tier 1+: add a domino tower on the right that can topple onto the platform
    const dominoes: Block[] = tier >= 1 ? [
      { x: 1140, y: 560, w: 28, h: 200, kind: 'rig' },
      { x: 1140, y: 448, w: 44, h: 44, kind: 'target' },
    ] : [];
    // tier 2: add a left chain of leaning planks, each topped with a target
    const chain: Block[] = tier >= 2 ? [
      { x: 700, y: 570, w: 24, h: 180, kind: 'plank' },
      { x: 700, y: 466, w: 40, h: 40, kind: 'target' },
      { x: 770, y: 570, w: 24, h: 180, kind: 'plank' },
      { x: 770, y: 466, w: 40, h: 40, kind: 'target' },
    ] : [];
    return {
      name: `Studio Lot ${i + 1}`, pack: 'studio', ammo: tier >= 2 ? 4 : 5, par: 3,
      blocks: [...base, ...dominoes, ...chain],
    };
  }),
];

type SaveData = { stars: Record<number, number>; owned: string[]; ammoCounts: Record<string, number>; claimedMilestones: string[]; claimedRewards: number[]; claimedPurchases: string[]; hints: number; skips: number; lastUnlocked: number; bonusBest: number };
const DEFAULT_SAVE: SaveData = { stars: {}, owned: [], ammoCounts: {}, claimedMilestones: [], claimedRewards: [], claimedPurchases: [], hints: 1, skips: 0, lastUnlocked: 0, bonusBest: 0 };
function loadSave(): SaveData {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const s = { ...DEFAULT_SAVE, ...JSON.parse(raw) }; if (!s.ammoCounts) s.ammoCounts = {}; if (!s.claimedMilestones) s.claimedMilestones = []; if (!s.claimedRewards) s.claimedRewards = []; if (!s.claimedPurchases) s.claimedPurchases = []; return s; } } catch {}
  return { ...DEFAULT_SAVE };
}
const PURCHASE_USES = 3; // a paid power-up purchase grants this many uses

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Drop = { x: number; y: number; vy: number; r: number; kind: 'proj' | 'hint' | 'skip'; projKey?: string; emoji: string; t: number };
type Screen = 'menu' | 'play';
type Mode = 'level' | 'bonus';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mat = any;

const PROJ_EMOJIS = ['boomerang', 'bomb', 'stunt']; // possible projectile prizes
const MILESTONE_EVERY = 5; // award a random prize every N distinct levels cleared

export default function SetCrashers() {
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [mode, setMode] = useState<Mode>('level');
  const [levelIdx, setLevelIdx] = useState(0);
  const [ammoLeft, setAmmoLeft] = useState(0);
  const [targetsLeft, setTargetsLeft] = useState(0);
  const [selProj, setSelProj] = useState<string>(FREE_PROJECTILE);
  const [result, setResult] = useState<{ won: boolean; stars: number } | null>(null);
  const [rewardInfo, setRewardInfo] = useState<{ emoji: string; label: string; jackpot?: boolean } | null>(null);
  const [bonusResult, setBonusResult] = useState<{ caught: Record<string, number>; total: number } | null>(null);
  const [bonusTime, setBonusTime] = useState(15);
  const [notice, setNotice] = useState('');
  const [showHow, setShowHow] = useState(false);
  const [hintActive, setHintActive] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const MatterRef = useRef<Mat>(null);
  const g = useRef<{
    engine: Mat; raf: number; mode: Mode;
    bodies: Mat[]; targets: Mat[]; projectile: Mat | null; flying: boolean; extra: Mat[];
    aiming: boolean; aimX: number; aimY: number; particles: Particle[]; shake: number;
    ammo: number; armed: boolean; loadGuard: number; ended: boolean; powerUsed: boolean;
    settleT: number; flightT: number; last: number; launchDir: number; projKind: string; detonate: boolean;
    drops: Drop[]; dropTimer: number; bonusT: number; bonusCaught: Record<string, number>; bonusEnded: boolean;
  }>({ engine: null, raf: 0, mode: 'level', bodies: [], targets: [], projectile: null, flying: false, extra: [], aiming: false, aimX: 0, aimY: 0, particles: [], shake: 0, ammo: 0, armed: false, loadGuard: 0, ended: false, powerUsed: false, settleT: 0, flightT: 0, last: 0, launchDir: 1, projKind: 'clapper', detonate: false, drops: [], dropTimer: 6, bonusT: 15, bonusCaught: {}, bonusEnded: false });

  const saveRef = useRef(save); saveRef.current = save;
  const selRef = useRef(selProj); selRef.current = selProj;
  const hintRef = useRef(hintActive); hintRef.current = hintActive;
  // lvlRef is the source of truth for the active level. It's set explicitly in startLevel.
  // Do NOT re-sync it to levelIdx on every render — that clobbers the value startLevel just
  // set (before setLevelIdx's state update commits), which made "Next" read a stale level.
  const lvlRef = useRef(levelIdx);

  const persist = useCallback((s: SaveData) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {} }, []);
  const toast = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2400); };

  useEffect(() => {
    let alive = true;
    (async () => { const Matter = await import('matter-js'); if (!alive) return; MatterRef.current = Matter; setEngineReady(true); })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const s = loadSave(); setSave(s); setReady(true);
    (async () => {
      try {
        const res = await fetch('/api/game-purchases?game=set-crashers'); const data = await res.json();
        // prefer the per-purchase list (each has a unique id = stripe_session_id) so that
        // buying the same consumable again grants more uses, while reloads never double-grant.
        // fall back to the deduplicated items list for older servers.
        const purchases: { id: string; item: string }[] = Array.isArray(data?.purchases)
          ? data.purchases
          : (Array.isArray(data?.items) ? data.items.map((it: string) => ({ id: it, item: it })) : []);
        if (purchases.length) setSave(prev => {
          const claimed = [...(prev.claimedPurchases || [])];
          const counts = { ...(prev.ammoCounts || {}) };
          const owned = new Set(prev.owned);
          const addProj = (k: string, n: number) => { counts[k] = (counts[k] || 0) + n; };
          for (const p of purchases) {
            if (claimed.includes(p.id)) continue;             // this exact purchase already applied
            const item = p.item;
            if (item === 'pack_studio') { owned.add('pack_studio'); }       // permanent, one-time
            else if (BUNDLE_GRANTS[item]) {                                  // bundle: +3 of each power-up
              owned.add(item);
              for (const g of BUNDLE_GRANTS[item]) {
                if (g === 'pack_studio') owned.add('pack_studio');
                else if (g.startsWith('proj_')) addProj(g.slice(5), PURCHASE_USES);
              }
            } else if (item.startsWith('proj_')) { addProj(item.slice(5), PURCHASE_USES); } // single: +3 uses
            else { owned.add(item); }
            claimed.push(p.id);
          }
          const n = { ...prev, owned: Array.from(owned), ammoCounts: counts, claimedPurchases: claimed }; persist(n); return n;
        });
        if (typeof window !== 'undefined' && window.location.search.includes('purchase=success')) { toast('Purchase complete — enjoy!'); window.history.replaceState({}, '', '/games/set-crashers'); }
      } catch {}
    })();
  }, [persist]);

  const owns = (id: string) => saveRef.current.owned.includes(id);
  const ammoOf = (k: string) => saveRef.current.ammoCounts?.[k] || 0;
  // a power-up is usable if it's the free basic ammo OR you have uses left
  const projUnlocked = (k: string) => k === FREE_PROJECTILE || ammoOf(k) > 0;
  const studioUnlocked = () => owns('pack_studio');

  // add uses to a power-up. earned through play = +1, purchased = +3.
  const grantProjectile = (key: string, amount = 1) => {
    if (key === FREE_PROJECTILE) return false;
    const had = ammoOf(key);
    setSave(prev => { const counts = { ...(prev.ammoCounts || {}) }; counts[key] = (counts[key] || 0) + amount; const n = { ...prev, ammoCounts: counts }; persist(n); return n; });
    return had === 0; // true if this unlocked it from empty (for "Unlocked!" toast)
  };
  // spend one use of a power-up (called when a power-up shot is fired)
  const spendProjectile = (key: string) => {
    if (key === FREE_PROJECTILE) return;
    setSave(prev => { const counts = { ...(prev.ammoCounts || {}) }; counts[key] = Math.max(0, (counts[key] || 0) - 1); const n = { ...prev, ammoCounts: counts }; persist(n); return n; });
  };
  const addHints = (n: number) => setSave(prev => { const x = { ...prev, hints: prev.hints + n }; persist(x); return x; });
  const addSkips = (n: number) => setSave(prev => { const x = { ...prev, skips: prev.skips + n }; persist(x); return x; });

  const spawnParticles = (x: number, y: number, n: number, color: string, spread = 280) => {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = Math.random() * spread + 40; g.current.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.5, max: 1, color, size: 2 + Math.random() * 4 }); }
  };

  /* ---- Build a level (or bonus arena) ---- */
  const buildArena = useCallback((idx: number, m: Mode) => {
    const Matter = MatterRef.current; if (!Matter) return;
    const { Engine, Bodies, Composite, World } = Matter;
    const G = g.current;
    if (G.engine) { World.clear(G.engine.world, false); Engine.clear(G.engine); }
    const engine = Engine.create(); engine.gravity.y = 1.2; G.engine = engine; G.mode = m;

    const bodies: Mat[] = []; const targets: Mat[] = [];
    const ground = Bodies.rectangle(WORLD_W / 2, GROUND_Y + 60, WORLD_W + 600, 120, { isStatic: true, friction: 0.9, label: 'ground' });
    const lwall = Bodies.rectangle(-80, WORLD_H / 2, 120, WORLD_H * 2, { isStatic: true });
    Composite.add(engine.world, [ground, lwall]);

    if (m === 'level') {
      const lvl = LEVELS[idx];
      for (const b of lvl.blocks) {
        const isT = b.kind === 'target'; const heavy = b.kind === 'rig';
        const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
          angle: b.angle ?? 0, friction: b.kind === 'plank' ? 0.85 : 0.75, frictionStatic: 1.2,
          restitution: 0.02, density: isT ? 0.0018 : heavy ? 0.006 : 0.0028, label: isT ? 'target' : b.kind,
        });
        body.crasherKind = b.kind; body.crasherHP = isT ? 100 : 0; body.crasherAlive = true; body.crasherStartY = b.y; body.crasherStartX = b.x;
        Composite.add(engine.world, body); bodies.push(body); if (isT) targets.push(body);
      }
      for (let i = 0; i < 90; i++) Engine.update(engine, 1000 / 60);
      for (const b of bodies) { Matter.Body.setVelocity(b, { x: 0, y: 0 }); Matter.Body.setAngularVelocity(b, 0); }
      G.ammo = lvl.ammo; setAmmoLeft(lvl.ammo); setTargetsLeft(targets.length);
    } else {
      G.ammo = 9999; setAmmoLeft(9999); setTargetsLeft(0);
      G.bonusT = 15; setBonusTime(15); G.bonusCaught = {}; G.bonusEnded = false;
    }

    G.bodies = bodies; G.targets = targets; G.extra = []; G.projectile = null; G.flying = false;
    G.aiming = false; G.particles = []; G.shake = 0; G.armed = false; G.loadGuard = 0.5;
    G.ended = false; G.powerUsed = false; G.settleT = 0; G.flightT = 0; G.bonusEnded = false; G.drops = []; G.dropTimer = m === 'bonus' ? 0.3 : 6;
    setResult(null); setBonusResult(null);

    Matter.Events.on(engine, 'collisionStart', (ev: Mat) => {
      if (m === 'bonus') return;
      if (!G.armed || G.loadGuard > 0.001) return;
      for (const pair of ev.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        // real impact = relative velocity magnitude between the two bodies
        const impact = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        // auto-detonate coffee/bomb the instant the LIVE projectile hits anything
        if (G.flying && !G.powerUsed && (G.projKind === 'coffee' || G.projKind === 'bomb') && G.projectile && (a === G.projectile || b === G.projectile)) {
          G.detonate = true;
        }
        for (const [t, other] of [[a, b], [b, a]] as [Mat, Mat][]) {
          if (t.label === 'target' && t.crasherAlive) {
            const force = (other.label === 'proj' || other.crasherKind || other.label === 'ground') ? impact : 0;
            if (force > 2) { t.crasherHP -= force * 60; if (t.crasherHP <= 0) destroyTarget(t); }
          }
        }
      }
    });
  }, []);

  const destroyTarget = (t: Mat) => {
    const Matter = MatterRef.current; const G = g.current;
    if (!t.crasherAlive) return; t.crasherAlive = false;
    spawnParticles(t.position.x, t.position.y, 24, '#fca5a5', 340); G.shake = Math.min(G.shake + 14, 30);
    Matter.Composite.remove(G.engine.world, t); G.targets = G.targets.filter(x => x !== t); setTargetsLeft(G.targets.length);
    // win the instant the last target is gone — from ANY cause (smashed, fell off, knocked down)
    if (G.mode === 'level' && G.targets.length === 0 && !G.ended) setTimeout(() => settleCheck(), 200);
  };

  const startLevel = (idx: number) => {
    setLevelIdx(idx); lvlRef.current = idx; setMode('level'); setScreen('play'); setHintActive(false);
    const def = projUnlocked(selRef.current) ? selRef.current : FREE_PROJECTILE; setSelProj(def);
    setTimeout(() => buildArena(idx, 'level'), 30);
  };
  const startBonus = () => {
    setMode('bonus'); setScreen('play'); setHintActive(false);
    const def = projUnlocked(selRef.current) ? selRef.current : FREE_PROJECTILE; setSelProj(def);
    setTimeout(() => buildArena(0, 'bonus'), 30);
  };

  /* ---- Falling prize drops ---- */
  const spawnDrop = (forBonus: boolean) => {
    const G = g.current; const roll = Math.random();
    let kind: Drop['kind'] = 'hint'; let projKey: string | undefined; let emoji = '💡';
    // power-ups are consumable now, so drops can always offer +1 use of a random one
    if (roll < (forBonus ? 0.4 : 0.5)) {
      kind = 'proj'; projKey = PROJ_EMOJIS[Math.floor(Math.random() * PROJ_EMOJIS.length)]; emoji = PROJECTILES[projKey].emoji;
    } else if (roll < 0.75) { kind = 'hint'; emoji = '💡'; }
    else { kind = 'skip'; emoji = '⏭️'; }
    const x = 360 + Math.random() * (WORLD_W - 520);
    G.drops.push({ x, y: -30, vy: forBonus ? 150 + Math.random() * 60 : 110, r: 24, kind, projKey, emoji, t: 0 });
  };

  const catchDrop = (d: Drop) => {
    const G = g.current;
    spawnParticles(d.x, d.y, 26, '#fbbf24', 320); G.shake = Math.min(G.shake + 8, 24);
    if (G.mode === 'bonus') {
      const key = d.kind === 'proj' ? `proj:${d.projKey}` : d.kind;
      G.bonusCaught[key] = (G.bonusCaught[key] || 0) + 1;
      if (d.kind === 'proj' && d.projKey) grantProjectile(d.projKey, 1);
      else if (d.kind === 'hint') addHints(1);
      else addSkips(1);
    } else {
      if (d.kind === 'proj' && d.projKey) { grantProjectile(d.projKey, 1); toast(`🎁 +1 ${PROJECTILES[d.projKey].name} use!`); }
      else if (d.kind === 'hint') { addHints(1); toast('🎁 +1 Hint'); }
      else { addSkips(1); toast('🎁 +1 Skip'); }
    }
  };

  /* ---- Special powers ---- */
  const explodeAt = (x: number, y: number, radius: number, force: number) => {
    const Matter = MatterRef.current; const G = g.current;
    spawnParticles(x, y, 44, '#fb923c', 480); G.shake = 28;
    for (const b of [...G.bodies, ...G.targets]) {
      if (b.isStatic) continue;
      const dx = b.position.x - x, dy = b.position.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < radius) { const f = (1 - d / radius) * force; Matter.Body.applyForce(b, b.position, { x: (dx / d) * f, y: (dy / d) * f - 0.2 }); if (b.label === 'target' && d < radius * 0.66) destroyTarget(b); }
    }
  };
  const triggerPower = () => {
    const Matter = MatterRef.current; const G = g.current; const p = G.projectile;
    if (!p || !G.flying || G.powerUsed) return;
    const def = PROJECTILES[G.projKind]; if (!def || def.power === 'none' || def.power === 'boomerang') return;
    G.powerUsed = true;
    if (def.power === 'explode') { explodeAt(p.position.x, p.position.y, 200, 0.6); Matter.Composite.remove(G.engine.world, p); G.projectile = null; G.flying = false; setTimeout(() => settleCheck(), 600); }
    else if (def.power === 'bomb') { explodeAt(p.position.x, p.position.y, 260, 0.85); Matter.Composite.remove(G.engine.world, p); G.projectile = null; G.flying = false; setTimeout(() => settleCheck(), 600); }
    else if (def.power === 'heavy') { Matter.Body.setVelocity(p, { x: p.velocity.x * 1.4, y: Math.abs(p.velocity.y) + 12 }); spawnParticles(p.position.x, p.position.y, 16, '#9ca3af', 200); }
    else if (def.power === 'split' || def.power === 'multi') {
      const count = def.power === 'multi' ? 5 : 3;
      spawnParticles(p.position.x, p.position.y, 18, '#cbd5e1', 220);
      const baseAngle = Math.atan2(p.velocity.y, p.velocity.x);
      const speed = Math.max(Math.hypot(p.velocity.x, p.velocity.y), 6);
      const fan = 0.5; // total spread in radians (~29°)
      for (let i = 0; i < count; i++) {
        const a = baseAngle + (i - (count - 1) / 2) * (fan / Math.max(count - 1, 1));
        const c = Matter.Bodies.circle(p.position.x, p.position.y, def.r * 0.7, { density: def.density * 0.7, restitution: 0.3, friction: 0.4, frictionAir: 0.001, label: 'proj' });
        c.crasherProjKind = G.projKind; c.crasherR = def.r * 0.7;
        Matter.Body.setVelocity(c, { x: Math.cos(a) * speed, y: Math.sin(a) * speed });
        Matter.Composite.add(G.engine.world, c); G.extra.push(c);
      }
      // remove the original so the player sees distinct split pieces, not one overlapping blob
      Matter.Composite.remove(G.engine.world, p); G.projectile = null; G.flying = false;
      if (G.mode === 'level') setTimeout(() => settleCheck(), 700);
    }
  };

  const settleCheck = useCallback(() => {
    const G = g.current; if (G.mode !== 'level' || G.ended) return;
    if (G.targets.length === 0) { finish(true); return; }
    if (G.ammo <= 0 && !G.flying) { finish(false); return; }
  }, []);

  const finish = useCallback((won: boolean) => {
    const G = g.current; if (G.ended) return; G.ended = true;
    const lvl = LEVELS[lvlRef.current]; let stars = 0;
    if (won) { const used = lvl.ammo - G.ammo; stars = used <= lvl.par ? 3 : used <= lvl.par + 1 ? 2 : 1; }
    setTimeout(() => {
      setRewardInfo(null);
      setResult({ won, stars });
      if (won) setSave(prev => {
        const ps = prev.stars[lvlRef.current] || 0;
        const n = { ...prev, stars: { ...prev.stars, [lvlRef.current]: Math.max(ps, stars) }, lastUnlocked: Math.max(prev.lastUnlocked, lvlRef.current + 1) };
        // star-milestone power-up rewards: +1 use, granted once per milestone
        const total = Object.values(n.stars).reduce((a, b) => a + b, 0);
        const claimed = [...(n.claimedMilestones || [])];
        const counts = { ...(n.ammoCounts || {}) };
        for (const ms of STAR_MILESTONES) {
          const id = `ms_${ms.stars}_${ms.key}`;
          if (total >= ms.stars && !claimed.includes(id)) { counts[ms.key] = (counts[ms.key] || 0) + 1; claimed.push(id); }
        }
        n.claimedMilestones = claimed; n.ammoCounts = counts;

        // ── Every-5-levels ESCALATING random prize (+ rare jackpot) ─────────
        // Count DISTINCT cleared levels (>=1 star) so replays can't farm rewards.
        const clearedCount = Object.values(n.stars).filter(s => s > 0).length;
        const milestone = Math.floor(clearedCount / MILESTONE_EVERY) * MILESTONE_EVERY; // 5,10,15…
        const rewarded = [...(n.claimedRewards || [])];
        if (milestone >= MILESTONE_EVERY && !rewarded.includes(milestone)) {
          rewarded.push(milestone);
          // tier grows with depth: t1 at 5-10, t2 at 15-20, t3 at 25+
          const tier = milestone >= 25 ? 3 : milestone >= 15 ? 2 : 1;
          const powerUps = tier;          // 1 / 2 / 3 power-up uses
          const hintQty = tier + 1;       // 2 / 3 / 4 hints
          const skipQty = tier;           // 1 / 2 / 3 skips
          // jackpot chance climbs with tier (10% / 15% / 22%)
          const jackpotChance = 0.10 + (tier - 1) * 0.06;
          const isJackpot = Math.random() < jackpotChance;

          if (isJackpot) {
            // JACKPOT: a windfall — power-ups of every type + hints + skips
            const jpEach = tier;          // uses of EACH power-up
            const jpCounts = { ...n.ammoCounts };
            for (const k of PROJ_EMOJIS) jpCounts[k] = (jpCounts[k] || 0) + jpEach;
            n.ammoCounts = jpCounts;
            n.hints = (n.hints || 0) + (tier + 2);
            n.skips = (n.skips || 0) + tier;
            setTimeout(() => { setRewardInfo({ emoji: '💰', label: `JACKPOT! ${jpEach}× every power-up, +${tier + 2} hints, +${tier} skips`, jackpot: true }); toast(`💰 JACKPOT milestone reward!`); }, 600);
          } else {
            const roll = Math.random();
            if (roll < 0.6) {
              const key = PROJ_EMOJIS[Math.floor(Math.random() * PROJ_EMOJIS.length)];
              n.ammoCounts = { ...n.ammoCounts, [key]: (n.ammoCounts[key] || 0) + powerUps };
              setTimeout(() => { setRewardInfo({ emoji: PROJECTILES[key].emoji, label: `+${powerUps} ${PROJECTILES[key].name}` }); toast(`🎁 Milestone reward: +${powerUps} ${PROJECTILES[key].name}!`); }, 600);
            } else if (roll < 0.8) {
              n.hints = (n.hints || 0) + hintQty;
              setTimeout(() => { setRewardInfo({ emoji: '💡', label: `+${hintQty} Hints` }); toast(`🎁 Milestone reward: +${hintQty} Hints!`); }, 600);
            } else {
              n.skips = (n.skips || 0) + skipQty;
              setTimeout(() => { setRewardInfo({ emoji: '⏭️', label: `+${skipQty} Skip${skipQty > 1 ? 's' : ''}` }); toast(`🎁 Milestone reward: +${skipQty} Skip${skipQty > 1 ? 's' : ''}!`); }, 600);
            }
          }
          n.claimedRewards = rewarded;
        }
        persist(n); return n;
      });
    }, won ? 500 : 800);
  }, [persist]);

  const finishBonus = useCallback(() => {
    const G = g.current; if (G.bonusEnded) return; G.bonusEnded = true;
    const caught = { ...G.bonusCaught }; const total = Object.values(caught).reduce((a, b) => a + b, 0);
    setBonusResult({ caught, total });
    setSave(prev => { const n = { ...prev, bonusBest: Math.max(prev.bonusBest, total) }; persist(n); return n; });
  }, [persist]);

  /* ---- Main loop ---- */
  useEffect(() => {
    if (screen !== 'play' || !engineReady) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!; const Matter = MatterRef.current;
    let running = true; g.current.last = performance.now();

    const loop = (now: number) => {
      if (!running) return; const G = g.current;
      let dt = (now - G.last) / 1000; G.last = now; dt = Math.min(dt, 0.05);
      if (G.engine) {
        if (G.loadGuard > 0) G.loadGuard -= dt;

        // auto-detonate (coffee/bomb hit something): trigger its blast immediately
        if (G.detonate && G.flying && !G.powerUsed) { G.detonate = false; triggerPower(); }

        // boomerang: fly straight out first, THEN curve back (delay the reverse-thrust)
        if (G.flying && G.projectile && G.projKind === 'boomerang') {
          if ((G.flightT || 0) > 0.55) {   // ~0.55s of free flight before it starts curving
            const p = G.projectile; const v = p.velocity;
            Matter.Body.setVelocity(p, { x: v.x - G.launchDir * 0.45, y: v.y });
          }
        }

        const steps = 8;   // higher substeps prevent fast projectiles tunneling through targets
        for (let i = 0; i < steps; i++) Matter.Engine.update(G.engine, (dt * 1000) / steps);

        // projectile resolution: once the shot is "resolved" (timer/rest/off-screen) the
        // NEXT ball becomes ready to fire — but the thrown item is NOT deleted. It keeps
        // flying/rolling as a free body (moved into G.extra) and is removed only when it
        // genuinely leaves the screen or fully comes to rest.
        const p = G.projectile;
        if (p && G.flying) {
          G.flightT = (G.flightT || 0) + dt;
          const sp = Math.hypot(p.velocity.x, p.velocity.y);
          const off = p.position.x > WORLD_W + 140 || p.position.x < -140 || p.position.y > WORLD_H + 140;
          const restThresh = G.mode === 'bonus' ? 4 : 2.5;
          const restHold = G.mode === 'bonus' ? 0.05 : 0.35;
          const maxFlight = G.mode === 'bonus' ? 0.8 : 2.6;
          if (off || sp < restThresh) { G.settleT += dt; } else G.settleT = 0;
          if (off || G.settleT > restHold || G.flightT > maxFlight) {
            if (!off && G.projKind === 'bomb' && !G.powerUsed) { G.powerUsed = true; explodeAt(p.position.x, p.position.y, 260, 0.85); Matter.Composite.remove(G.engine.world, p); }
            else { p.crasherSpent = true; G.extra.push(p); }   // keep it in the world, still moving
            G.projectile = null; G.flying = false; G.settleT = 0; G.flightT = 0;
            if (G.mode === 'level') setTimeout(() => settleCheck(), 200);
          }
        }
        // free bodies (split pieces + spent projectiles): remove when off-screen OR fully at rest
        G.extra = G.extra.filter(e => {
          const off = e.position.y > WORLD_H + 200 || e.position.x > WORLD_W + 200 || e.position.x < -200;
          const sp = Math.hypot(e.velocity.x, e.velocity.y) + Math.abs(e.angularVelocity) * 20;
          e.crasherRestT = sp < 0.6 ? (e.crasherRestT || 0) + dt : 0;
          const stopped = e.crasherRestT > 1.0; // rolled to a complete stop for 1s → fade it out
          const gone = off || stopped;
          if (gone) Matter.Composite.remove(G.engine.world, e);
          return !gone;
        });

        // detect downed targets (level only, armed). A target is "down" when:
        //  - it's off-screen, OR
        //  - it has fallen well below where it started (knocked off its perch), OR
        //  - it has settled near the ground below its start, OR
        //  - it has been displaced far horizontally from its start (rolled away).
        // We do NOT require it to be perfectly at rest — being off its perch is enough,
        // but we give a short grace so a target isn't culled the instant it's nudged.
        if (G.mode === 'level' && G.armed && G.loadGuard <= 0.001) {
          for (const t of [...G.targets]) {
            const startY = t.crasherStartY ?? t.position.y;
            const startX = t.crasherStartX ?? t.position.x;
            const offscreen = t.position.y > WORLD_H + 60 || t.position.x < -60 || t.position.x > WORLD_W + 100;
            const fellFar = (t.position.y - startY) > 55;                       // dropped 55px+ from its perch
            const nearGround = t.position.y > GROUND_Y - 40 && (t.position.y - startY) > 24; // on/near floor, below start
            const rolledAway = Math.abs(t.position.x - startX) > 130;           // shoved far sideways
            const down = fellFar || nearGround || rolledAway;
            if (offscreen) { destroyTarget(t); continue; }
            if (down) {
              // brief grace so a target that's actively falling gets a moment, then counts
              t.crasherDownT = (t.crasherDownT || 0) + dt;
              if (t.crasherDownT > 0.45) destroyTarget(t);
            } else {
              t.crasherDownT = 0;
            }
          }
        }

        // ----- DROPS -----
        if (G.mode === 'bonus') {
          if (!G.bonusEnded) {
            G.bonusT = Math.max(0, G.bonusT - dt); setBonusTime(Math.ceil(G.bonusT));
            G.dropTimer -= dt; if (G.dropTimer <= 0 && G.bonusT > 0.4) { spawnDrop(true); G.dropTimer = 0.5; }
            if (G.bonusT <= 0) setTimeout(() => finishBonus(), 1200);
          }
        } else if (G.armed && !G.ended) {
          G.dropTimer -= dt;
          if (G.dropTimer <= 0 && G.drops.length === 0 && Math.random() < 0.5) { spawnDrop(false); G.dropTimer = 7 + Math.random() * 5; }
          else if (G.dropTimer <= 0) G.dropTimer = 3;
        }
        // animate drops + catch detection
        const flyers: Mat[] = []; if (G.projectile) flyers.push(G.projectile); for (const e of G.extra) flyers.push(e);
        for (const d of G.drops) {
          d.t += dt; d.vy += 240 * dt; d.y += d.vy * dt;
          for (const f of flyers) { if (Math.hypot(f.position.x - d.x, f.position.y - d.y) < d.r + (f.circleRadius || 22)) { (d as Drop & { caught?: boolean }).caught = true; catchDrop(d); break; } }
        }
        G.drops = G.drops.filter(d => !(d as Drop & { caught?: boolean }).caught && d.y < WORLD_H + 50);

        // particles
        for (const pt of G.particles) { pt.vy += 600 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
        G.particles = G.particles.filter(pt => pt.life > 0);
        if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 60);
      }
      draw(ctx, canvas);
      g.current.raf = requestAnimationFrame(loop);
    };
    g.current.raf = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(g.current.raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, engineReady, settleCheck, finishBonus]);

  /* ---- Drawing ---- */
  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const G = g.current; const W = canvas.width, scale = W / WORLD_W;
    ctx.save();
    if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    ctx.scale(scale, scale);
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, '#1a1a2e'); sky.addColorStop(0.5, '#2d2d52'); sky.addColorStop(1, '#3d3460');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let i = 0; i < 3; i++) { const gx = 320 + i * 360; const r = ctx.createRadialGradient(gx, -50, 0, gx, -50, 540); r.addColorStop(0, 'rgba(245,158,11,0.10)'); r.addColorStop(1, 'rgba(245,158,11,0)'); ctx.fillStyle = r; ctx.beginPath(); ctx.moveTo(gx, -50); ctx.lineTo(gx - 190, WORLD_H); ctx.lineTo(gx + 190, WORLD_H); ctx.closePath(); ctx.fill(); }
    const gg = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD_H); gg.addColorStop(0, '#4b5563'); gg.addColorStop(1, '#374151');
    ctx.fillStyle = gg; ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(WORLD_W, GROUND_Y); ctx.stroke();
    drawSling(ctx);
    for (const b of G.bodies) { if (!b.crasherAlive && b.label === 'target') continue; if (G.targets.includes(b) || b.label !== 'target') drawBlock(ctx, b); }
    // drops
    for (const d of G.drops) drawDrop(ctx, d);
    if (G.aiming) drawTrajectory(ctx);
    else if (hintRef.current && G.mode === 'level' && !G.flying && G.ammo > 0) drawHint(ctx);
    if (G.projectile) drawProj(ctx, G.projectile.position.x, G.projectile.position.y, G.projectile.angle, G.projectile.crasherProjKind, G.projectile.crasherR);
    for (const e of G.extra) drawProj(ctx, e.position.x, e.position.y, e.angle, e.crasherProjKind, e.crasherR);
    if (!G.flying && G.ammo > 0 && !G.ended && !G.bonusEnded) {
      const rx = G.aiming ? G.aimX : SLING.x, ry = G.aiming ? G.aimY : SLING.y - 6;
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(SLING.x - 24, SLING.y - 26); ctx.lineTo(rx, ry); ctx.moveTo(SLING.x + 24, SLING.y - 26); ctx.lineTo(rx, ry); ctx.stroke();
      drawProj(ctx, rx, ry, 0);
    }
    for (const pt of G.particles) { ctx.globalAlpha = Math.max(0, pt.life / pt.max); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.restore();
  };
  const drawSling = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(SLING.x, SLING.y + 130); ctx.lineTo(SLING.x, SLING.y); ctx.stroke();
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(SLING.x - 24, SLING.y - 26); ctx.lineTo(SLING.x, SLING.y); ctx.lineTo(SLING.x + 24, SLING.y - 26); ctx.stroke();
  };
  const drawProj = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, kind?: string, radius?: number) => {
    const def = PROJECTILES[kind || selRef.current] || PROJECTILES[selRef.current]; const r = radius || def.r;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.35, def.color); grad.addColorStop(1, '#000');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.font = `${r * 1.3}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(def.emoji, 0, 1); ctx.restore();
  };
  const drawDrop = (ctx: CanvasRenderingContext2D, d: Drop) => {
    ctx.save(); ctx.translate(d.x, d.y);
    // parachute
    ctx.fillStyle = 'rgba(245,158,11,0.9)'; ctx.beginPath(); ctx.arc(0, -d.r - 6, d.r * 0.9, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-d.r * 0.8, -d.r - 6); ctx.lineTo(-4, 0); ctx.moveTo(d.r * 0.8, -d.r - 6); ctx.lineTo(4, 0); ctx.stroke();
    // glowing prize bubble
    const pulse = 1 + Math.sin(d.t * 8) * 0.08;
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#fffbeb'; ctx.beginPath(); ctx.arc(0, 0, d.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.font = `${d.r * 1.2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.emoji, 0, 1);
    ctx.restore();
  };
  const drawBlock = (ctx: CanvasRenderingContext2D, b: Mat) => {
    const verts = b.vertices; const k = b.crasherKind;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.moveTo(verts[0].x, verts[0].y); for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y); ctx.closePath();
    let g0 = '#d4a574', g1 = '#92400e';
    if (k === 'rig') { g0 = '#6b7280'; g1 = '#374151'; } else if (k === 'plank') { g0 = '#a16207'; g1 = '#713f12'; } else if (k === 'target') { g0 = '#fbbf24'; g1 = '#d97706'; }
    const cx = b.position.x, cy = b.position.y;
    const grad = ctx.createLinearGradient(cx, cy - 30, cx, cy + 30); grad.addColorStop(0, g0); grad.addColorStop(1, g1);
    ctx.fillStyle = grad; ctx.fill(); ctx.shadowBlur = 0;
    if (k === 'target') { ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', cx, cy + 1); }
    else if (k === 'crate') { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
  };
  const drawTrajectory = (ctx: CanvasRenderingContext2D) => {
    const G = g.current; const dx = SLING.x - G.aimX, dy = SLING.y - G.aimY; const pull = Math.min(Math.hypot(dx, dy), MAX_PULL); const power = pull / MAX_PULL;
    // matches the real engine: position moves by velocity each frame, gravity ~0.34px/frame²
    let vx = dx * LAUNCH_SCALE, vy = dy * LAUNCH_SCALE; let x = G.aimX, y = G.aimY;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) { x += vx; y += vy; vy += 0.34; if (i % 2 === 0) { ctx.globalAlpha = Math.max(0.12, 1 - i / 60); ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, 5 - i * 0.06), 0, Math.PI * 2); ctx.fill(); } if (y > GROUND_Y || x > WORLD_W) break; }
    ctx.globalAlpha = 1;
    ctx.fillStyle = power > 0.9 ? '#ef4444' : '#22c55e'; ctx.fillRect(SLING.x - 30, SLING.y + 140, 60 * power, 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(SLING.x - 30, SLING.y + 140, 60, 8);
  };
  const drawHint = (ctx: CanvasRenderingContext2D) => {
    const G = g.current; if (!G.targets.length) return;
    const t = G.targets.reduce((a: Mat, b: Mat) => (b.position.y > a.position.y ? b : a));
    const ax = SLING.x, ay = SLING.y - 6; ctx.fillStyle = 'rgba(34,197,94,0.7)';
    for (let i = 0; i <= 30; i++) { const u = i / 30; const x = ax + (t.position.x - ax) * u; const y = ay + (t.position.y - ay) * u - Math.sin(u * Math.PI) * 240; if (i % 2 === 0) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); } }
  };

  /* ---- Pointer ---- */
  const getWorld = (e: React.PointerEvent) => { const c = canvasRef.current!; const r = c.getBoundingClientRect(); const s = WORLD_W / r.width; return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s }; };
  const onDown = (e: React.PointerEvent) => {
    const G = g.current; if (G.ended || G.bonusEnded) return;
    if (G.flying) { triggerPower(); return; }
    if (G.ammo <= 0) return;
    const p = getWorld(e);
    if (Math.hypot(p.x - SLING.x, p.y - SLING.y) < 240) { G.aiming = true; G.aimX = p.x; G.aimY = p.y; canvasRef.current!.setPointerCapture(e.pointerId); }
  };
  const onMove = (e: React.PointerEvent) => {
    const G = g.current; if (!G.aiming) return; const p = getWorld(e);
    const dx = p.x - SLING.x, dy = p.y - SLING.y, d = Math.hypot(dx, dy);
    if (d > MAX_PULL) { G.aimX = SLING.x + (dx / d) * MAX_PULL; G.aimY = SLING.y + (dy / d) * MAX_PULL; } else { G.aimX = p.x; G.aimY = p.y; }
  };
  const onUp = (e: React.PointerEvent) => {
    const Matter = MatterRef.current; const G = g.current; if (!G.aiming) return; G.aiming = false;
    try { canvasRef.current!.releasePointerCapture(e.pointerId); } catch {}
    const dx = SLING.x - G.aimX, dy = SLING.y - G.aimY; const dist = Math.hypot(dx, dy); if (dist < 22) return;
    const key = selRef.current; const def = PROJECTILES[key];
    const proj = Matter.Bodies.circle(G.aimX, G.aimY, def.r, { density: def.density, restitution: 0.3, friction: 0.4, frictionAir: 0.001, label: 'proj' });
    Matter.Composite.add(G.engine.world, proj);
    const boost = key === 'boomerang' ? 1.5 : 1;   // boomerang needs more power to fly out before curving
    const vx = dx * LAUNCH_SCALE * boost, vy = dy * LAUNCH_SCALE * boost;
    Matter.Body.setVelocity(proj, { x: vx, y: vy });
    G.projectile = proj; proj.crasherProjKind = key; G.flying = true; G.powerUsed = false; G.settleT = 0; G.flightT = 0; G.detonate = false; G.armed = true; G.launchDir = vx >= 0 ? 1 : -1; G.projKind = key;
    if (G.mode === 'level') {
      G.ammo--; setAmmoLeft(G.ammo);
      // power-ups are limited-use ammo (clapper is unlimited). Spend one use; re-lock + fall back when depleted.
      if (key !== FREE_PROJECTILE) {
        const remaining = ammoOf(key) - 1;
        spendProjectile(key);
        if (remaining <= 0) setSelProj(FREE_PROJECTILE);
      }
    }
    if (hintRef.current) setHintActive(false);
    spawnParticles(G.aimX, G.aimY, 8, '#fcd34d', 120);
  };

  /* ---- Buttons ---- */
  const useHint = () => {
    if (hintActive) { setHintActive(false); return; }
    if (saveRef.current.hints <= 0) { toast('No hints left — catch a 💡 drop or grab some in the Store.'); return; }
    setSave(prev => { const n = { ...prev, hints: prev.hints - 1 }; persist(n); return n; }); setHintActive(true);
  };
  const useSkip = () => {
    if (saveRef.current.skips <= 0) { toast('No skips left — catch a ⏭️ drop or grab some in the Store.'); return; }
    setSave(prev => { const n = { ...prev, skips: prev.skips - 1, stars: { ...prev.stars, [lvlRef.current]: Math.max(prev.stars[lvlRef.current] || 0, 1) }, lastUnlocked: Math.max(prev.lastUnlocked, lvlRef.current + 1) }; persist(n); return n; });
    toast('Level skipped — 1 star kept.'); nextLevel();
  };
  const retry = () => { setResult(null); setHintActive(false); buildArena(lvlRef.current, 'level'); };
  const nextLevel = () => {
    const ni = lvlRef.current + 1;
    if (ni >= LEVELS.length) { setScreen('menu'); return; }
    if (LEVELS[ni].pack === 'studio' && !studioUnlocked()) { setScreen('menu'); toast('Unlock the Studio Lot Pack to continue!'); return; }
    startLevel(ni);
  };
  const buyItem = async (id: string) => {
    try { const res = await fetch('/api/checkout/set-crashers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: id }) }); const data = await res.json(); if (data?.url) { window.location.href = data.url; return; } toast(data?.error || 'Could not start checkout — are you signed in?'); } catch { toast('Could not start checkout. Please try again.'); }
  };

  const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  const card: React.CSSProperties = { backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
  const prizeLabel = (k: string) => k === 'hint' ? '💡 Hints' : k === 'skip' ? '⏭️ Skips' : k.startsWith('proj:') ? `${PROJECTILES[k.slice(5)]?.emoji || '🎁'} ${PROJECTILES[k.slice(5)]?.name || 'Projectile'}` : '🎁';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', fontFamily: '-apple-system, Arial, sans-serif' }}>
      <div style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎬</span>
            <div><div style={{ fontWeight: 800, fontSize: '17px' }}>Set Crashers</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Nail the shot. Knock &apos;em down.</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 700 }}>⭐ {totalStars}</span>
            {screen === 'play' ? <button onClick={() => setScreen('menu')} style={navBtn}>← {mode === 'bonus' ? 'Menu' : 'Levels'}</button> : <Link href="/games" style={navBtn as React.CSSProperties}>← Games</Link>}
          </div>
        </div>
      </div>

      {screen === 'menu' && ready && (
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 48px' }}>
          <div style={{ ...card, background: 'linear-gradient(135deg,#1a1a2e,#3d3460)', border: 'none', textAlign: 'center', padding: '26px 18px', color: 'white' }}>
            <div style={{ fontSize: '46px' }}>🎬💥</div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '6px' }}>Set Crashers</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', lineHeight: 1.5 }}>Pull back the slingshot, launch a clapperboard, and topple the stacks to knock out every ⭐ target. Fewer shots = more stars.</div>
            <button onClick={() => startLevel(Math.min(save.lastUnlocked, LEVELS.length - 1))} disabled={!engineReady}
              style={{ marginTop: '16px', backgroundColor: engineReady ? '#F59E0B' : '#6b7280', color: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '16px', fontWeight: 800, cursor: engineReady ? 'pointer' : 'wait' }}>
              {engineReady ? `▶ ${save.lastUnlocked > 0 ? 'Continue' : 'Play'}` : 'Loading engine…'}
            </button>
          </div>

          {/* Bonus round */}
          <button onClick={startBonus} disabled={!engineReady} style={{ ...card, marginTop: '12px', width: '100%', background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', cursor: engineReady ? 'pointer' : 'wait', textAlign: 'left' }}>
            <span style={{ fontSize: '30px' }}>🎁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Bonus Round — Prize Drop</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>15 seconds. Prizes rain down — shoot as many as you can and keep them all!</div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>Best: {save.bonusBest}</span>
          </button>

          <div style={{ ...card, marginTop: '12px', padding: '14px 16px' }}>
            <button onClick={() => setShowHow(v => !v)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#374151' }}>ℹ️ How to play</span><span style={{ fontSize: '13px', color: '#9ca3af' }}>{showHow ? 'Hide' : 'Show'}</span>
            </button>
            {showHow && (<div style={{ marginTop: '10px', fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px' }}><strong>Goal:</strong> clear every ⭐ target on the level. The 🎬 counter shows how many shots you have left.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Aim &amp; fire:</strong> press and hold on the slingshot, drag <em>backward</em> (away from the stacks); a dotted arc previews the shot. Pull further for more power (watch the green/red power bar). Release to launch.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Take out a ⭐ — two ways:</strong></p>
              <p style={{ margin: '0 0 6px', paddingLeft: '12px' }}>① <strong>Smash it:</strong> hit the ⭐ directly with a fast, solid shot and it shatters on impact.</p>
              <p style={{ margin: '0 0 8px', paddingLeft: '12px' }}>② <strong>Knock it down:</strong> topple its support so the ⭐ falls off its perch. Once it drops to the ground or tumbles off-screen it counts as cleared — you don&apos;t have to hit it directly. (Every ⭐ starts up on a structure, never on the ground.)</p>
              <p style={{ margin: '0 0 8px' }}><strong>Domino effect:</strong> later levels are built to chain-react. Knock the first plank or tower into the next and the whole row can topple, clearing several ⭐ in one shot. Levels named &ldquo;Chain Start&rdquo; and &ldquo;Domino Row&rdquo; (and the harder Studio Lot stages) reward one well-aimed shot over many.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Your ammo — the basics:</strong> the 🎬 clapperboard is your <strong>unlimited</strong> standard ammo. Every level gives you a set number of shots regardless of which ammo you pick.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Power-ups are limited-use:</strong> special projectiles are consumable. Each one has its own count shown as a small number on its icon. <strong>You get 1 use each time you earn one through play, or 3 uses each time you buy one.</strong> Firing a power-up spends one use; when it hits 0 it locks again and you fall back to the clapperboard until you earn or buy more. Power-ups never run out during the Bonus Round.</p>
              <p style={{ margin: '0 0 4px' }}><strong>What each power-up does:</strong></p>
              <p style={{ margin: '0 0 3px', paddingLeft: '12px' }}>☕ <strong>Hot Coffee</strong> — explodes on impact with a blast radius.</p>
              <p style={{ margin: '0 0 3px', paddingLeft: '12px' }}>🎤 <strong>Boom Mic</strong> — heavy; tap mid-flight to dive-smash downward.</p>
              <p style={{ margin: '0 0 3px', paddingLeft: '12px' }}>🎞️ <strong>Film Reel</strong> — tap mid-flight to split into a spread of shots.</p>
              <p style={{ margin: '0 0 3px', paddingLeft: '12px' }}>🪃 <strong>Boomerang</strong> — flies out then curves back on its own; hits targets behind cover.</p>
              <p style={{ margin: '0 0 3px', paddingLeft: '12px' }}>💣 <strong>Bomb</strong> — explodes on impact with a huge blast (or tap to detonate early).</p>
              <p style={{ margin: '0 0 8px', paddingLeft: '12px' }}>🎭 <strong>Stunt Doubles</strong> — tap mid-flight to burst into 5 pieces fanning out.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Prize drops 🎁:</strong> parachuting prizes fall during play — hit one with your shot to grab it. They give +1 power-up use, a 💡 hint, or an ⏭️ skip. Miss it and it floats away.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Milestone rewards 🎁:</strong> every 5 levels you clear, you automatically earn a random prize — power-up uses, hints, or skips — shown on the level-complete screen. The rewards <strong>grow bigger the deeper you go</strong> (levels 25+ give the biggest hauls), and there&apos;s a rare <strong>💰 JACKPOT</strong> that drops a windfall of every power-up plus hints and skips at once. Keep clearing new levels to keep them coming.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Bonus Round:</strong> 15 seconds of non-stop prize drops with unlimited ammo and free power-ups — shoot as many prizes as you can and keep everything you hit. Your best haul is saved.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Stars &amp; help:</strong> finish at or under par for 3★, one over for 2★, otherwise 1★. 💡 <strong>Hint</strong> shows a suggested arc; ⏭️ <strong>Skip</strong> jumps past a tough level keeping 1★. Earn more hints/skips from prize drops or the Store. Star milestones also award free power-up uses.</p>
              <p style={{ margin: '0 0 8px' }}><strong>🎟️ Studio Lot Pack:</strong> a paid pack of <strong>12 extra levels</strong> beyond the free &ldquo;On Location&rdquo; set. They&apos;re tougher — taller fortresses, multi-target shelves, and bigger domino chains that escalate as you progress (later stages give you fewer shots, so chaining matters). It&apos;s a <strong>one-time unlock</strong> (not consumable): once you own it, all 12 levels are yours forever. Buy it on its own, or get it included in the Mega Pack.</p>
              <p style={{ margin: 0 }}><strong>Store &amp; bundles:</strong> buy individual power-ups (3 uses each), the Studio Lot Pack, or save with bundles — the <strong>Power-Up Bundle</strong> gives 3 uses of all six power-ups, and the <strong>Mega Pack</strong> adds the Studio Lot Pack on top for the best value. Hints and skips are also sold in packs.</p>
            </div>)}
          </div>

          <div style={{ marginTop: '18px', fontWeight: 800, fontSize: '14px', color: '#e5e7eb' }}>Your Ammo</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '8px' }}>
            {Object.entries(PROJECTILES).map(([key, def]) => { const isClapper = key === FREE_PROJECTILE; const uses = ammoOf(key); const unlocked = isClapper || uses > 0; const sel = selProj === key; return (
              <button key={key} onClick={() => unlocked ? setSelProj(key) : buyItem(`proj_${key}`)} style={{ ...card, padding: '10px 6px', textAlign: 'center', cursor: 'pointer', border: sel ? '2px solid #F59E0B' : '1px solid #e5e7eb', opacity: unlocked ? 1 : 0.5 }}>
                <div style={{ fontSize: '26px' }}>{def.emoji}</div><div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', marginTop: '2px' }}>{def.name}</div>
                {isClapper ? <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 800, marginTop: '2px' }}>∞ Unlimited</div>
                  : uses > 0 ? <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 800, marginTop: '2px' }}>×{uses} left</div>
                  : <div style={{ fontSize: '9px', color: '#F59E0B', fontWeight: 800, marginTop: '2px' }}>Earn / Buy</div>}
                {sel && <div style={{ fontSize: '9px', color: '#1d4ed8', fontWeight: 800, marginTop: '1px' }}>✓ Equipped</div>}
              </button>); })}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>{PROJECTILES[selProj]?.desc}</div>

          {(['free', 'studio'] as const).map(pack => {
            const levels = LEVELS.map((l, i) => ({ l, i })).filter(x => x.l.pack === pack);
            const locked = pack === 'studio' && !studioUnlocked(); const base = LEVELS.findIndex(x => x.pack === pack);
            return (
              <div key={pack} style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#e5e7eb' }}>{pack === 'free' ? '🎬 On Location (Free)' : '🎟️ Studio Lot Pack'}</span>
                  {locked && <button onClick={() => buyItem('pack_studio')} style={{ fontSize: '12px', fontWeight: 800, color: '#1a1a2e', backgroundColor: '#F59E0B', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>Unlock $2.99</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '8px' }}>
                  {levels.map(({ l, i }) => { const stars = save.stars[i] || 0; const playable = !locked && i <= save.lastUnlocked; return (
                    <button key={i} disabled={!playable && !locked} onClick={() => locked ? buyItem('pack_studio') : playable ? startLevel(i) : null} style={{ ...card, padding: '10px 4px', textAlign: 'center', cursor: (playable || locked) ? 'pointer' : 'not-allowed', opacity: (playable || locked) ? 1 : 0.45 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1a1a2e' }}>{locked ? '🔒' : i - base + 1}</div>
                      <div style={{ fontSize: '9px', color: '#9ca3af', height: '12px', overflow: 'hidden' }}>{l.name}</div>
                      <div style={{ fontSize: '11px', marginTop: '2px', letterSpacing: '1px' }}>{[0, 1, 2].map(n => <span key={n} style={{ color: n < stars ? '#fbbf24' : '#d1d5db' }}>★</span>)}</div>
                    </button>); })}
                </div>
              </div>);
          })}

          <div style={{ marginTop: '22px', fontWeight: 800, fontSize: '14px', color: '#e5e7eb' }}>Store 💎</div>
          <div style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 8px' }}>Optional — the free pack &amp; bonus round are fully playable, and the 🪃/💣/🎭 ammo unlocks free through play.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {STORE.map(it => {
              const isProj = it.kind === 'proj';
              const projKey = isProj ? it.id.slice(5) : '';
              const have = isProj ? ammoOf(projKey) : 0;
              const packOwned = it.kind === 'pack' && owns(it.id);
              return (
              <div key={it.id} style={{ ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{it.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{it.name}{isProj && have > 0 && <span style={{ color: '#16a34a', fontWeight: 800 }}> · {have} left</span>}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{it.desc}{isProj ? ` Buy = ${PURCHASE_USES} uses.` : ''}</div>
                </div>
                {packOwned ? <span style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a' }}>✓ Owned</span> : <button onClick={() => buyItem(it.id)} style={{ backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{it.price}</button>}
              </div>); })}
          </div>
          <Copyright />
        </div>
      )}

      {screen === 'play' && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '12px 12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', color: 'white' }}>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>{mode === 'bonus' ? '🎁 Bonus Round' : LEVELS[levelIdx].name}</div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '13px' }}>
              {mode === 'bonus'
                ? <span style={{ color: bonusTime <= 5 ? '#ef4444' : '#fbbf24', fontWeight: 800 }}>⏱️ {bonusTime}s</span>
                : <><span>🎯 {targetsLeft}</span><span>🎬 {ammoLeft}</span><span style={{ color: '#9ca3af' }}>par {LEVELS[levelIdx].par}</span></>}
            </div>
          </div>
          <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '2px solid #2d2d52', touchAction: 'none' }}>
            <canvas ref={canvasRef} width={WORLD_W} height={WORLD_H} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} style={{ width: '100%', display: 'block', cursor: 'grab', background: '#1a1a2e' }} />
            {result && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,15,26,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div style={{ fontSize: '26px', fontWeight: 900 }}>{result.won ? 'Nailed it!' : 'Cut! Try again'}</div>
                {result.won && <div style={{ fontSize: '44px', marginTop: '8px', letterSpacing: '6px' }}>{[0, 1, 2].map(n => <span key={n} style={{ color: n < result.stars ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>★</span>)}</div>}
                {result.won && rewardInfo && (
                  <div style={{ marginTop: '16px', padding: rewardInfo.jackpot ? '16px 24px' : '12px 20px', background: rewardInfo.jackpot ? 'linear-gradient(135deg,#f59e0b,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: rewardInfo.jackpot ? '0 8px 32px rgba(245,158,11,0.7)' : '0 6px 24px rgba(124,58,237,0.55)', border: rewardInfo.jackpot ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)', maxWidth: '300px' }}>
                    <span style={{ fontSize: rewardInfo.jackpot ? '40px' : '32px' }}>{rewardInfo.emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: rewardInfo.jackpot ? '#1a1a2e' : 'white', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{rewardInfo.jackpot ? '💰 JACKPOT' : '🎁 Milestone Reward'}</div>
                      <div style={{ fontSize: rewardInfo.jackpot ? '15px' : '17px', fontWeight: 900, color: rewardInfo.jackpot ? '#1a1a2e' : 'white', lineHeight: 1.2 }}>{rewardInfo.label}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button onClick={retry} style={resBtn('#374151')}>↻ Retry</button>
                  {result.won ? <button onClick={nextLevel} style={resBtn('#F59E0B', '#1a1a2e')}>Next →</button> : saveRef.current.skips > 0 ? <button onClick={useSkip} style={resBtn('#7c3aed')}>⏭️ Skip ({saveRef.current.skips})</button> : <button onClick={() => buyItem('skips_3')} style={resBtn('#7c3aed')}>Get Skips</button>}
                </div>
              </div>
            )}
            {bonusResult && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,15,26,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '20px' }}>
                <div style={{ fontSize: '26px', fontWeight: 900 }}>Time! 🎁</div>
                <div style={{ fontSize: '15px', marginTop: '6px', color: 'rgba(255,255,255,0.8)' }}>You caught {bonusResult.total} prize{bonusResult.total === 1 ? '' : 's'}{bonusResult.total > save.bonusBest ? ' — new best!' : ''}</div>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                  {Object.entries(bonusResult.caught).length === 0 ? <span style={{ color: '#9ca3af' }}>No prizes this time — try again!</span> : Object.entries(bonusResult.caught).map(([k, v]) => <div key={k}>{prizeLabel(k)} × {v}</div>)}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button onClick={() => startBonus()} style={resBtn('#7c3aed')}>↻ Again</button>
                  <button onClick={() => setScreen('menu')} style={resBtn('#F59E0B', '#1a1a2e')}>Menu</button>
                </div>
              </div>
            )}
          </div>

          {mode === 'level' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={useHint} style={{ flex: 1, ...ctrlBtn, border: hintActive ? '2px solid #22c55e' : '1px solid #374151' }}>💡 Hint <span style={{ color: '#9ca3af' }}>({save.hints})</span></button>
              <button onClick={retry} style={{ flex: 1, ...ctrlBtn }}>↻ Restart</button>
              <button onClick={useSkip} style={{ flex: 1, ...ctrlBtn }}>⏭️ Skip <span style={{ color: '#9ca3af' }}>({save.skips})</span></button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.entries(PROJECTILES).map(([key, def]) => { const isClapper = key === FREE_PROJECTILE; const uses = ammoOf(key); const unlocked = isClapper || mode === 'bonus' || uses > 0; const sel = selProj === key; return (
              <button key={key} onClick={() => { if (!unlocked) { buyItem(`proj_${key}`); return; } if (!g.current.flying) setSelProj(key); }} title={def.name} style={{ width: '44px', height: '44px', borderRadius: '10px', border: sel ? '2px solid #F59E0B' : '1px solid #374151', backgroundColor: sel ? 'rgba(245,158,11,0.15)' : '#1a1a2e', fontSize: '22px', cursor: 'pointer', opacity: unlocked ? 1 : 0.45, position: 'relative' }}>
                {def.emoji}
                {!isClapper && mode !== 'bonus' && uses > 0 && <span style={{ position: 'absolute', bottom: '-5px', right: '-3px', fontSize: '10px', fontWeight: 900, color: '#fff', backgroundColor: '#16a34a', borderRadius: '7px', padding: '0 4px', lineHeight: '14px' }}>{uses}</span>}
                {!unlocked && <span style={{ position: 'absolute', top: '-5px', right: '-4px', fontSize: '10px' }}>🔒</span>}
              </button>); })}
          </div>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>{mode === 'bonus' ? 'Shoot the falling prizes — keep every one you hit!' : PROJECTILES[selProj]?.power !== 'none' && PROJECTILES[selProj]?.power !== 'boomerang' ? 'Tap mid-flight to trigger power' : PROJECTILES[selProj]?.power === 'boomerang' ? 'Curves back automatically — aim to hit on the return' : 'Drag back from the slingshot to aim'}</div>
        </div>
      )}

      {notice && <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#374151', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, zIndex: 90, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>{notice}</div>}
    </div>
  );
}

const navBtn: React.CSSProperties = { fontSize: '13px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'none', cursor: 'pointer' };
const ctrlBtn: React.CSSProperties = { backgroundColor: '#1a1a2e', color: 'white', border: '1px solid #374151', borderRadius: '10px', padding: '11px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' };
const resBtn = (bg: string, fg = 'white'): React.CSSProperties => ({ backgroundColor: bg, color: fg, border: 'none', borderRadius: '10px', padding: '11px 20px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' });
