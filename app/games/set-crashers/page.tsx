'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { openCheckout } from '@/utils/isAndroidApp';
import Copyright from '@/components/Copyright';
import { Leaderboard, LeaderboardRail } from './Leaderboard';
import { LEVELS } from './levels';
import type { Block, Level } from './levels';

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
const LAUNCH_SCALE = 0.18;     // pull -> velocity (+20% from 0.15; VMAX cap scales from this, so shots stay on-world)
const DIFFICULTY = 6;          // 1 = original, 2 = previous. 6 = current "hard mode".
// ── DIFFICULTY MATH — read before changing ────────────────────────────────
// This single number drives two things:
//   target HP      = 100 * (1 + (D-1) * 0.5)   (line ~419)
//   block density  = base * (1 + (D-1) * 0.6)   (line ~417)
// Damage is dealt as `force * 60`, and only when force > 2 (line ~482).
//
// HP is deliberately scaled SUB-LINEARLY while weight scales faster. That is
// the whole trick: structures get much heavier and sturdier (the real source
// of difficulty) without turning targets into bullet sponges.
//
// Why that matters: 142 of the 182 levels have MORE targets than shots, so
// they can only be cleared by chain reactions — one shot collapsing a
// structure onto several targets. Collapse debris lands with low force
// (roughly 2-6). If target HP outruns that, those levels stop being hard and
// become impossible.
//   D = 2  -> 200 HP : force 3.4 kills          (old, easy)
//   D = 6  -> 350 HP : force 5.9 kills          (current — collapses still work)
//   naive linear D=6 would have been 600 HP (force 10) and would have broken
//   the chain-reaction levels outright.
// Raise above 8 only with play-testing. Never use a linear HP curve here.
// ──────────────────────────────────────────────────────────────────────────

// ── "BOX OFFICE" SCORING — your score is your film's gross ──
const SC = { KNOCKDOWN: 1000, UNDER_BUDGET: 5000, ONE_TAKE: 15000, CHAIN: 500, MULTI_CAP: 4 };
// One shot that downs N crashers scores N * 1000 * min(N,4), + chain bonus for consecutive scoring shots.
function shotPoints(down: number, streak: number) {
  if (down <= 0) return 0;
  const mult = Math.min(down, SC.MULTI_CAP);
  return down * SC.KNOCKDOWN * mult + (streak > 0 ? SC.CHAIN * streak : 0);
}

type ProjDef = { emoji: string; name: string; r: number; density: number; power: string; desc: string; color: string; free?: boolean };
const PROJECTILES: Record<string, ProjDef> = {
  clapper:   { emoji: '🎬', name: 'Clapperboard',  r: 24, density: 0.004, power: 'none',      desc: 'The reliable all-rounder.', color: '#1f2937' },
  coffee:    { emoji: '☕', name: 'Hot Coffee',    r: 22, density: 0.004, power: 'explode',   desc: 'Explodes on impact — blast radius. (Or tap to detonate early.)', color: '#7c3f1d' },
  boom:      { emoji: '🎤', name: 'Boom Mic',      r: 20, density: 0.012, power: 'heavy',     desc: 'Heavy. Tap to dive down and smash through stacks.', color: '#374151' },
  reel:      { emoji: '🎞️', name: 'Film Reel',     r: 26, density: 0.003, power: 'split',     desc: 'Tap mid-flight — splits into 3.', color: '#4b5563' },
  // ---- free unlock (earned by catching prize drops or by star milestones) ----
  boomerang: { emoji: '↩️', name: 'Boomerang',     r: 30, density: 0.008, power: 'boomerang', desc: 'Curves back mid-flight then bounces hard — wrecks targets on the way out AND the way back.', color: '#a16207', free: true },
  bomb:      { emoji: '💣', name: 'Bomb',          r: 22, density: 0.005, power: 'bomb',      desc: 'Explodes on impact with a huge blast. (Or tap to detonate early.)', color: '#111827', free: true },
  stunt:     { emoji: '🎭', name: 'Stunt Doubles', r: 24, density: 0.004, power: 'multi',     desc: 'Tap mid-flight — splits into a wide 5-way spread.', color: '#4b5563', free: true },
  bombstunt: { emoji: '💥', name: 'Stunt Bomb Squad', r: 24, density: 0.005, power: 'bombstunt', desc: 'SUPER: tap mid-flight to split into a squad of giant stunt doubles — each blows up on contact with anything.', color: '#b91c1c' },
  skystrike: { emoji: '☄️', name: 'Sky Strike',    r: 24, density: 0.006, power: 'skystrike', desc: 'SUPER: tap mid-flight to surge +300% speed in its current direction, then a gigantic blast on contact.', color: '#4338ca' },
};
const FREE_PROJECTILE = 'clapper';
// ── Stackable buff power-ups (modifiers applied on top of any base projectile) ──
const STRENGTH_MULT = 1.75;   // +75% launch power
const SIZE_MULT = 1.9;        // bigger projectile
const BUFFS: Record<string, { emoji: string; name: string; desc: string; color: string }> = {
  buff_strength: { emoji: '💪', name: 'Power Sling', desc: 'Boosts slingshot strength by 75% and enlarges the sling. Stacks with other shot buffs.', color: '#dc2626' },
  buff_size:     { emoji: '🔎', name: 'Big Shot',    desc: 'Makes the launched item much larger for a wider hit. Stacks with other shot buffs.', color: '#0891b2' },
  buff_aimer:    { emoji: '🎯', name: 'Long Sight',  desc: 'Extends the dotted aimer all the way to the ground, every shot. Stacks with other shot buffs.', color: '#16a34a' },
};
const BUFF_KEYS = ['buff_strength', 'buff_size', 'buff_aimer'];
const FREE_UNLOCK_KEYS = ['boomerang', 'bomb', 'stunt']; // unlockable without paying
// star milestones that guarantee a free projectile even if you never catch a drop
const STAR_MILESTONES: { stars: number; key: string }[] = [
  { stars: 6, key: 'boomerang' }, { stars: 12, key: 'bomb' }, { stars: 18, key: 'stunt' },
];

const STORE = [
  { id: 'pack_studio', emoji: '🎟️', name: 'Studio Lot Pack', desc: '30 unique studio locations — falling obstacles & trick shots.', price: '$2.99', kind: 'pack' },
  { id: 'pack_noir',  emoji: '🕵️', name: 'Film Noir Pack',      desc: '30 brand-new noir locations — bounce-shots & shadows. Very hard.', price: '$3.99', kind: 'pack' },
  { id: 'pack_scifi', emoji: '🛸', name: 'Sci-Fi Backlot Pack',  desc: '30 sci-fi locations — falling debris, ricochet walls. Extremely hard.', price: '$3.99', kind: 'pack' },
  { id: 'pack_chaos', emoji: '🧨', name: 'Demolition Pack',      desc: '30 chaos locations — every mechanic at once. Brutal.', price: '$3.99', kind: 'pack' },
  { id: 'proj_coffee', emoji: '☕', name: 'Hot Coffee Ammo',  desc: 'Unlock the exploding coffee projectile.',       price: '$1.99', kind: 'proj' },
  { id: 'proj_boom',   emoji: '🎤', name: 'Boom Mic Ammo',    desc: 'Unlock the heavy smashing boom mic.',           price: '$1.99', kind: 'proj' },
  { id: 'proj_reel',   emoji: '🎞️', name: 'Film Reel Ammo',  desc: 'Unlock the splitting film reel.',               price: '$1.99', kind: 'proj' },
  // free-earn power-ups, also buyable as a shortcut (Option A)
  { id: 'proj_boomerang', emoji: '↩️', name: 'Boomerang Ammo', desc: 'Unlock now (or earn it free through play).',    price: '$1.99', kind: 'proj' },
  { id: 'proj_bomb',      emoji: '💣', name: 'Bomb Ammo',      desc: 'Unlock now (or earn it free through play).',    price: '$1.99', kind: 'proj' },
  { id: 'proj_stunt',     emoji: '🎭', name: 'Stunt Doubles Ammo', desc: 'Unlock now (or earn it free through play).', price: '$1.99', kind: 'proj' },
  // bundles (discounted vs buying separately)
  { id: 'bundle_powerups', emoji: '🎁', name: 'Power-Up Bundle', desc: 'All 6 special projectiles — save vs buying separately.', price: '$6.99', kind: 'bundle', grants: ['proj_coffee', 'proj_boom', 'proj_reel', 'proj_boomerang', 'proj_bomb', 'proj_stunt'] },
  { id: 'bundle_mega',     emoji: '🏆', name: 'Mega Pack',      desc: 'Every projectile PLUS the Studio Lot level pack — best value.', price: '$8.99', kind: 'bundle', grants: ['proj_coffee', 'proj_boom', 'proj_reel', 'proj_boomerang', 'proj_bomb', 'proj_stunt', 'pack_studio'] },
  { id: 'hints_5',     emoji: '💡', name: '5 Hints',          desc: 'See a suggested shot arc.',                     price: '$0.99', kind: 'consumable' },
  { id: 'skips_3',     emoji: '⏭️', name: '3 Level Skips',    desc: 'Stuck? Skip a level and keep 1 star.',          price: '$0.99', kind: 'consumable' },
  { id: 'buff_strength', emoji: '💪', name: 'Power Sling (3 uses)', desc: '+75% slingshot strength and a bigger sling. Stacks with other shot buffs.', price: '$1.99', kind: 'proj' },
  { id: 'buff_size',     emoji: '🔎', name: 'Big Shot (3 uses)',    desc: 'Launch a much larger item for a wider hit. Stacks with other shot buffs.',  price: '$1.99', kind: 'proj' },
  { id: 'buff_aimer',    emoji: '🎯', name: 'Long Sight (3 uses)',  desc: 'Dotted aimer reaches the ground every shot. Stacks with other shot buffs.',  price: '$1.99', kind: 'proj' },
  { id: 'proj_bombstunt', emoji: '💥', name: 'Stunt Bomb Squad (3 uses)', desc: 'SUPER: splits into 2 giant stunt doubles that each blow up huge.', price: '$5.99', kind: 'proj' },
  { id: 'proj_skystrike', emoji: '☄️', name: 'Sky Strike (3 uses)',       desc: 'SUPER: rockets up, then slams down for a gigantic blast.',         price: '$5.99', kind: 'proj' },
];
// what each bundle unlocks, used to mark them owned + to grant on purchase reconcile
const BUNDLE_GRANTS: Record<string, string[]> = {
  bundle_powerups: ['proj_coffee', 'proj_boom', 'proj_reel', 'proj_boomerang', 'proj_bomb', 'proj_stunt'],
  bundle_mega: ['proj_coffee', 'proj_boom', 'proj_reel', 'proj_boomerang', 'proj_bomb', 'proj_stunt', 'pack_studio'],
};

