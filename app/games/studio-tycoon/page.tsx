'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Copyright from '@/components/Copyright';
import { openCheckout } from '@/utils/isAndroidApp';

const COST_GROWTH = 1.15;
const OFFLINE_RATE = 0.5;
const SAVE_KEY = 'sr-studio-tycoon';

const GENERATORS = [
  { id: 'bg',        name: 'Background Performer', emoji: '🎭', baseCost: 15,      income: 0.1 },
  { id: 'short',     name: 'Short Film',           emoji: '🎬', baseCost: 100,     income: 1 },
  { id: 'tv',        name: 'TV Episode',           emoji: '📺', baseCost: 1100,    income: 8 },
  { id: 'feature',   name: 'Feature Film',         emoji: '🎥', baseCost: 12000,   income: 47 },
  { id: 'franchise', name: 'Franchise',            emoji: '🏆', baseCost: 130000,  income: 260 },
  { id: 'stream',    name: 'Streaming Platform',   emoji: '🌐', baseCost: 1400000, income: 1400 },
];

const UPGRADES = [
  { id: 'u_bg',    name: 'Open Casting Calls', desc: '×2 Background Performer income', cost: 120,     target: 'bg',    mult: 2 },
  { id: 'u_tap',   name: 'Hands-On Producer',  desc: '×5 tap earnings',                cost: 4000,    target: 'tap',   mult: 5 },
  { id: 'u_short', name: 'Festival Buzz',      desc: '×2 Short Film income',           cost: 9000,    target: 'short', mult: 2 },
  { id: 'u_tv',    name: 'Prime Time Slot',    desc: '×2 TV Episode income',           cost: 60000,   target: 'tv',    mult: 2 },
  { id: 'u_all1',  name: 'Studio Reputation',  desc: '×2 ALL income',                  cost: 400000,  target: 'all',   mult: 2 },
  { id: 'u_all2',  name: 'Awards Season',      desc: '×3 ALL income',                  cost: 8000000, target: 'all',   mult: 3 },
];

const PREMIUM = [
  { id: 'boost2',  emoji: '🚀', name: 'Permanent ×2 Income', desc: 'Double all income, forever.',         price: '$4.99' },
  { id: 'skip',    emoji: '⏩', name: '4-Hour Time Skip',     desc: 'Instantly bank 4 hours of income.',   price: '$1.99' },
  { id: 'auto',    emoji: '🤖', name: 'Production Assistant', desc: 'Auto-taps for you while you play.',    price: '$2.99' },
  { id: 'offline', emoji: '🌙', name: 'Offline Boost (24h)',  desc: 'Earn offline for 24h instead of 8h.', price: '$2.99' },
];

type Save = {
  cash: number; gens: Record<string, number>; genMult: Record<string, number>;
  globalMult: number; tapMult: number; bought: string[]; awards: number;
  totalEarned: number; lastSeen: number; lastDaily: string; streak: number;
  offlineCapHours: number; premBoost: number; auto: boolean; claimed: string[]; skipsApplied: number;
};
type Gen = (typeof GENERATORS)[number];
type Upg = (typeof UPGRADES)[number];
type TutStep = { text: string; anchor?: string; gate?: 'tap' | 'buy' };
type Ctx = { s: Save; ips: number; ot: number };
type Ambition = { id: string; tier: number; label: string; test: (c: Ctx) => boolean };

const DEFAULT_SAVE: Save = {
  cash: 0, gens: {}, genMult: {}, globalMult: 1, tapMult: 1, bought: [],
  awards: 0, totalEarned: 0, lastSeen: Date.now(), lastDaily: '', streak: 0,
  offlineCapHours: 8, premBoost: 1, auto: false, claimed: [], skipsApplied: 0,
};

const TIER_NAMES: Record<number, string> = { 1: 'Lights, Camera', 2: 'Rising Studio', 3: 'Major Player', 4: 'Hollywood Legend' };
const AMBITION_REWARD = 200;

const AMBITIONS: Ambition[] = [
  // Chapter 1 — Lights, Camera
  { id: 'a1', tier: 1, label: 'Hire your first performer', test: c => c.ot >= 1 },
  { id: 'a2', tier: 1, label: 'Reach $100 / sec', test: c => c.ips >= 100 },
  { id: 'a3', tier: 1, label: 'Buy your first Upgrade', test: c => c.s.bought.length >= 1 },
  { id: 'a4', tier: 1, label: 'Claim a Daily Bonus', test: c => (c.s.streak || 0) >= 1 },
  { id: 'a5', tier: 1, label: 'Own 50 Productions total', test: c => c.ot >= 50 },
  { id: 'a6', tier: 1, label: 'Reach $10,000 / sec', test: c => c.ips >= 1e4 },
  { id: 'a7', tier: 1, label: 'Own one of every Production', test: c => GENERATORS.every(g => (c.s.gens[g.id] || 0) >= 1) },
  // Chapter 2 — Rising Studio
  { id: 'a8', tier: 2, label: 'Earn your first Award (Reboot)', test: c => (c.s.awards || 0) >= 1 },
  { id: 'a9', tier: 2, label: 'Reach $100,000 / sec', test: c => c.ips >= 1e5 },
  { id: 'a10', tier: 2, label: 'Buy 5 Upgrades in one run', test: c => c.s.bought.length >= 5 },
  { id: 'a11', tier: 2, label: 'Own 100 Productions total', test: c => c.ot >= 100 },
  { id: 'a12', tier: 2, label: 'Reach $1,000,000 / sec', test: c => c.ips >= 1e6 },
  { id: 'a13', tier: 2, label: 'Collect 5 Awards', test: c => (c.s.awards || 0) >= 5 },
  { id: 'a14', tier: 2, label: 'Reach a 3-day daily streak', test: c => (c.s.streak || 0) >= 3 },
  // Chapter 3 — Major Player
  { id: 'a15', tier: 3, label: 'Collect 15 Awards', test: c => (c.s.awards || 0) >= 15 },
  { id: 'a16', tier: 3, label: 'Reach $10M / sec', test: c => c.ips >= 1e7 },
  { id: 'a17', tier: 3, label: 'Own all 6 Upgrades in one run', test: c => c.s.bought.length >= 6 },
  { id: 'a18', tier: 3, label: 'Own 250 Productions total', test: c => c.ot >= 250 },
  { id: 'a19', tier: 3, label: 'Reach $100M / sec', test: c => c.ips >= 1e8 },
  { id: 'a20', tier: 3, label: 'Own 25 Streaming Platforms', test: c => (c.s.gens['stream'] || 0) >= 25 },
  { id: 'a21', tier: 3, label: 'Reach a 7-day daily streak', test: c => (c.s.streak || 0) >= 7 },
  // Chapter 4 — Hollywood Legend
  { id: 'a22', tier: 4, label: 'Collect 50 Awards', test: c => (c.s.awards || 0) >= 50 },
  { id: 'a23', tier: 4, label: 'Reach $1B / sec', test: c => c.ips >= 1e9 },
  { id: 'a24', tier: 4, label: 'Own 500 Productions total', test: c => c.ot >= 500 },
  { id: 'a25', tier: 4, label: 'Reach $100B / sec', test: c => c.ips >= 1e11 },
  { id: 'a26', tier: 4, label: 'Collect 100 Awards', test: c => (c.s.awards || 0) >= 100 },
  { id: 'a27', tier: 4, label: 'Reach $1T / sec', test: c => c.ips >= 1e12 },
  { id: 'a28', tier: 4, label: 'Reach a 30-day daily streak', test: c => (c.s.streak || 0) >= 30 },
];