// Block and Level types are imported from ./levels (see import above).

// LEVELS is imported from ./levels

// ── PACK REGISTRY — each pack is a contiguous slice of LEVELS by index ──
// from/count are filled to match the real LEVELS array as packs are added in later phases.
type PackDef = { id: string; label: string; emoji: string; price?: string; storeId?: string };
const PACK_ORDER: PackDef[] = [
  { id: 'free',        label: 'On Location (Free)', emoji: '🎬' },
  { id: 'pack_studio', label: 'Studio Lot Pack',    emoji: '🎟️', price: '$2.99', storeId: 'pack_studio' },
  { id: 'pack_noir',   label: 'Film Noir Pack',     emoji: '🕵️', price: '$3.99', storeId: 'pack_noir' },
  { id: 'pack_scifi',  label: 'Sci-Fi Backlot Pack',emoji: '🛸', price: '$3.99', storeId: 'pack_scifi' },
  { id: 'pack_chaos',  label: 'Demolition Pack',    emoji: '🧨', price: '$3.99', storeId: 'pack_chaos' },
];
// derive each pack's index range from the LEVELS array (pack field on each level)
function packRange(packId: string) {
  const from = LEVELS.findIndex(l => (l.pack as string) === packId);
  if (from < 0) return null;
  let count = 0; for (let i = from; i < LEVELS.length && (LEVELS[i].pack as string) === packId; i++) count++;
  return { from, count };
}
const packOfIndex = (idx: number): PackDef | undefined => {
  for (const p of PACK_ORDER) { const r = packRange(p.id); if (r && idx >= r.from && idx < r.from + r.count) return p; }
  return undefined;
};

type SaveData = { stars: Record<number, number>; owned: string[]; ammoCounts: Record<string, number>; claimedMilestones: string[]; claimedRewards: number[]; claimedPurchases: string[]; hints: number; skips: number; lastUnlocked: number; bonusBest: number; lastPlayDate: string; dailyStreak: number; badges: string[]; perfectClears: number; bestCombo: number; bestStreak: number; bossClears: number; lastBonusAt: number; welcomeGift: boolean; levelScores: Record<number, number>; careerBest: number; handle: string };
const DEFAULT_SAVE: SaveData = { stars: {}, owned: [], ammoCounts: {}, claimedMilestones: [], claimedRewards: [], claimedPurchases: [], hints: 1, skips: 0, lastUnlocked: 0, bonusBest: 0, lastPlayDate: '', dailyStreak: 0, badges: [], perfectClears: 0, bestCombo: 0, bestStreak: 0, bossClears: 0, lastBonusAt: 0, welcomeGift: false, levelScores: {}, careerBest: 0, handle: '' };
const BONUS_COOLDOWN_MS = 3 * 60 * 1000; // bonus round playable once every 3 minutes
const RESUME_KEY = 'sr-set-crashers-resume'; // remembers the exact level last played
function loadSave(): SaveData {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const s = { ...DEFAULT_SAVE, ...JSON.parse(raw) }; if (!s.ammoCounts) s.ammoCounts = {}; if (!s.claimedMilestones) s.claimedMilestones = []; if (!s.claimedRewards) s.claimedRewards = []; if (!s.claimedPurchases) s.claimedPurchases = []; if (typeof s.lastPlayDate !== 'string') s.lastPlayDate = ''; if (typeof s.dailyStreak !== 'number') s.dailyStreak = 0; if (!Array.isArray(s.badges)) s.badges = []; if (typeof s.perfectClears !== 'number') s.perfectClears = 0; if (typeof s.bestCombo !== 'number') s.bestCombo = 0; if (typeof s.bestStreak !== 'number') s.bestStreak = 0; if (typeof s.bossClears !== 'number') s.bossClears = 0; if (typeof s.lastBonusAt !== 'number') s.lastBonusAt = 0; if (typeof s.welcomeGift !== 'boolean') s.welcomeGift = false; if (!s.levelScores) s.levelScores = {}; if (typeof s.careerBest !== 'number') s.careerBest = 0; if (typeof s.handle !== 'string') s.handle = ''; return s; } } catch {}
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
// Weighted pool for bonus/level drops — favors the requested power-ups (more copies = higher odds).
const BONUS_DROP_POOL = ['bombstunt', 'bombstunt', 'skystrike', 'skystrike', 'stunt', 'stunt', 'bomb', 'bomb', 'boomerang'];
const MILESTONE_EVERY = 5; // award a random prize every N distinct levels cleared

// ── Director's Cut: every 10th level is a named "boss" set-piece ──
const isBossLevel = (idx: number) => (idx + 1) % 10 === 0;
const BOSS_NAMES: Record<number, { title: string; subtitle: string }> = {
  9:  { title: 'The Watchtower', subtitle: 'Act I Finale' },
  19: { title: 'Demolition Day', subtitle: 'Act II Finale' },
  29: { title: 'The Grand Finale', subtitle: 'Act III Finale' },
};
const bossInfo = (idx: number) => BOSS_NAMES[idx] || { title: `Director's Cut ${Math.floor((idx + 1) / 10)}`, subtitle: 'Featured Set-Piece' };

// ── Badges: collectible achievements across progression, skill, dedication ──
type BadgeDef = { id: string; name: string; emoji: string; desc: string; check: (s: SaveData, levelCount: number) => boolean };
const BADGES: BadgeDef[] = [
  // Progression
  { id: 'first_clear', name: 'Lights, Camera!', emoji: '🎬', desc: 'Clear your first level', check: s => Object.values(s.stars).filter(v => v > 0).length >= 1 },
  { id: 'cleared_5', name: 'Getting Started', emoji: '🎞️', desc: 'Clear 5 levels', check: s => Object.values(s.stars).filter(v => v > 0).length >= 5 },
  { id: 'cleared_15', name: 'Set Veteran', emoji: '🎥', desc: 'Clear 15 levels', check: s => Object.values(s.stars).filter(v => v > 0).length >= 15 },
  { id: 'cleared_all', name: 'Studio Master', emoji: '🏆', desc: 'Clear every level', check: (s, lc) => Object.values(s.stars).filter(v => v > 0).length >= lc },
  // Skill
  { id: 'first_3star', name: 'Sharpshooter', emoji: '🎯', desc: 'Earn 3 stars on a level', check: s => Object.values(s.stars).some(v => v >= 3) },
  { id: 'stars_50', name: 'Star Collector', emoji: '⭐', desc: 'Earn 50 total stars', check: s => Object.values(s.stars).reduce((a, b) => a + b, 0) >= 50 },
  { id: 'perfect_1', name: 'One and Done', emoji: '🌟', desc: 'Clear a level in a single shot', check: s => (s.perfectClears || 0) >= 1 },
  { id: 'perfect_5', name: 'Perfectionist', emoji: '💎', desc: 'Get 5 perfect (one-shot) clears', check: s => (s.perfectClears || 0) >= 5 },
  { id: 'combo_4', name: 'Demolition Expert', emoji: '💥', desc: 'Knock out 4 targets in one shot', check: s => (s.bestCombo || 0) >= 4 },
  // Dedication
  { id: 'streak_3', name: 'Regular', emoji: '🔥', desc: 'Reach a 3-day streak', check: s => (s.bestStreak || 0) >= 3 },
  { id: 'streak_7', name: 'Devoted', emoji: '🗓️', desc: 'Reach a 7-day streak', check: s => (s.bestStreak || 0) >= 7 },
  { id: 'bonus_20', name: 'Bonus Hunter', emoji: '🎁', desc: 'Catch 20 prizes in one bonus round', check: s => (s.bonusBest || 0) >= 20 },
  { id: 'boss_1', name: "Director's Cut", emoji: '🎦', desc: 'Clear a Director\u2019s Cut boss level', check: s => (s.bossClears || 0) >= 1 },
];