const HOWTO: { title: string; body: string }[] = [
  { title: 'The goal — and how you "win"', body: 'You run a film studio. You start with nothing and grow it into an empire that earns money on its own. There is no game over and no final boss — you cannot lose, and you cannot break anything. You "win" by completing the Ambitions checklist on the main screen: four chapters of seven goals each, 28 in all. Every goal you finish pays a $200 bonus, and clearing all seven in a chapter unlocks the next. After that, beating your own best is the real endgame.' },
  { title: 'Your first minute', body: 'Tap the orange "Shoot a Scene" button about 15 times to earn $15, then buy your first Background Performer. That Performer now earns cash for you automatically — congratulations, your studio is running.' },
  { title: '1. Tap to earn', body: 'Each press of "Shoot a Scene" adds a little cash. This matters only at the very start — almost all of your money will come automatically, not from tapping. You never have to sit and tap.' },
  { title: '2. Buy Productions (the core of the game)', body: 'Each Production earns cash every second, on its own, forever. Example: one Background Performer earns about $0.10/sec; buy 20 of them and that is about $2 every second arriving while you do nothing. Bigger Productions earn far more — a Feature Film earns hundreds of times what a Performer does. Rule of thumb: always be buying the most you can afford.' },
  { title: '3. Buy Upgrades', body: 'Upgrades are permanent, one-time boosts. Example: "Open Casting Calls" doubles the income of every Background Performer, instantly and forever. They pay for themselves quickly, so buy them on sight whenever you can afford one.' },
  { title: 'When you run out of cash', body: 'This is completely normal and expected. When you cannot afford anything, just wait — your "$ / sec" keeps refilling your Budget on its own. Check the price of the next thing you want, set the phone down, and come back when you can afford it. Patience is a genuine strategy here.' },
  { title: '4. Reboot the Studio (the most important habit)', body: 'Once you have earned $1,000,000 in a run, the Reboot button activates. Rebooting wipes your cash and Productions but grants Awards 🏆 — and each Award permanently adds +2% to ALL future income. Example: reboot with 8 Awards and every future run earns 16% faster, so you blast past wherever you were stuck. It feels strange to reset on purpose, but it is the key to long-term growth, and each reboot is faster than the last.' },
  { title: 'Daily Bonus & offline earnings', body: 'Log in once a day and tap Claim for a cash bonus; play on consecutive days to grow your streak (bigger rewards, up to 7 days). And your studio keeps earning while the app is fully closed, up to 8 hours — a "Welcome back" screen shows what you banked. Checking in twice a day is a great rhythm.' },
  { title: 'What every label on screen means', body: 'Budget = cash you can spend now. $ / sec = how much you earn automatically each second. 🏆 = your permanent Award bonus. Ambitions = your goal checklist (each pays $200). Productions = your automatic earners. Upgrades = permanent multipliers. Reboot = reset for Awards. Store = optional paid boosts, never required.' },
];

const TUTORIAL: TutStep[] = [
  { text: 'Welcome! Studio Tycoon is an "idle" game — you build a film studio that earns money on its own, even while you are away. Do not worry about doing it wrong: you cannot lose and you cannot break anything. Let me walk you through all of it. (Tap Skip anytime.)', anchor: 'tut-budget' },
  { text: "First, your Budget — this big green number is the cash you have to spend. It starts at $0, and it refills automatically as your studio earns. Every purchase is paid from here.", anchor: 'tut-budget' },
  { text: 'Just under the Budget you will see "$ / sec" — that is your income, how much cash arrives automatically every second. Right now it is $0 because you have not hired anyone yet. Growing this one number is the entire game.', anchor: 'tut-budget' },
  { text: 'Let us earn your first cash. Tap the orange "Shoot a Scene" button — it adds a few dollars each tap. Keep tapping until you reach $15, enough for your first hire.', anchor: 'tut-budget', gate: 'tap' },
  { text: "Nice work. Tapping is fine for the very start, but it is slow and you should not rely on it. The real money comes from Productions that earn for you automatically. Let us buy your first one.", anchor: 'tut-prod' },
  { text: 'Buy a Background Performer for $15. The instant you own it, it earns cash every second on its own — no tapping needed, even with the app closed. Tap it now to hire one.', anchor: 'tut-prod', gate: 'buy' },
  { text: "Look back at your '$ / sec' — it just went up! And buying that performer completed your first Ambition, so you earned a $200 bonus. Hire more, or save toward bigger Productions that pay much more each.", anchor: 'tut-prod' },
  { text: "A habit to keep: always buy the most expensive Production you can afford. Each costs a bit more than the last, but together they snowball your income upward surprisingly fast.", anchor: 'tut-prod' },
  { text: "Upgrades are permanent boosts you buy once. For example, an upgrade can double a Production's income — forever. They are excellent value, so grab one whenever it appears and you can afford it.", anchor: 'tut-upg' },
  { text: "Run out of cash? Totally normal — it happens constantly and it is fine. Just wait: your '$ / sec' refills your Budget automatically. Glance at the price of what you want next, go do something else, and come back richer. Patience is a real strategy.", anchor: 'tut-budget' },
  { text: "Now the most important move: 'Reboot the Studio'. Once you have earned $1,000,000 in a run, you can reset everything for Awards 🏆. You lose your cash and Productions — but each Award permanently boosts ALL future income, so every run afterward is faster. It is the heart of the game and how you grow past slow stretches.", anchor: 'tut-prestige' },
  { text: "The game rewards coming back in two ways: a Daily Bonus (log in each day, build a streak for bigger rewards)…", anchor: 'tut-daily' },
  { text: "…and offline earnings — your studio keeps earning while the app is closed, up to 8 hours. When you return you will see a 'Welcome back, you earned $X' screen. So popping in a couple of times a day pays off nicely.", anchor: 'tut-budget' },
  { text: "Here is how you 'win'. Work through the Ambitions checklist shown here. Each task you finish pays you $200, and completing all seven unlocks the next chapter — four chapters in all, ending with Hollywood Legend. Clear every chapter and beat your own record: that is the goal.", anchor: 'tut-goals' },
  { text: "Last thing: the Studio Store has optional paid boosts. Completely optional — the whole game is free and you never need to spend a cent to play or to win.", anchor: 'tut-store' },
  { text: "That is the full tour! Your first goals: hire a few Performers, buy any Upgrade you can afford, watch your '$ / sec' climb, and tick off Chapter 1 of your Ambitions. Build the biggest studio you can — have fun, mogul. 🎬", anchor: 'tut-goals' },
];

function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n < 10 ? n.toFixed(1) : Math.floor(n).toString();
  const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
  let i = 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + u[i];
}
function costOf(g: Gen, owned: number) { return Math.ceil(g.baseCost * Math.pow(COST_GROWTH, owned)); }
function prestigeMult(s: Save) { return 1 + (s.awards || 0) * 0.02; }
function incomePerSec(s: Save) {
  let t = 0;
  for (const g of GENERATORS) t += (s.gens[g.id] || 0) * g.income * (s.genMult[g.id] || 1);
  return t * (s.globalMult || 1) * prestigeMult(s) * (s.premBoost || 1);
}
function tapValue(s: Save) { return Math.max(1, incomePerSec(s) * 0.05) * (s.tapMult || 1) * (s.premBoost || 1); }
function awardsFor(total: number) { return Math.floor(Math.sqrt(Math.max(0, total) / 1e6)); }