export default function SetCrashers() {
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [mode, setMode] = useState<Mode>('level');
  const [levelIdx, setLevelIdx] = useState(0);
  const [ammoLeft, setAmmoLeft] = useState(0);
  const [targetsLeft, setTargetsLeft] = useState(0);
  const [selProj, setSelProj] = useState<string>(FREE_PROJECTILE);
  const [buffs, setBuffs] = useState<{ strength: boolean; size: boolean; aimer: boolean }>({ strength: false, size: false, aimer: false });
  const [result, setResult] = useState<{ won: boolean; stars: number } | null>(null);
  const [rewardInfo, setRewardInfo] = useState<{ emoji: string; label: string; jackpot?: boolean } | null>(null);
  const [comboFx, setComboFx] = useState<{ label: string; n: number; x: number; y: number; t: number } | null>(null);
  const [perfectFx, setPerfectFx] = useState(false);
  const [badgeFx, setBadgeFx] = useState<BadgeDef | null>(null);
  const [showBadges, setShowBadges] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [scoreFx, setScoreFx] = useState<{ level: number; career: number } | null>(null);
  const [bossCard, setBossCard] = useState<{ title: string; subtitle: string } | null>(null);
  const [dailyFx, setDailyFx] = useState<{ streak: number; label: string; emoji: string } | null>(null);
  const [bonusResult, setBonusResult] = useState<{ caught: Record<string, number>; total: number } | null>(null);
  const [bonusTime, setBonusTime] = useState(15);
  const [nowTick, setNowTick] = useState(Date.now());
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
    comboCount?: number; comboLast?: number; shotTargets?: number; maxComboThisLevel?: number; settleLossT?: number; skyStrikeActive?: boolean; levelScore?: number; shotDowns?: number; scoreStreak?: number; _lastTally?: number;
    drops: Drop[]; dropTimer: number; bonusT: number; bonusCaught: Record<string, number>; bonusEnded: boolean;
  }>({ engine: null, raf: 0, mode: 'level', bodies: [], targets: [], projectile: null, flying: false, extra: [], aiming: false, aimX: 0, aimY: 0, particles: [], shake: 0, ammo: 0, armed: false, loadGuard: 0, ended: false, powerUsed: false, settleT: 0, flightT: 0, last: 0, launchDir: 1, projKind: 'clapper', detonate: false, drops: [], dropTimer: 6, bonusT: 15, bonusCaught: {}, bonusEnded: false });

  const saveRef = useRef(save); saveRef.current = save;
  const selRef = useRef(selProj); selRef.current = selProj;
  const buffsRef = useRef(buffs); buffsRef.current = buffs;
  const hintRef = useRef(hintActive); hintRef.current = hintActive;
  // lvlRef is the source of truth for the active level. It's set explicitly in startLevel.
  // Do NOT re-sync it to levelIdx on every render — that clobbers the value startLevel just
  // set (before setLevelIdx's state update commits), which made "Next" read a stale level.
  const lvlRef = useRef(levelIdx);

  useEffect(() => {
    if (screen !== 'menu') return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [screen]);

  const persist = useCallback((s: SaveData) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {} }, []);
  const getToken = useCallback(async () => {
    try { const m = await import('@/utils/supabase/client'); const supa = m.createClient(); const { data } = await supa.auth.getSession(); return data.session?.access_token || null; } catch { return null; }
  }, []);
  const submitScore = useCallback(async (careerScore: number, totalStars: number, levelsCleared: number, bestCombo: number, handle: string) => {
    try {
      const token = await getToken(); if (!token) return; // only ranked when signed in
      await fetch('/api/games/set-crashers/score', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ careerScore, totalStars, levelsCleared, bestCombo, handle }) });
    } catch {}
  }, [getToken]);
  const toast = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2400); };

  useEffect(() => {
    let alive = true;
    (async () => { const Matter = await import('matter-js'); if (!alive) return; MatterRef.current = Matter; setEngineReady(true); })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const s = loadSave(); setReady(true);
    // ── One-time welcome gift: 3 uses of every power-up (and every buff) for new players ──
    if (!s.welcomeGift) {
      const counts = { ...(s.ammoCounts || {}) };
      const giftKeys = ['coffee','boom','reel','boomerang','bomb','stunt','bombstunt','skystrike','buff_strength','buff_size','buff_aimer'];
      for (const k of giftKeys) counts[k] = (counts[k] || 0) + 3;
      s.ammoCounts = counts; s.welcomeGift = true;
      persist(s);
      setTimeout(() => toast('🎁 Welcome gift: 3 free uses of every power-up!'), 600);
    }
    setSave(s);
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
            else if (item.startsWith('buff_')) { addProj(item, PURCHASE_USES); }            // buff: +3 uses (keyed by full id)
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
  const packOwned = (packId: string) => packId === 'free' || owns(packId);
  // A location is playable if its pack is OWNED, and within that pack it is either the first
  // location, already cleared (replay), or the immediately-previous location IN THE SAME PACK
  // has been cleared. Pack access is governed by purchase — NOT by finishing the previous
  // pack — so a newly-bought pack opens its first location right away, then unlocks one at a time.
  const isPlayable = (idx: number) => {
    const p = packOfIndex(idx); if (!p || !packOwned(p.id)) return false;
    if ((saveRef.current.stars[idx] || 0) > 0) return true;     // cleared → replayable
    const r = packRange(p.id); if (!r) return false;
    if (idx === r.from) return true;                            // first location of an owned pack → open
    return (saveRef.current.stars[idx - 1] || 0) > 0;          // previous location in SAME pack cleared
  };

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

  // Evaluate badges against a save draft; mutates n.badges, returns newly-earned defs (for popup).
  const evalBadges = (n: SaveData): BadgeDef[] => {
    const have = new Set(n.badges || []);
    const earned: BadgeDef[] = [];
    for (const b of BADGES) {
      if (!have.has(b.id) && b.check(n, LEVELS.length)) { have.add(b.id); earned.push(b); }
    }
    n.badges = Array.from(have);
    return earned;
  };
  // Show earned badges one at a time as celebratory popups.
  const announceBadges = (earned: BadgeDef[]) => {
    earned.forEach((b, i) => setTimeout(() => { setBadgeFx(b); SFX.prize(); toast(`🏅 Badge earned: ${b.name}!`); setTimeout(() => setBadgeFx(null), 2600); }, 1400 + i * 2800));
  };

  const spawnParticles = (x: number, y: number, n: number, color: string, spread = 280) => {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = Math.random() * spread + 40; g.current.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.5, max: 1, color, size: 2 + Math.random() * 4 }); }
  };

  // ── Sound engine: synthesized via Web Audio (no asset files) ───────────────
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const ac = () => {
    if (typeof window === 'undefined') return null;
    if (!audioRef.current) { try { audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; } }
    if (audioRef.current.state === 'suspended') audioRef.current.resume().catch(() => {});
    return audioRef.current;
  };
  // play a tone with an ADSR-ish envelope
  const tone = (freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) => {
    if (mutedRef.current) return; const ctx = ac(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  };
  // short noise burst (for crashes/impacts)
  const noise = (dur: number, vol = 0.2) => {
    if (mutedRef.current) return; const ctx = ac(); if (!ctx) return;
    const t = ctx.currentTime; const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate); const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1200;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination); src.start(t);
  };
  const SFX = {
    launch: () => tone(380, 0.16, 'triangle', 0.16, 140),
    impact: () => { noise(0.12, 0.18); tone(120, 0.1, 'square', 0.1, 60); },
    smash: () => { noise(0.18, 0.24); tone(180, 0.14, 'sawtooth', 0.12, 70); },
    explode: () => { noise(0.35, 0.3); tone(90, 0.3, 'sawtooth', 0.16, 40); },
    prize: () => { tone(660, 0.09, 'sine', 0.16); setTimeout(() => tone(990, 0.12, 'sine', 0.16), 80); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.16), i * 90)); },
    combo: (n: number) => { const base = 440 + n * 110; tone(base, 0.1, 'square', 0.15); setTimeout(() => tone(base * 1.5, 0.12, 'square', 0.15), 70); },
    perfect: () => { [784, 988, 1319, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.18), i * 80)); },
    jackpot: () => { [523, 659, 784, 1047, 1319, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'square', 0.17), i * 70)); },
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
    const wantEdges = m === 'level' && !!LEVELS[idx]?.edges;
    const wallOpts = { isStatic: true, restitution: wantEdges ? 0.9 : 0, friction: 0.2 };
    const lwall = Bodies.rectangle(-40, WORLD_H / 2, 80, WORLD_H * 3, wallOpts);
    Composite.add(engine.world, [ground, lwall]);
    if (wantEdges) {
      const rwall = Bodies.rectangle(WORLD_W + 40, WORLD_H / 2, 80, WORLD_H * 3, wallOpts);
      const ceil  = Bodies.rectangle(WORLD_W / 2, -40, WORLD_W * 3, 80, wallOpts);
      Composite.add(engine.world, [rwall, ceil]);
    }

    if (m === 'level') {
      const lvl = LEVELS[idx];
      for (const b of lvl.blocks) {
        const isT = b.kind === 'target'; const heavy = b.kind === 'rig';
        const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
          angle: b.angle ?? 0, friction: b.kind === 'plank' ? 0.85 : 0.75, frictionStatic: 1.2,
          restitution: 0.02, density: (isT ? 0.0018 : heavy ? 0.006 : 0.0028) * (1 + (DIFFICULTY - 1) * 0.6), label: isT ? 'target' : b.kind,
        });
        body.crasherKind = b.kind; body.crasherHP = isT ? Math.round(100 * (1 + (DIFFICULTY - 1) * 0.5)) : 0; body.crasherAlive = true; body.crasherStartY = b.y; body.crasherStartX = b.x;
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
    G.ended = false; G.powerUsed = false; G.settleT = 0; G.flightT = 0; G.bonusEnded = false; G.drops = []; G.dropTimer = m === 'bonus' ? 0.3 : 6; G.settleLossT = 0;
    setResult(null); setBonusResult(null); setPerfectFx(false); setDailyFx(null); setComboFx(null);
    g.current.comboCount = 0; g.current.comboLast = 0; g.current.maxComboThisLevel = 0;
    g.current.levelScore = 0; g.current.shotDowns = 0; g.current.scoreStreak = 0;

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
        // Sky Strike: the slamming projectile detonates a GIGANTIC blast on contact.
        if (G.flying && G.projectile && (a === G.projectile || b === G.projectile) && (G.projectile as any).crasherSkySlam && !G.powerUsed) {
          const sp = G.projectile;
          G.powerUsed = true; (sp as any).crasherSkySlam = false; G.skyStrikeActive = false;
          explodeAt(sp.position.x, sp.position.y, 360, 1.2); // huge radius + force
          spawnParticles(sp.position.x, sp.position.y, 60, '#fbbf24', 600); G.shake = 40;
          try { Matter.Composite.remove(G.engine.world, sp); } catch {}
          G.projectile = null; G.flying = false;
          if (G.mode === 'level') setTimeout(() => settleCheck(), 500);
        }
        // Stunt Bomb Squad pieces: each explodes big on first contact with anything —
        // but NOT with a fellow squad piece (they spawn together, so ignore piece-vs-piece).
        for (const [body, other] of [[a, b], [b, a]] as [Mat, Mat][]) {
          if (body && (body as any).crasherBombStunt && !(body as any).crasherExploded) {
            if (other && (other as any).crasherBombStunt && !(other as any).crasherExploded) continue; // skip sibling contact
            (body as any).crasherExploded = true;
            const bx = body.position.x, by = body.position.y;
            explodeAt(bx, by, 240, 0.9);
            try { Matter.Composite.remove(G.engine.world, body); } catch {}
            G.extra = G.extra.filter(e => e !== body);
            if (G.projectile === body) { G.projectile = null; }
            if (G.mode === 'level') setTimeout(() => settleCheck(), 450);
          }
        }
        // impact thud when the live projectile strikes something hard
        if (G.flying && impact > 4 && G.projectile && (a === G.projectile || b === G.projectile)) SFX.impact();
        // boomerang: stop curving after the first bounce off any non-projectile body
        if (G.flying && G.projectile && G.projKind === 'boomerang' && !(G.projectile as any).crasherBounced) {
          if (a === G.projectile && b.label !== 'proj') (G.projectile as any).crasherBounced = true;
          if (b === G.projectile && a.label !== 'proj') (G.projectile as any).crasherBounced = true;
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
    SFX.smash();
    if (G.mode === 'level') (G as any).shotDowns = ((G as any).shotDowns || 0) + 1;
    // ── Combo: count targets destroyed within a short window (same shot/chain) ──
    if (G.mode === 'level') {
      const now = G.last;
      if (now - (G.comboLast || 0) < 0.8) G.comboCount = (G.comboCount || 0) + 1;
      else G.comboCount = 1;
      G.comboLast = now;
      G.maxComboThisLevel = Math.max(G.maxComboThisLevel || 0, G.comboCount);
      if (G.comboCount >= 2) {
        const labels = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'MEGA!', 'DEMOLITION!'];
        const label = labels[Math.min(G.comboCount, 6)] || 'DEMOLITION!';
        G.shake = Math.min(G.shake + 6 + G.comboCount * 2, 40);
        spawnParticles(t.position.x, t.position.y, 18 + G.comboCount * 4, '#fbbf24', 400);
        SFX.combo(G.comboCount);
        setComboFx({ label, n: G.comboCount, x: t.position.x, y: t.position.y, t: Date.now() });
        // Reward bombs: one bomb per target in this multi-knockdown. At combo 2 grant 2,
        // then +1 for each additional target, so cumulative bombs == targets destroyed this shot.
        const grant = G.comboCount === 2 ? 2 : 1;
        setSave(prev => { const counts = { ...(prev.ammoCounts || {}) }; counts['bomb'] = (counts['bomb'] || 0) + grant; const n = { ...prev, ammoCounts: counts }; persist(n); return n; });
        setTimeout(() => toast(`💥 ${G.comboCount}-target combo! +${grant} Bomb${grant > 1 ? 's' : ''}!`), 100);
      }
    }
    // win the instant the last target is gone — from ANY cause (smashed, fell off, knocked down)
    if (G.mode === 'level' && G.targets.length === 0 && !G.ended) setTimeout(() => settleCheck(), 200);
  };

  const startLevel = (idx: number) => {
    setLevelIdx(idx); lvlRef.current = idx; setMode('level'); setScreen('play'); setHintActive(false);
    try { localStorage.setItem(RESUME_KEY, String(idx)); } catch {}
    const def = projUnlocked(selRef.current) ? selRef.current : FREE_PROJECTILE; setSelProj(def);
    if (isBossLevel(idx)) { const bi = bossInfo(idx); setBossCard(bi); setTimeout(() => SFX.win(), 100); setTimeout(() => setBossCard(null), 2400); }
    setTimeout(() => buildArena(idx, 'level'), 30);
  };
  const startBonus = () => {
    const last = saveRef.current.lastBonusAt || 0;
    const remaining = BONUS_COOLDOWN_MS - (Date.now() - last);
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000);
      toast(`Bonus Round recharging — try again in ${mins} min${mins === 1 ? '' : 's'}.`);
      return;
    }
    setSave(prev => { const n = { ...prev, lastBonusAt: Date.now() }; persist(n); return n; });
    setMode('bonus'); setScreen('play'); setHintActive(false);
    const def = projUnlocked(selRef.current) ? selRef.current : FREE_PROJECTILE; setSelProj(def);
    setTimeout(() => buildArena(0, 'bonus'), 30);
  };

  /* ---- Falling prize drops ---- */
  const spawnDrop = (forBonus: boolean) => {
    const G = g.current; const roll = Math.random();
    let kind: Drop['kind'] = 'hint'; let projKey: string | undefined; let emoji = '💡';
    // More power-ups, fewer hints/skips. In the bonus round 80% of drops are power-ups.
    if (roll < (forBonus ? 0.8 : 0.6)) {
      kind = 'proj';
      // Weighted pool favoring the requested power-ups: bombstunt, skystrike, stunt, bomb.
      const pool = BONUS_DROP_POOL;
      projKey = pool[Math.floor(Math.random() * pool.length)];
      emoji = PROJECTILES[projKey].emoji;
    } else if (roll < (forBonus ? 0.9 : 0.8)) { kind = 'hint'; emoji = '💡'; }
    else { kind = 'skip'; emoji = '⏭️'; }
    const x = 360 + Math.random() * (WORLD_W - 520);
    G.drops.push({ x, y: -30, vy: forBonus ? 150 + Math.random() * 60 : 110, r: 24, kind, projKey, emoji, t: 0 });
  };

  const catchDrop = (d: Drop) => {
    const G = g.current;
    spawnParticles(d.x, d.y, 26, '#fbbf24', 320); G.shake = Math.min(G.shake + 8, 24); SFX.prize();
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
    spawnParticles(x, y, 44, '#fb923c', 480); G.shake = 28; SFX.explode();
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
    else if (def.power === 'bombstunt') {
      // Original design: flies as one projectile, splits into giant stunt doubles when tapped.
      // Each double then explodes on contact with anything (item or ground).
      spawnParticles(p.position.x, p.position.y, 26, '#fca5a5', 260); G.shake = Math.min(G.shake + 12, 40);
      const count = 3;
      const baseAngle = Math.atan2(p.velocity.y, p.velocity.x);
      const speed = Math.max(Math.hypot(p.velocity.x, p.velocity.y), 7);
      const bigR = def.r * 2; // stunt doubles are twice as big
      const fan = 0.5;
      for (let i = 0; i < count; i++) {
        const a = baseAngle + (i - (count - 1) / 2) * (fan / Math.max(count - 1, 1));
        const c = Matter.Bodies.circle(p.position.x, p.position.y, bigR, { density: def.density * 0.8, restitution: 0.3, friction: 0.4, frictionAir: 0.001, label: 'proj' });
        c.crasherProjKind = 'stunt'; c.crasherR = bigR; c.crasherBombStunt = true;
        Matter.Body.setVelocity(c, { x: Math.cos(a) * speed, y: Math.sin(a) * speed });
        Matter.Composite.add(G.engine.world, c); G.extra.push(c);
      }
      // remove the original; the squad members now fly on and each explodes on first contact
      Matter.Composite.remove(G.engine.world, p); G.projectile = null; G.flying = false;
      if (G.mode === 'level') setTimeout(() => settleCheck(), 1400);
    }
    else if (def.power === 'skystrike') {
      // SUPER: on trigger, surge to +300% speed (4x) in the CURRENT direction of travel.
      const cvx = p.velocity.x, cvy = p.velocity.y;
      const cs = Math.hypot(cvx, cvy) || 1;
      const ux = cvx / cs, uy = cvy / cs;       // current heading
      const newSpeed = cs * 4;                   // +300%
      Matter.Body.setVelocity(p, { x: ux * newSpeed, y: uy * newSpeed });
      p.crasherSkySlam = true;                    // detonates a gigantic blast on contact
      G.skyStrikeActive = true;
      spawnParticles(p.position.x, p.position.y, 30, '#a5b4fc', 320); G.shake = Math.min(G.shake + 12, 40);
      SFX.launch();
    }
  };

  const settleCheck = useCallback(() => {
    const G = g.current; if (G.mode !== 'level' || G.ended) return;
    // bank points for the shot that just resolved
    if (!G.flying && ((G as any).shotDowns || 0) >= 0 && (G as any)._lastTally !== G.ammo) {
      const down = (G as any).shotDowns || 0;
      const pts = shotPoints(down, (G as any).scoreStreak || 0);
      (G as any).levelScore = ((G as any).levelScore || 0) + pts;
      (G as any).scoreStreak = down > 0 ? ((G as any).scoreStreak || 0) + 1 : 0;
      (G as any).shotDowns = 0;
      (G as any)._lastTally = G.ammo;
    }
    if (G.targets.length === 0) { finish(true); return; }
    if (G.ammo <= 0 && !G.flying) {
      // Don't declare a loss while the world is still settling — a target may be
      // mid-fall (teetering off a perch) and about to count as down. Wait until
      // every target AND loose debris has come to rest, then re-check.
      const Matter = MatterRef.current;
      const moving = (b: any) => b && !b.isStatic && Math.hypot(b.velocity?.x || 0, b.velocity?.y || 0) > 0.35;
      const anyTargetMoving = G.targets.some((t: any) => moving(t));
      const anyTargetInGrace = G.targets.some((t: any) => (t.crasherDownT || 0) > 0); // actively going down
      const anyDebrisMoving = [...G.bodies, ...G.extra].some((b: any) => moving(b));
      if (anyTargetMoving || anyTargetInGrace || anyDebrisMoving) {
        // still in motion — give it more time, then check again (cap re-checks via settleLossT)
        G.settleLossT = (G.settleLossT || 0) + 1;
        if (G.settleLossT < 30) { setTimeout(() => settleCheck(), 250); return; }
        // safety cap (~7.5s) so we can never hang; fall through to judge
      }
      // world is at rest and targets remain → genuine loss
      if (G.targets.length === 0) { finish(true); return; } // last-moment win if something just dropped
      finish(false); return;
    }
  }, []);

  const finish = useCallback((won: boolean) => {
    const G = g.current; if (G.ended) return; G.ended = true;
    const lvl = LEVELS[lvlRef.current]; let stars = 0;
    const shotsUsed = lvl.ammo - G.ammo;
    const isPerfect = won && shotsUsed <= 1; // cleared the whole level in a single shot
    if (won) { stars = shotsUsed <= lvl.par ? 3 : shotsUsed <= lvl.par + 1 ? 2 : 1; }
    if (won) setTimeout(() => { isPerfect ? SFX.perfect() : SFX.win(); }, 200);
    setTimeout(() => {
      setRewardInfo(null);
      setPerfectFx(isPerfect);
      setResult({ won, stars });
      if (won) setSave(prev => {
        const ps = prev.stars[lvlRef.current] || 0;
        // ── Box Office: finalize this level's score ──
        let levelScore = (G as any).levelScore || 0;
        const unused = G.ammo; // ammo left when cleared
        levelScore += unused * SC.UNDER_BUDGET;
        if (shotsUsed <= 1) levelScore += SC.ONE_TAKE; // one-take wonder
        const prevBest = (prev.levelScores || {})[lvlRef.current] || 0;
        const newLevelScores = { ...(prev.levelScores || {}), [lvlRef.current]: Math.max(prevBest, levelScore) };
        const careerScore = Object.values(newLevelScores).reduce((a: number, b: number) => a + (b || 0), 0);
        setTimeout(() => { setScoreFx({ level: Math.max(prevBest, levelScore), career: careerScore }); submitScore(careerScore, Object.values({ ...prev.stars, [lvlRef.current]: Math.max(ps, stars) }).reduce((a, b) => a + b, 0), Object.keys(newLevelScores).length, Math.max(prev.bestCombo || 0, (G as any).maxComboThisLevel || 0), prev.handle); }, 700);
        const n = { ...prev, stars: { ...prev.stars, [lvlRef.current]: Math.max(ps, stars) }, lastUnlocked: Math.max(prev.lastUnlocked, lvlRef.current + 1), levelScores: newLevelScores, careerBest: Math.max(prev.careerBest || 0, careerScore) };

        // ── Daily streak: reward the first level cleared each calendar day ──
        const today = new Date(); const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        if (n.lastPlayDate !== todayStr) {
          // determine if yesterday → continue streak, else reset to 1
          const y = new Date(today); y.setDate(today.getDate() - 1);
          const yStr = `${y.getFullYear()}-${y.getMonth()}-${y.getDate()}`;
          n.dailyStreak = (n.lastPlayDate === yStr) ? (n.dailyStreak || 0) + 1 : 1;
          n.lastPlayDate = todayStr;
          n.bestStreak = Math.max(n.bestStreak || 0, n.dailyStreak);
          const streak = n.dailyStreak;
          // day 7+ (and every 7th) = jackpot; otherwise escalating prize by streak
          if (streak % 7 === 0) {
            const jpEach = 2;
            const jc = { ...n.ammoCounts }; for (const k of PROJ_EMOJIS) jc[k] = (jc[k] || 0) + jpEach; n.ammoCounts = jc;
            n.hints = (n.hints || 0) + 3; n.skips = (n.skips || 0) + 2;
            setTimeout(() => { setDailyFx({ streak, emoji: '🗓️', label: `Day ${streak} JACKPOT! 2× every power-up, +3 hints, +2 skips` }); toast(`🗓️ Day ${streak} streak — JACKPOT!`); }, 1000);
          } else {
            const qty = Math.min(1 + Math.floor(streak / 2), 3); // grows 1→3 across the week
            const dRoll = Math.random();
            if (dRoll < 0.5) { const key = PROJ_EMOJIS[Math.floor(Math.random() * PROJ_EMOJIS.length)]; n.ammoCounts = { ...n.ammoCounts, [key]: (n.ammoCounts[key] || 0) + qty }; setTimeout(() => { setDailyFx({ streak, emoji: PROJECTILES[key].emoji, label: `Day ${streak}: +${qty} ${PROJECTILES[key].name}` }); toast(`🗓️ Day ${streak} reward: +${qty} ${PROJECTILES[key].name}!`); }, 1000); }
            else if (dRoll < 0.8) { n.hints = (n.hints || 0) + qty + 1; setTimeout(() => { setDailyFx({ streak, emoji: '💡', label: `Day ${streak}: +${qty + 1} Hints` }); toast(`🗓️ Day ${streak} reward: +${qty + 1} Hints!`); }, 1000); }
            else { n.skips = (n.skips || 0) + qty; setTimeout(() => { setDailyFx({ streak, emoji: '⏭️', label: `Day ${streak}: +${qty} Skip${qty > 1 ? 's' : ''}` }); toast(`🗓️ Day ${streak} reward: +${qty} Skip${qty > 1 ? 's' : ''}!`); }, 1000); }
          }
        }
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
            setTimeout(() => { setRewardInfo({ emoji: '💰', label: `JACKPOT! ${jpEach}× every power-up, +${tier + 2} hints, +${tier} skips`, jackpot: true }); toast(`💰 JACKPOT milestone reward!`); SFX.jackpot(); }, 600);
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

        // ── Perfect clear bonus: 1-shot win grants a Bomb power-up, once per level ──
        if (isPerfect) {
          n.perfectClears = (n.perfectClears || 0) + 1;
          const pdone = [...(n.claimedRewards || [])].includes(-lvlRef.current - 1);
          if (!pdone) {
            n.ammoCounts = { ...(n.ammoCounts || {}), bomb: ((n.ammoCounts || {}).bomb || 0) + 1 };
            n.claimedRewards = [...(n.claimedRewards || []), -lvlRef.current - 1]; // negative key = perfect claimed
          }
        }

        // capture best combo achieved this level (set on the game object during play)
        n.bestCombo = Math.max(n.bestCombo || 0, G.maxComboThisLevel || 0);

        // ── Director's Cut boss: guaranteed reward + counter, once per boss level ──
        if (isBossLevel(lvlRef.current)) {
          const bkey = -1000 - lvlRef.current; // unique negative key, won't collide with perfect keys
          if (!(n.claimedRewards || []).includes(bkey)) {
            n.bossClears = (n.bossClears || 0) + 1;
            // generous guaranteed haul: 2 of a random power-up + 2 hints + 1 skip
            const bk = PROJ_EMOJIS[Math.floor(Math.random() * PROJ_EMOJIS.length)];
            n.ammoCounts = { ...n.ammoCounts, [bk]: (n.ammoCounts[bk] || 0) + 2 };
            n.hints = (n.hints || 0) + 2; n.skips = (n.skips || 0) + 1;
            n.claimedRewards = [...(n.claimedRewards || []), bkey];
            setTimeout(() => { setRewardInfo({ emoji: '🎦', label: `Director's Cut cleared! +2 ${PROJECTILES[bk].name}, +2 hints, +1 skip`, jackpot: true }); toast(`🎦 Director's Cut complete!`); SFX.jackpot(); }, 900);
          }
        }

        // ── Check for newly-earned badges and announce them ──
        const newBadges = evalBadges(n);
        if (newBadges.length) announceBadges(newBadges);

        persist(n); return n;
      });
    }, won ? 500 : 800);
  }, [persist]);

  const finishBonus = useCallback(() => {
    const G = g.current; if (G.bonusEnded) return; G.bonusEnded = true;
    const caught = { ...G.bonusCaught }; const total = Object.values(caught).reduce((a, b) => a + b, 0);
    setBonusResult({ caught, total });
    setSave(prev => { const n = { ...prev, bonusBest: Math.max(prev.bonusBest, total) }; const nb = evalBadges(n); if (nb.length) announceBadges(nb); persist(n); return n; });
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

        // boomerang arc — all forces are smooth functions with no hard phase edges.
        // Engine gravity ≈ 0.34 px/frame² (matches the aiming-arc preview constant).
        //  • Outward (t < 0.38 s): exact gravity cancel so it tracks the aimed line.
        //  • Arc     (t ≥ 0.38 s): two overlapping smooth forces:
        //      – Y bell  sin(π·p) over 0.35 s — peaks then fades, creating the plunge.
        //      – X ramp  delayed 0.08 s then ramps to full over 0.30 s — curve follows.
        //    Gravity carries the downward momentum after the bell fades.
        if (G.flying && G.projectile && G.projKind === 'boomerang') {
          const p = G.projectile; const t = G.flightT || 0;
          const v = p.velocity;
          if (!(p as any).crasherBounced) {
            if (t < 0.46) {
              Matter.Body.setVelocity(p, { x: v.x, y: v.y - 0.34 * dt * 60 });
            } else {
              const arc = t - 0.46;
              // Bell: 0 → peak (arc = 0.175 s) → 0 (arc = 0.35 s) — smooth plunge with no step.
              const yBell = Math.sin(Math.PI * Math.min(arc / 0.35, 1.0));
              // X-ramp: 0.08 s delayed start, ramps to 1 over 0.30 s — curve follows the plunge.
              const xRamp = Math.min(Math.max(arc - 0.08, 0) / 0.30, 1.0);
              Matter.Body.setVelocity(p, {
                x: v.x - G.launchDir * xRamp * 5.0 * dt * 60,
                y: v.y + yBell * 2.8 * dt * 60,
              });
            }
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
          const edgeLvl = G.mode === 'level' && !!LEVELS[lvlRef.current]?.edges;
          const off = edgeLvl ? (p.position.y > WORLD_H + 140) : (p.position.x > WORLD_W + 140 || p.position.x < -140 || p.position.y > WORLD_H + 140);
          const restThresh = G.mode === 'bonus' ? 4 : 2.5;
          const restHold = G.mode === 'bonus' ? 0.05 : 0.35;
          const maxFlight = G.mode === 'bonus' ? 0.8 : G.projKind === 'boomerang' ? 3.4 : 2.6;
          // Boomerang: don't let the rest-threshold terminate the shot while it's still arcing —
          // the return force temporarily kills x-speed which would otherwise trip the check.
          const boomerangArcing = G.projKind === 'boomerang' && (G.flightT || 0) < 1.5;
          if (off || (!boomerangArcing && sp < restThresh)) { G.settleT += dt; } else G.settleT = 0;
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
    const G = g.current; const B = buffsRef.current; const dx = SLING.x - G.aimX, dy = SLING.y - G.aimY; const pull = Math.min(Math.hypot(dx, dy), MAX_PULL); const power = pull / MAX_PULL;
    // matches the real engine: position moves by velocity each frame, gravity ~0.34px/frame²
    // strength buff boosts the preview too, so the dotted arc stays accurate to the actual shot.
    const boost = B.strength ? STRENGTH_MULT : 1;
    let vx = dx * LAUNCH_SCALE * boost, vy = dy * LAUNCH_SCALE * boost;
    const VMAX = MAX_PULL * LAUNCH_SCALE * (B.strength ? STRENGTH_MULT + 0.15 : 1.1);
    const sp0 = Math.hypot(vx, vy);
    if (sp0 > VMAX) { const kk = VMAX / sp0; vx *= kk; vy *= kk; }
    let x = G.aimX, y = G.aimY;
    // aimer buff extends the dotted line all the way down — more steps, only stop at the ground.
    const steps = B.aimer ? 220 : 60;
    ctx.fillStyle = B.aimer ? 'rgba(34,197,94,0.75)' : 'rgba(255,255,255,0.6)';
    for (let i = 0; i < steps; i++) { x += vx; y += vy; vy += 0.34; if (i % 2 === 0) { ctx.globalAlpha = Math.max(0.12, 1 - i / steps); ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, 5 - i * 0.06), 0, Math.PI * 2); ctx.fill(); } if (y > GROUND_Y || x > WORLD_W + 200 || x < -200) break; }
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
    const B = buffsRef.current;
    // Size buff enlarges the projectile; strength buff boosts launch velocity. Both stack.
    const sizeMult = B.size ? SIZE_MULT : 1;
    const r = def.r * sizeMult;
    const edgeLevel = G.mode === 'level' && !!LEVELS[lvlRef.current]?.edges;
    const isBoomerang = key === 'boomerang';
    const proj = Matter.Bodies.circle(G.aimX, G.aimY, r, { density: def.density, restitution: isBoomerang ? 0.88 : (edgeLevel ? 0.86 : 0.3), friction: isBoomerang ? 0.04 : 0.4, frictionAir: 0.0008, label: 'proj' });
    Matter.Composite.add(G.engine.world, proj);
    const boost = (key === 'boomerang' ? 1.5 : 1) * (B.strength ? STRENGTH_MULT : 1);   // boomerang needs more power; strength buff adds +75%
    let vx = dx * LAUNCH_SCALE * boost, vy = dy * LAUNCH_SCALE * boost;
    const VMAX = MAX_PULL * LAUNCH_SCALE * (B.strength ? STRENGTH_MULT + 0.15 : 1.1);
    const sp = Math.hypot(vx, vy);
    if (sp > VMAX) { const k = VMAX / sp; vx *= k; vy *= k; }
    Matter.Body.setVelocity(proj, { x: vx, y: vy });
    const firstArm = !G.armed;
    G.projectile = proj; proj.crasherProjKind = key; proj.crasherR = r; G.flying = true; G.powerUsed = false; G.settleT = 0; G.flightT = 0; G.detonate = false; G.armed = true; G.launchDir = vx >= 0 ? 1 : -1; G.projKind = key;
    if (G.mode === 'level' && firstArm) {
      for (const t of G.targets) {
        if (!t.crasherAlive) continue;
        t.crasherStartX = t.position.x;
        t.crasherStartY = t.position.y;
        t.crasherDownT = 0;
        Matter.Body.setVelocity(t, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(t, 0);
      }
    }
    if (G.mode === 'level') {
      G.ammo--; setAmmoLeft(G.ammo);
      // power-ups are limited-use ammo (clapper is unlimited). Spend one use; re-lock + fall back when depleted.
      if (key !== FREE_PROJECTILE) {
        const remaining = ammoOf(key) - 1;
        spendProjectile(key);
        if (remaining <= 0) setSelProj(FREE_PROJECTILE);
      }
      // Spend one use of each active buff, then clear the toggles for the next shot.
      if (B.strength) spendProjectile('buff_strength');
      if (B.size) spendProjectile('buff_size');
      if (B.aimer) spendProjectile('buff_aimer');
      if (B.strength || B.size || B.aimer) setBuffs({ strength: false, size: false, aimer: false });
    }
    if (hintRef.current) setHintActive(false);
    spawnParticles(G.aimX, G.aimY, 8, '#fcd34d', 120);
    SFX.launch();
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
    // Finished every location → back to the Set Crashers menu (its own dashboard).
    if (ni >= LEVELS.length) { toast("🎬 That's a wrap — you cleared every location!"); setScreen('menu'); return; }
    // Next location is in a pack you don't own → Set Crashers menu (store is right there).
    const np = packOfIndex(ni);
    if (np && !packOwned(np.id)) { toast(`${np.emoji} Unlock the ${np.label} to keep going!`); setScreen('menu'); return; }
    startLevel(ni);
  };
  const buyItem = async (id: string) => {
    try { const res = await fetch('/api/checkout/set-crashers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: id }) }); const data = await res.json(); if (data?.url) { openCheckout(data.url); return; } toast(data?.error || 'Could not start checkout — are you signed in?'); } catch { toast('Could not start checkout. Please try again.'); }
  };

  const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
  const card: React.CSSProperties = { backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
  const prizeLabel = (k: string) => k === 'hint' ? '💡 Hints' : k === 'skip' ? '⏭️ Skips' : k.startsWith('proj:') ? `${PROJECTILES[k.slice(5)]?.emoji || '🎁'} ${PROJECTILES[k.slice(5)]?.name || 'Projectile'}` : '🎁';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', fontFamily: '-apple-system, Arial, sans-serif' }}>
      <style>{`@media (max-width: 820px){ .sc-rail{ display:none !important; } }`}</style>
      <div style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎬</span>
            <div><div style={{ fontWeight: 800, fontSize: '17px' }}>Set Crashers</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Nail the shot. Knock &apos;em down.</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 700 }}>⭐ {totalStars}</span>
            <button onClick={() => setShowBadges(true)} style={navBtn} title="Badges">🏅 {(save.badges || []).length}</button>
            <button onClick={() => setShowBoard(true)} style={navBtn} title="Leaderboard">🏆</button>
            {screen === 'play' ? <button onClick={() => setScreen('menu')} style={navBtn}>← {mode === 'bonus' ? 'Menu' : 'Levels'}</button> : <Link href="/games" style={navBtn as React.CSSProperties}>← Games</Link>}
          </div>
        </div>
      </div>

      {screen === 'menu' && ready && (
        <div style={{ maxWidth: '980px', margin: '0 auto', padding: '20px 16px 48px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...card, background: 'linear-gradient(135deg,#1a1a2e,#3d3460)', border: 'none', textAlign: 'center', padding: '26px 18px', color: 'white' }}>
            <div style={{ fontSize: '46px' }}>🎬💥</div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '6px' }}>Set Crashers</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', lineHeight: 1.5 }}>Pull back the slingshot, launch a clapperboard, and topple the stacks to knock out every ⭐ target. Fewer shots = more stars.</div>
            <button onClick={() => { let resume = save.lastUnlocked; try { const r = localStorage.getItem(RESUME_KEY); if (r !== null) resume = Math.min(Math.max(0, parseInt(r, 10) || 0), save.lastUnlocked, LEVELS.length - 1); } catch {} startLevel(Math.min(resume, LEVELS.length - 1)); }} disabled={!engineReady}
              style={{ marginTop: '16px', backgroundColor: engineReady ? '#F59E0B' : '#6b7280', color: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '16px', fontWeight: 800, cursor: engineReady ? 'pointer' : 'wait' }}>
              {engineReady ? `▶ ${save.lastUnlocked > 0 ? 'Continue' : 'Play'}` : 'Loading engine…'}
            </button>
          </div>

          {/* Bonus round */}
          {(() => {
            const remaining = BONUS_COOLDOWN_MS - (nowTick - (save.lastBonusAt || 0));
            const onCooldown = remaining > 0;
            const mm = Math.floor(remaining / 60000); const ss = Math.floor((remaining % 60000) / 1000);
            return (
              <button onClick={startBonus} disabled={!engineReady || onCooldown} style={{ ...card, marginTop: '12px', width: '100%', background: onCooldown ? 'linear-gradient(135deg,#4b5563,#374151)' : 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '12px', cursor: (engineReady && !onCooldown) ? 'pointer' : 'not-allowed', textAlign: 'left', opacity: onCooldown ? 0.75 : 1 }}>
                <span style={{ fontSize: '30px' }}>{onCooldown ? '⏳' : '🎁'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>Bonus Round — Prize Drop</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>{onCooldown ? `Recharging — ready in ${mm}:${String(ss).padStart(2, '0')}` : '15 seconds. Prizes rain down — shoot as many as you can and keep them all!'}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>Best: {save.bonusBest}</span>
              </button>
            );
          })()}
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
              <p style={{ margin: '0 0 3px', paddingLeft: '12px' }}>↩️ <strong>Boomerang</strong> — flies out then curves back on its own; hits targets behind cover.</p>
              <p style={{ margin: '0 0 3px', paddingLeft: '12px' }}>💣 <strong>Bomb</strong> — explodes on impact with a huge blast (or tap to detonate early).</p>
              <p style={{ margin: '0 0 8px', paddingLeft: '12px' }}>🎭 <strong>Stunt Doubles</strong> — tap mid-flight to burst into 5 pieces fanning out.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Prize drops 🎁:</strong> parachuting prizes fall during play — hit one with your shot to grab it. They give +1 power-up use, a 💡 hint, or an ⏭️ skip. Miss it and it floats away.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Milestone rewards 🎁:</strong> every 5 levels you clear, you automatically earn a random prize — power-up uses, hints, or skips — shown on the level-complete screen. The rewards <strong>grow bigger the deeper you go</strong> (levels 25+ give the biggest hauls), and there&apos;s a rare <strong>💰 JACKPOT</strong> that drops a windfall of every power-up plus hints and skips at once. Keep clearing new levels to keep them coming.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Combos 🔥:</strong> knock out multiple targets with a single shot (great on domino levels) for escalating <strong>DOUBLE → TRIPLE → DEMOLITION</strong> bonuses, with extra screen-shake and sound.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Perfect clear 🌟:</strong> wipe out every target in a single shot for a PERFECT — it earns a bonus hint the first time you do it on each level.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Daily streak 🔥:</strong> the first level you clear each day grants a guaranteed reward. Come back on consecutive days to grow your streak — rewards get bigger, and every 7th day is a JACKPOT. Miss a day and the streak resets.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Director&apos;s Cut 🎦:</strong> every 10th level is a special named boss set-piece, marked in gold. Clear one for a guaranteed bonus haul (power-ups, hints, and a skip) and the Director&apos;s Cut badge.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Badges 🏅:</strong> earn collectible badges for milestones, skill, and dedication — first clear, 3-star shots, perfect clears, big combos, daily streaks, and more. Tap the 🏅 button at the top to see your collection and what&apos;s left to unlock.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Sound 🔊:</strong> toggle audio with the speaker icon at the top of the play screen.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Bonus Round:</strong> 15 seconds of non-stop prize drops with unlimited ammo and free power-ups — shoot as many prizes as you can and keep everything you hit. Your best haul is saved. The Bonus Round recharges once every 3 minutes.</p>
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

          <div style={{ marginTop: '16px', fontWeight: 800, fontSize: '14px', color: '#e5e7eb' }}>Shot Buffs <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}>— stack on any shot, activate in-game</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '8px' }}>
            {BUFF_KEYS.map(bk => { const uses = ammoOf(bk); const owned = uses > 0; const bdef = BUFFS[bk]; return (
              <button key={bk} onClick={() => { if (!owned) buyItem(bk); }} style={{ ...card, padding: '10px 6px', textAlign: 'center', cursor: owned ? 'default' : 'pointer', border: `1px solid ${owned ? bdef.color : '#e5e7eb'}`, opacity: owned ? 1 : 0.85 }}>
                <div style={{ fontSize: '26px' }}>{bdef.emoji}</div><div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', marginTop: '2px' }}>{bdef.name}</div>
                {uses > 0 ? <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 800, marginTop: '2px' }}>×{uses} left</div>
                  : <div style={{ fontSize: '9px', color: '#F59E0B', fontWeight: 800, marginTop: '2px' }}>Buy ($1.99)</div>}
              </button>); })}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Buffs are toggled on during a level (below the slingshot) and stack with each other and your chosen power-up.</div>

          {PACK_ORDER.map(packDef => {
            const r = packRange(packDef.id); if (!r) return null;
            const levels = Array.from({ length: r.count }, (_, k) => ({ l: LEVELS[r.from + k], i: r.from + k }));
            const owned = packOwned(packDef.id);
            const clearedInPack = levels.filter(({ i }) => (save.stars[i] || 0) > 0).length;
            return (
              <div key={packDef.id} style={{ marginTop: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#e5e7eb' }}>{packDef.emoji} {packDef.label} <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>· {clearedInPack}/{r.count}</span></span>
                  {!owned && packDef.storeId && <button onClick={() => buyItem(packDef.storeId!)} style={{ fontSize: '12px', fontWeight: 800, color: '#1a1a2e', backgroundColor: '#F59E0B', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>Unlock {packDef.price}</button>}
                </div>
                {/* COMPACT GRID: small square tiles, 8 across, number + tiny stars; ✗ over cleared, 🔒 on locked */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '5px' }}>
                  {levels.map(({ l, i }) => {
                    const stars = save.stars[i] || 0; const done = stars > 0;
                    const playable = isPlayable(i); const boss = isBossLevel(i); const num = i - r.from + 1;
                    const locked = !owned;
                    return (
                      <button key={i} disabled={!playable && !locked} onClick={() => locked ? (packDef.storeId && buyItem(packDef.storeId)) : playable ? startLevel(i) : null}
                        title={l.name}
                        style={{ position: 'relative', aspectRatio: '1', borderRadius: '9px', border: boss && playable ? '2px solid #f59e0b' : done ? '1px solid #16a34a' : '1px solid #e5e7eb',
                          background: locked ? '#f3f4f6' : done ? '#ecfdf5' : boss ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : 'white',
                          cursor: (playable || locked) ? 'pointer' : 'not-allowed', opacity: (playable || locked) ? 1 : 0.4, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: done ? '#16a34a' : '#1a1a2e', lineHeight: 1 }}>{locked ? '🔒' : boss ? '🎦' : num}</span>
                        {!locked && <span style={{ fontSize: '7px', letterSpacing: '0px', lineHeight: 1 }}>{[0,1,2].map(n => <span key={n} style={{ color: n < stars ? '#fbbf24' : '#e5e7eb' }}>★</span>)}</span>}
                        {done && <span style={{ position: 'absolute', top: '-4px', right: '-4px', fontSize: '12px', fontWeight: 900, color: '#16a34a', background: 'white', borderRadius: '50%', width: '15px', height: '15px', lineHeight: '15px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>✗</span>}
                      </button>);
                  })}
                </div>
              </div>);
          })}

          <div style={{ marginTop: '22px', fontWeight: 800, fontSize: '14px', color: '#e5e7eb' }}>Store 💎</div>
          <div style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 8px' }}>Optional — the free pack &amp; bonus round are fully playable, and the ↩️/💣/🎭 ammo unlocks free through play.</div>
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
          {/* right-rail Top-3 — hidden on narrow screens via CSS below */}
          <div className="sc-rail" style={{ width: 200, flexShrink: 0, position: 'sticky', top: 16 }}>
            <LeaderboardRail getAccessToken={getToken} onOpen={() => setShowBoard(true)} />
          </div>
        </div>
      )}

      {screen === 'play' && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '12px 12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', color: 'white' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: (mode !== 'bonus' && isBossLevel(levelIdx)) ? '#fbbf24' : 'white' }}>{mode === 'bonus' ? '🎁 Bonus Round' : (isBossLevel(levelIdx) ? `🎦 ${bossInfo(levelIdx).title}` : LEVELS[levelIdx].name)}</div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '13px' }}>
              {mode === 'bonus'
                ? <span style={{ color: bonusTime <= 5 ? '#ef4444' : '#fbbf24', fontWeight: 800 }}>⏱️ {bonusTime}s</span>
                : <><span>🎯 {targetsLeft}</span><span>🎬 {ammoLeft}</span><span style={{ color: '#9ca3af' }}>par {LEVELS[levelIdx].par}</span></>}
              <button onClick={() => { const m = !muted; setMuted(m); mutedRef.current = m; }} title={muted ? 'Unmute' : 'Mute'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0, lineHeight: 1, opacity: 0.85 }}>{muted ? '🔇' : '🔊'}</button>
            </div>
          </div>
          <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '2px solid #2d2d52', touchAction: 'none' }}>
            <canvas ref={canvasRef} width={WORLD_W} height={WORLD_H} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} style={{ width: '100%', display: 'block', cursor: 'grab', background: '#1a1a2e' }} />
            {bossCard && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5, background: 'rgba(15,15,26,0.55)' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.25em', textTransform: 'uppercase' }}>🎦 Director&apos;s Cut</div>
                <div style={{ fontSize: '38px', fontWeight: 900, color: 'white', textShadow: '0 3px 16px rgba(0,0,0,0.8)', marginTop: '6px', textAlign: 'center', padding: '0 20px' }}>{bossCard.title}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fcd34d', marginTop: '4px', fontStyle: 'italic' }}>{bossCard.subtitle}</div>
              </div>
            )}
            {comboFx && Date.now() - comboFx.t < 900 && (
              <div style={{ position: 'absolute', left: `${(comboFx.x / WORLD_W) * 100}%`, top: `${(comboFx.y / WORLD_H) * 100}%`, transform: 'translate(-50%,-50%)', pointerEvents: 'none', fontSize: `${20 + comboFx.n * 6}px`, fontWeight: 900, color: '#fbbf24', textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(251,191,36,0.6)', WebkitTextStroke: '1px #92400e', whiteSpace: 'nowrap' }}>
                {comboFx.label}
              </div>
            )}
            {result && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,15,26,0.82)', overflowY: 'auto', zIndex: 200 }}>
                <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', color: 'white', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '26px', fontWeight: 900 }}>{result.won ? (perfectFx ? '🌟 PERFECT!' : 'Nailed it!') : 'Cut! Try again'}</div>
                {result.won && perfectFx && <div style={{ fontSize: '13px', color: '#fcd34d', fontWeight: 700, marginTop: '2px' }}>One-shot clear — 💣 Bomb earned!</div>}
                {result.won && <div style={{ fontSize: '44px', marginTop: '8px', letterSpacing: '6px' }}>{[0, 1, 2].map(n => <span key={n} style={{ color: n < result.stars ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>★</span>)}</div>}
                {result.won && dailyFx && (
                  <div style={{ marginTop: '12px', padding: '10px 18px', background: 'linear-gradient(135deg,#0ea5e9,#22d3ee)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 6px 24px rgba(14,165,233,0.5)', maxWidth: '300px' }}>
                    <span style={{ fontSize: '28px' }}>{dailyFx.emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#082f49', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🔥 {dailyFx.streak}-Day Streak</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: '#082f49', lineHeight: 1.2 }}>{dailyFx.label}</div>
                    </div>
                  </div>
                )}
                {result.won && rewardInfo && (
                  <div style={{ marginTop: '16px', padding: rewardInfo.jackpot ? '16px 24px' : '12px 20px', background: rewardInfo.jackpot ? 'linear-gradient(135deg,#f59e0b,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: rewardInfo.jackpot ? '0 8px 32px rgba(245,158,11,0.7)' : '0 6px 24px rgba(124,58,237,0.55)', border: rewardInfo.jackpot ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)', maxWidth: '300px' }}>
                    <span style={{ fontSize: rewardInfo.jackpot ? '40px' : '32px' }}>{rewardInfo.emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: rewardInfo.jackpot ? '#1a1a2e' : 'white', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{rewardInfo.jackpot ? '💰 JACKPOT' : '🎁 Milestone Reward'}</div>
                      <div style={{ fontSize: rewardInfo.jackpot ? '15px' : '17px', fontWeight: 900, color: rewardInfo.jackpot ? '#1a1a2e' : 'white', lineHeight: 1.2 }}>{rewardInfo.label}</div>
                    </div>
                  </div>
                )}
                {result.won && scoreFx && (
                  <div style={{ marginTop: '14px', padding: '10px 18px', background: 'linear-gradient(135deg,#b45309,#f59e0b)', borderRadius: '12px', textAlign: 'center', boxShadow: '0 6px 24px rgba(245,158,11,0.4)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#1a1a2e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🎬 Box Office</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#1a1a2e', lineHeight: 1.1 }}>+{scoreFx.level.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#1a1a2e', opacity: 0.85, marginTop: '2px' }}>Career gross: {scoreFx.career.toLocaleString()}</div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={retry} style={resBtn('#374151')}>↻ Retry</button>
                  {result.won ? <button onClick={nextLevel} style={resBtn('#F59E0B', '#1a1a2e')}>Next →</button> : saveRef.current.skips > 0 ? <button onClick={useSkip} style={resBtn('#7c3aed')}>⏭️ Skip ({saveRef.current.skips})</button> : <button onClick={() => buyItem('skips_3')} style={resBtn('#7c3aed')}>Get Skips</button>}
                  <button onClick={() => setShowBoard(true)} style={resBtn('#1d4ed8')}>🏆 Leaderboard</button>
                </div>
                </div>
              </div>
            )}
            {bonusResult && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,15,26,0.88)', overflowY: 'auto', zIndex: 200 }}>
                <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', color: 'white', boxSizing: 'border-box' }}>
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
          {mode === 'level' && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {BUFF_KEYS.map(bk => { const uses = ammoOf(bk); const owned = uses > 0; const bdef = BUFFS[bk]; const flag = bk === 'buff_strength' ? 'strength' : bk === 'buff_size' ? 'size' : 'aimer'; const on = (buffs as any)[flag]; return (
                <button key={bk} onClick={() => { if (!owned) { buyItem(bk); return; } if (!g.current.flying) setBuffs(prev => ({ ...prev, [flag]: !(prev as any)[flag] })); }} title={bdef.name} style={{ height: '34px', padding: '0 10px', borderRadius: '9px', border: on ? `2px solid ${bdef.color}` : '1px solid #374151', backgroundColor: on ? bdef.color : '#1a1a2e', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: owned ? 1 : 0.45, position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '16px' }}>{bdef.emoji}</span><span style={{ fontSize: '11px' }}>{bdef.name}</span>
                  {owned && <span style={{ position: 'absolute', bottom: '-5px', right: '-3px', fontSize: '9px', fontWeight: 900, color: '#fff', backgroundColor: '#16a34a', borderRadius: '7px', padding: '0 4px', lineHeight: '13px' }}>{uses}</span>}
                  {!owned && <span style={{ position: 'absolute', top: '-5px', right: '-4px', fontSize: '9px' }}>🔒</span>}
                </button>); })}
            </div>
          )}
        </div>
      )}

      {notice && <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#374151', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, zIndex: 90, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>{notice}</div>}

      {badgeFx && (
        <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 120, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', padding: '14px 22px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(124,58,237,0.6)', border: '2px solid #fff', display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '90vw' }}>
          <span style={{ fontSize: '40px' }}>{badgeFx.emoji}</span>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏅 Badge Earned</div>
            <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.1 }}>{badgeFx.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>{badgeFx.desc}</div>
          </div>
        </div>
      )}

      {showBadges && (
        <div onClick={() => setShowBadges(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a2e', border: '2px solid #2d2d52', borderRadius: '18px', padding: '20px', maxWidth: '460px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ color: 'white', fontSize: '18px', fontWeight: 900 }}>🏅 Badges <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 700 }}>({(save.badges || []).length}/{BADGES.length})</span></div>
              <button onClick={() => setShowBadges(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '10px' }}>
              {BADGES.map(b => { const got = (save.badges || []).includes(b.id); return (
                <div key={b.id} style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', backgroundColor: got ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.03)', border: `1px solid ${got ? '#a855f7' : '#2d2d52'}`, opacity: got ? 1 : 0.55 }}>
                  <div style={{ fontSize: '32px', filter: got ? 'none' : 'grayscale(1)' }}>{got ? b.emoji : '🔒'}</div>
                  <div style={{ color: 'white', fontSize: '12px', fontWeight: 800, marginTop: '4px' }}>{b.name}</div>
                  <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '2px', lineHeight: 1.3 }}>{b.desc}</div>
                </div>
              ); })}
            </div>
          </div>
        </div>
      )}

      {showBoard && <Leaderboard getAccessToken={getToken} onClose={() => setShowBoard(false)} myHandle={save.handle} onSetHandle={(h: string) => setSave(prev => { const n = { ...prev, handle: h }; persist(n); submitScore(prev.careerBest || 0, Object.values(prev.stars).reduce((a, b) => a + b, 0), Object.keys(prev.levelScores || {}).length, prev.bestCombo || 0, h); return n; })} />}
    </div>
  );
}

const navBtn: React.CSSProperties = { fontSize: '13px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'none', cursor: 'pointer' };
const ctrlBtn: React.CSSProperties = { backgroundColor: '#1a1a2e', color: 'white', border: '1px solid #374151', borderRadius: '10px', padding: '11px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' };
const resBtn = (bg: string, fg = 'white'): React.CSSProperties => ({ backgroundColor: bg, color: fg, border: 'none', borderRadius: '10px', padding: '11px 20px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' });