export default function StudioTycoon() {
  const [s, setS] = useState<Save>(DEFAULT_SAVE);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState<{ earned: number; secs: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [showIntro, setShowIntro] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [tutStep, setTutStep] = useState(-1);
  const sRef = useRef<Save>(s);
  sRef.current = s;

  const ownedTotal = Object.values(s.gens).reduce((a, b) => a + (b || 0), 0);
  const ips = incomePerSec(s);

  useEffect(() => {
    let save: Save = { ...DEFAULT_SAVE };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) save = { ...DEFAULT_SAVE, ...JSON.parse(raw) };
    } catch {}
    if (!Array.isArray(save.claimed)) save.claimed = [];
    const now = Date.now();
    const elapsed = Math.max(0, (now - (save.lastSeen || now)) / 1000);
    const cap = (save.offlineCapHours || 8) * 3600;
    const secs = Math.min(elapsed, cap);
    const earned = incomePerSec(save) * secs * OFFLINE_RATE;
    if (earned >= 1 && elapsed > 120) {
      save = { ...save, cash: save.cash + earned, totalEarned: save.totalEarned + earned };
      setOffline({ earned, secs });
    }
    save.lastSeen = now;
    setS(save); setReady(true);
    try { if (!localStorage.getItem('sr-tycoon-intro')) setShowIntro(true); } catch {}
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      setS(prev => {
        const add = incomePerSec(prev) + (prev.auto ? tapValue(prev) : 0);
        const next = { ...prev, cash: prev.cash + add, totalEarned: prev.totalEarned + add, lastSeen: Date.now() };
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ready]);

  useEffect(() => {
    const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...sRef.current, lastSeen: Date.now() })); } catch {} };
    document.addEventListener('visibilitychange', save);
    window.addEventListener('beforeunload', save);
    return () => { document.removeEventListener('visibilitychange', save); window.removeEventListener('beforeunload', save); };
  }, []);

  // Reconcile server-verified Studio Store purchases on load
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/game-purchases');
        const data = await res.json();
        if (cancelled || !data) return;
        const items: string[] = Array.isArray(data.items) ? data.items : [];
        const skipCount: number = data.skipCount || 0;
        setS(prev => {
          const next = { ...prev };
          next.premBoost = items.includes('boost2') ? 2 : 1;
          next.offlineCapHours = items.includes('offline') ? 24 : 8;
          next.auto = items.includes('auto');
          const applied = next.skipsApplied || 0;
          if (skipCount > applied) {
            const grant = incomePerSec(next) * 4 * 3600 * (skipCount - applied);
            next.cash += grant; next.totalEarned += grant; next.skipsApplied = skipCount;
          }
          return next;
        });
        if (window.location.search.includes('purchase=success')) {
          setNotice('Purchase complete — enjoy your boost!');
          setTimeout(() => setNotice(''), 2600);
          window.history.replaceState({}, '', '/games/studio-tycoon');
        }
      } catch {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Award $200 per newly-completed ambition
  useEffect(() => {
    if (!ready) return;
    const ctx: Ctx = { s, ips, ot: ownedTotal };
    const newly = AMBITIONS.filter(a => !s.claimed.includes(a.id) && a.test(ctx));
    if (!newly.length) return;
    const reward = newly.length * AMBITION_REWARD;
    setS(p => ({ ...p, cash: p.cash + reward, totalEarned: p.totalEarned + reward, claimed: [...p.claimed, ...newly.map(a => a.id)] }));
    setNotice(newly.length === 1 ? 'Ambition complete!  +$200' : `${newly.length} ambitions complete!  +$${reward}`);
    setTimeout(() => setNotice(''), 2200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, ips, ownedTotal, ready]);

  useEffect(() => {
    if (tutStep < 0) return;
    const g = TUTORIAL[tutStep]?.gate;
    if (!g) return;
    if (g === 'tap' && s.cash >= 15) setTutStep(t => (t < 0 ? t : t + 1));
    else if (g === 'buy' && ownedTotal >= 1) setTutStep(t => (t < 0 ? t : t + 1));
  }, [tutStep, s.cash, ownedTotal]);

  useEffect(() => {
    if (tutStep < 0) return;
    const a = TUTORIAL[tutStep]?.anchor;
    if (!a) return;
    const el = document.getElementById(a);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [tutStep]);

  const toast = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2200); };
  const tap = () => setS(p => { const v = tapValue(p); return { ...p, cash: p.cash + v, totalEarned: p.totalEarned + v }; });

  const buyGen = (g: Gen) => setS(p => {
    const owned = p.gens[g.id] || 0; const c = costOf(g, owned);
    if (p.cash < c) return p;
    return { ...p, cash: p.cash - c, gens: { ...p.gens, [g.id]: owned + 1 } };
  });

  const buyUpgrade = (u: Upg) => setS(p => {
    if (p.bought.includes(u.id) || p.cash < u.cost) return p;
    const next: Save = { ...p, cash: p.cash - u.cost, bought: [...p.bought, u.id] };
    if (u.target === 'all') next.globalMult = (p.globalMult || 1) * u.mult;
    else if (u.target === 'tap') next.tapMult = (p.tapMult || 1) * u.mult;
    else next.genMult = { ...p.genMult, [u.target]: (p.genMult[u.target] || 1) * u.mult };
    return next;
  });

  const today = new Date().toDateString();
  const dailyReady = ready && s.lastDaily !== today;
  const claimDaily = () => setS(p => {
    if (p.lastDaily === today) return p;
    const yest = new Date(Date.now() - 86400000).toDateString();
    const streak = p.lastDaily === yest ? (p.streak || 0) + 1 : 1;
    const reward = Math.max(100, incomePerSec(p) * 90) * Math.min(streak, 7);
    toast(`Day ${streak} bonus: +$${fmt(reward)}`);
    return { ...p, cash: p.cash + reward, totalEarned: p.totalEarned + reward, lastDaily: today, streak };
  });

  const gain = awardsFor(s.totalEarned) - s.awards;
  const doPrestige = () => {
    if (gain < 1) { toast('Earn $1M this run to reboot for Awards.'); return; }
    if (!confirm(`Reboot the studio? You lose cash and productions but gain ${gain} Award(s) (+${gain * 2}% permanent income).`)) return;
    setS(p => ({
      ...DEFAULT_SAVE, awards: p.awards + awardsFor(p.totalEarned),
      offlineCapHours: p.offlineCapHours, premBoost: p.premBoost, auto: p.auto,
      lastDaily: p.lastDaily, streak: p.streak, claimed: p.claimed, skipsApplied: p.skipsApplied, lastSeen: Date.now(),
    }));
    toast('Studio rebooted! Awards banked.');
  };

  const buyPremium = async (item: string) => {
    try {
      const res = await fetch('/api/checkout/studio-tycoon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
      });
      const data = await res.json();
      if (data?.url) { openCheckout(data.url as string); return; }
      toast(data?.error || 'Could not start checkout — are you signed in?');
    } catch { toast('Could not start checkout. Please try again.'); }
  };
  const dismissIntro = () => { try { localStorage.setItem('sr-tycoon-intro', '1'); } catch {}; setShowIntro(false); };
  const startTut = () => { try { localStorage.setItem('sr-tycoon-intro', '1'); } catch {}; setShowIntro(false); setShowHow(false); setTutStep(0); };
  const nextTut = () => setTutStep(t => (t + 1 >= TUTORIAL.length ? -1 : t + 1));
  const endTut = () => setTutStep(-1);

  const ctx: Ctx = { s, ips, ot: ownedTotal };
  const ambDone = (a: Ambition) => s.claimed.includes(a.id) || a.test(ctx);
  const activeTier = [1, 2, 3, 4].map(t => ({ t, items: AMBITIONS.filter(a => a.tier === t) })).find(x => x.items.some(a => !ambDone(a)));
  const card = { backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
  const tut = tutStep >= 0 ? TUTORIAL[tutStep] : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif' }}>
      <div style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🎬</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '17px' }}>Studio Tycoon</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>Build a film empire</div>
              </div>
            </div>
            <Link href="/games" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}>← Games</Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 48px' }}>
        <div id="tut-budget" style={{ ...card, textAlign: 'center', padding: '22px 16px' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>BUDGET</div>
          <div style={{ fontSize: '38px', fontWeight: 800, color: '#16a34a', lineHeight: 1.1, margin: '4px 0' }}>${fmt(s.cash)}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>${fmt(ips)} / sec{s.awards ? ` · 🏆 ${s.awards} (+${s.awards * 2}%)` : ''}</div>
          <button onClick={tap} style={{ marginTop: '14px', width: '100%', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: 800, cursor: 'pointer' }}>
            🎬 Shoot a Scene  +${fmt(tapValue(s))}
          </button>
        </div>

        <div style={{ ...card, marginTop: '12px', padding: '14px 16px' }}>
          <button onClick={() => setShowHow(v => !v)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#374151' }}>ℹ️ How to play</span>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>{showHow ? 'Hide' : 'Show'}</span>
          </button>
          {showHow && (
            <div style={{ marginTop: '12px' }}>
              {HOWTO.map((h, i) => (
                <p key={i} style={{ margin: '0 0 10px', fontSize: '13px', color: '#4b5563', lineHeight: '1.6' }}>
                  <strong style={{ color: '#1a1a2e' }}>{h.title}.</strong> {h.body}
                </p>
              ))}
              <button onClick={startTut} style={{ marginTop: '4px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>▶ Take the guided tutorial</button>
            </div>
          )}
        </div>

        <div id="tut-goals" style={{ ...card, marginTop: '12px' }}>
          {activeTier ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#374151' }}>🎯 Ambitions · Chapter {activeTier.t} of 4</span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{activeTier.items.filter(ambDone).length}/{activeTier.items.length}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>{TIER_NAMES[activeTier.t]} — each goal you complete pays $200.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {activeTier.items.map(a => {
                  const done = ambDone(a);
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: done ? '#16a34a' : '#6b7280' }}>
                      <span>{done ? '✅' : '⬜'}</span>
                      <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{a.label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '30px' }}>🏆</div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#1a1a2e', marginTop: '4px' }}>All 28 ambitions complete!</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>You are a true Hollywood Legend. Now go beat your own record.</div>
            </div>
          )}
        </div>

        {dailyReady && (
          <div id="tut-daily" style={{ ...card, marginTop: '12px', backgroundColor: '#FEF3C7', borderColor: '#FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#92400E' }}>🎁 Daily bonus ready</div>
              <div style={{ fontSize: '12px', color: '#B45309' }}>Streak: {s.streak || 0} day{(s.streak || 0) === 1 ? '' : 's'} — come back daily for more.</div>
            </div>
            <button onClick={claimDaily} style={{ backgroundColor: '#D97706', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Claim</button>
          </div>
        )}

        <div id="tut-prod" style={{ marginTop: '18px', fontWeight: 800, fontSize: '14px', color: '#374151' }}>Productions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {GENERATORS.map(g => {
            const owned = s.gens[g.id] || 0; const c = costOf(g, owned); const afford = s.cash >= c;
            const per = g.income * (s.genMult[g.id] || 1) * (s.globalMult || 1) * prestigeMult(s) * (s.premBoost || 1);
            return (
              <button key={g.id} onClick={() => buyGen(g)} disabled={!afford}
                style={{ ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', cursor: afford ? 'pointer' : 'not-allowed', opacity: afford ? 1 : 0.55, width: '100%' }}>
                <span style={{ fontSize: '28px' }}>{g.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{g.name} <span style={{ color: '#9ca3af', fontWeight: 600 }}>×{owned}</span></div>
                  <div style={{ fontSize: '12px', color: '#16a34a' }}>+${fmt(per)}/sec each</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: afford ? '#16a34a' : '#9ca3af' }}>${fmt(c)}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>BUY</div>
                </div>
              </button>
            );
          })}
        </div>

        {UPGRADES.some(u => !s.bought.includes(u.id)) && (
          <>
            <div id="tut-upg" style={{ marginTop: '20px', fontWeight: 800, fontSize: '14px', color: '#374151' }}>Upgrades</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {UPGRADES.filter(u => !s.bought.includes(u.id)).map(u => {
                const afford = s.cash >= u.cost;
                return (
                  <button key={u.id} onClick={() => buyUpgrade(u)} disabled={!afford}
                    style={{ ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', cursor: afford ? 'pointer' : 'not-allowed', opacity: afford ? 1 : 0.55, width: '100%' }}>
                    <span style={{ fontSize: '22px' }}>⬆️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{u.desc}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: afford ? '#16a34a' : '#9ca3af' }}>${fmt(u.cost)}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div id="tut-prestige" style={{ ...card, marginTop: '20px', backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'white' }}>🏆 Reboot the Studio</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                {gain >= 1 ? `Reboot now for ${gain} Award${gain > 1 ? 's' : ''} (+${gain * 2}% income, forever).` : 'Earn $1M this run to unlock your first Award.'}
              </div>
            </div>
            <button onClick={doPrestige} disabled={gain < 1}
              style={{ backgroundColor: gain >= 1 ? '#F59E0B' : '#4b5563', color: gain >= 1 ? '#1a1a2e' : '#9ca3af', border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 800, fontSize: '13px', cursor: gain >= 1 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>Reboot</button>
          </div>
        </div>

        <div id="tut-store" style={{ marginTop: '20px', fontWeight: 800, fontSize: '14px', color: '#374151' }}>Studio Store 💎</div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', marginBottom: '8px' }}>Optional boosts — the game is free to play.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PREMIUM.map(p => (
            <div key={p.id} style={{ ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{p.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.desc}</div>
              </div>
              <button onClick={() => buyPremium(p.id)} style={{ backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{p.price}</button>
            </div>
          ))}
        </div>

        <Copyright />
        {tutStep >= 0 && <div style={{ height: '190px' }} />}
      </div>

      {notice && (
        <div style={{ position: 'fixed', bottom: tutStep >= 0 ? '170px' : '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#374151', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, zIndex: 85, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{notice}</div>
      )}

      {offline && (
        <div onClick={() => setOffline(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '18px', padding: '28px 24px', maxWidth: '320px', textAlign: 'center' }}>
            <div style={{ fontSize: '44px' }}>🎬</div>
            <div style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a2e', marginTop: '8px' }}>Welcome back!</div>
            <div style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0' }}>Your studio earned</div>
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#16a34a' }}>${fmt(offline.earned)}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>while you were away ({Math.floor(offline.secs / 60)} min)</div>
            <button onClick={() => setOffline(null)} style={{ marginTop: '18px', width: '100%', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>Collect</button>
          </div>
        </div>
      )}

      {showIntro && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 70 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '26px 24px', maxWidth: '360px' }}>
            <div style={{ fontSize: '40px', textAlign: 'center' }}>🎬</div>
            <div style={{ fontWeight: 800, fontSize: '19px', color: '#1a1a2e', textAlign: 'center', marginTop: '6px' }}>Welcome to Studio Tycoon</div>
            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', margin: '8px 0 16px', lineHeight: '1.5' }}>
              Build a one-person background gig into a film empire that earns money on its own. New to games like this? Take the quick tutorial — it walks you through every step.
            </p>
            <button onClick={startTut} style={{ width: '100%', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>▶ Take the tutorial</button>
            <button onClick={dismissIntro} style={{ marginTop: '8px', width: '100%', backgroundColor: 'transparent', color: '#6b7280', border: 'none', padding: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>Just play</button>
          </div>
        </div>
      )}

      {tut && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 80, backgroundColor: '#1a1a2e', color: 'white', padding: '16px', boxShadow: '0 -4px 24px rgba(0,0,0,0.4)' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#F59E0B' }}>TUTORIAL · {tutStep + 1}/{TUTORIAL.length}</span>
              <button onClick={endTut} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}>Skip</button>
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.55', margin: '0 0 12px' }}>{tut.text}</p>
            {tut.gate ? (
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#F59E0B' }}>
                {tut.gate === 'tap' ? '👆 Keep tapping "Shoot a Scene" until you reach $15…' : '👆 Buy a Background Performer to continue…'}
              </div>
            ) : (
              <button onClick={nextTut} style={{ width: '100%', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>
                {tutStep + 1 >= TUTORIAL.length ? 'Finish 🎬' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
