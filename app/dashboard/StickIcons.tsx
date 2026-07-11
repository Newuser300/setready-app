'use client';

import React from 'react';

/*
 * SetReady stick-figure tab icons.
 * Each tab gets a UNIQUE little stick person doing something relevant to the tab,
 * on a soft colour-tinted rounded tile. Consistent body, unique arms + prop + colour.
 */

type IconDef = { bg: string; accent: string; pop: string; art: React.ReactNode };

// Shared body pieces (head + torso + legs). Arms + props are supplied per icon.
function Body() {
  return (
    <>
      <circle cx="20" cy="10" r="3.1" />
      <line x1="20" y1="13.1" x2="20" y2="23.5" />
      <path d="M20 23.5 L15.8 31.5" />
      <path d="M20 23.5 L24.2 31.5" />
    </>
  );
}

// Arms hanging naturally (default when a prop doesn't need special arms)
function ArmsDown() {
  return (
    <>
      <path d="M20 15.5 L15.6 20" />
      <path d="M20 15.5 L24.4 20" />
    </>
  );
}

const ICONS: Record<string, IconDef> = {
  'My Profile': {
    bg: '#E0E7FF', accent: '#4F46E5', pop: '#F59E0B',
    art: (
      <>
        <ArmsDown />
        {/* star badge */}
        <path d="M27 13.5 l0.9 1.9 2.1 0.3 -1.5 1.5 0.35 2.05 -1.85 -1 -1.85 1 0.35 -2.05 -1.5 -1.5 2.1 -0.3 z" fill="#F59E0B" stroke="none" />
      </>
    ),
  },
  'Residency Docs': {
    bg: '#CCFBF1', accent: '#0D9488', pop: '#0F766E',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25.5 19" />
        {/* document held in right hand */}
        <rect x="24" y="16" width="8" height="10" rx="1" fill="#fff" stroke="#0F766E" />
        <line x1="26" y1="19" x2="30" y2="19" stroke="#0F766E" strokeWidth="1.4" />
        <line x1="26" y1="21.5" x2="30" y2="21.5" stroke="#0F766E" strokeWidth="1.4" />
        <line x1="26" y1="24" x2="29" y2="24" stroke="#0F766E" strokeWidth="1.4" />
      </>
    ),
  },
  'Film Set Terms': {
    bg: '#FEF3C7', accent: '#D97706', pop: '#B45309',
    art: (
      <>
        <path d="M20 16 L15 20" />
        <path d="M20 16 L25 20" />
        {/* open book */}
        <path d="M13 21 Q20 18 27 21 L27 27 Q20 24 13 27 Z" fill="#fff" stroke="#B45309" />
        <line x1="20" y1="19.5" x2="20" y2="25.5" stroke="#B45309" strokeWidth="1.4" />
      </>
    ),
  },
  'What to Wear': {
    bg: '#FCE7F3', accent: '#DB2777', pop: '#BE185D',
    art: (
      <>
        <ArmsDown />
        {/* t-shirt on a hanger */}
        <path d="M26 14 l3 2 -1.2 1.2 -0.6 -0.5 0 6 -2.4 0 0 -6 -0.6 0.5 -1.2 -1.2 z" fill="#EC4899" stroke="#BE185D" />
        <path d="M27.5 14 q0 -1.3 -1.3 -1.3" fill="none" stroke="#BE185D" />
      </>
    ),
  },
  'Work Log': {
    bg: '#DCFCE7', accent: '#16A34A', pop: '#15803D',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 19.5" />
        {/* clipboard */}
        <rect x="23" y="15" width="9" height="12" rx="1.2" fill="#fff" stroke="#15803D" />
        <rect x="26" y="13.6" width="3" height="2.4" rx="0.6" fill="#16A34A" stroke="#15803D" />
        <line x1="25" y1="19" x2="30" y2="19" stroke="#15803D" strokeWidth="1.3" />
        <line x1="25" y1="21.5" x2="30" y2="21.5" stroke="#15803D" strokeWidth="1.3" />
        <line x1="25" y1="24" x2="28.5" y2="24" stroke="#15803D" strokeWidth="1.3" />
      </>
    ),
  },
  'Contacts': {
    bg: '#DBEAFE', accent: '#2563EB', pop: '#1D4ED8',
    art: (
      <>
        {/* main figure arm around a second smaller person */}
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L26 17" />
        <circle cx="29" cy="13" r="2.6" stroke="#1D4ED8" />
        <line x1="29" y1="15.6" x2="29" y2="23" stroke="#1D4ED8" />
        <path d="M29 18 L26 21" stroke="#1D4ED8" />
        <path d="M29 18 L32 21" stroke="#1D4ED8" />
        <path d="M29 23 L26.5 29" stroke="#1D4ED8" />
        <path d="M29 23 L31.5 29" stroke="#1D4ED8" />
      </>
    ),
  },
  'Set Etiquette Simulator': {
    bg: '#EDE9FE', accent: '#7C3AED', pop: '#6D28D9',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 19" />
        {/* clapperboard */}
        <rect x="23" y="19" width="10" height="8" rx="1" fill="#fff" stroke="#6D28D9" />
        <path d="M23 19 L33 17 L33.6 19.2 L23.6 21.2 Z" fill="#7C3AED" stroke="#6D28D9" />
        <path d="M25.4 18.9 l1.6 -1.9 M28.4 18.3 l1.6 -1.9" stroke="#fff" strokeWidth="1.1" />
      </>
    ),
  },
  'Rate Calculator': {
    bg: '#D1FAE5', accent: '#059669', pop: '#047857',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 19" />
        {/* calculator */}
        <rect x="23" y="17" width="9" height="11" rx="1.2" fill="#fff" stroke="#047857" />
        <rect x="24.5" y="18.5" width="6" height="2.4" rx="0.4" fill="#A7F3D0" stroke="#047857" strokeWidth="0.8" />
        <circle cx="25.4" cy="23.5" r="0.7" fill="#047857" stroke="none" />
        <circle cx="27.5" cy="23.5" r="0.7" fill="#047857" stroke="none" />
        <circle cx="29.6" cy="23.5" r="0.7" fill="#047857" stroke="none" />
        <circle cx="25.4" cy="25.8" r="0.7" fill="#047857" stroke="none" />
        <circle cx="27.5" cy="25.8" r="0.7" fill="#047857" stroke="none" />
        <circle cx="29.6" cy="25.8" r="0.7" fill="#047857" stroke="none" />
      </>
    ),
  },
  'Know Your Rights': {
    bg: '#E2E8F0', accent: '#475569', pop: '#B45309',
    art: (
      <>
        <path d="M20 16 L15.6 20" />
        <path d="M20 16 L24.5 20" />
        {/* scales of justice */}
        <line x1="27.5" y1="13" x2="27.5" y2="24" stroke="#B45309" />
        <line x1="23.5" y1="15" x2="31.5" y2="15" stroke="#B45309" />
        <path d="M23.5 15 L22 19 L25 19 Z" fill="none" stroke="#B45309" />
        <path d="M31.5 15 L30 19 L33 19 Z" fill="none" stroke="#B45309" />
        <line x1="25" y1="24" x2="30" y2="24" stroke="#B45309" />
      </>
    ),
  },
  'My Referrals': {
    bg: '#FFEDD5', accent: '#EA580C', pop: '#C2410C',
    art: (
      <>
        {/* two figures + heart */}
        <path d="M20 16 L23 19" />
        <path d="M20 15.5 L16 19" />
        <circle cx="28" cy="12" r="2.6" stroke="#C2410C" />
        <line x1="28" y1="14.6" x2="28" y2="22" stroke="#C2410C" />
        <path d="M28 17 L25 19" stroke="#C2410C" />
        <path d="M28 22 L25.5 28" stroke="#C2410C" />
        <path d="M28 22 L30.5 28" stroke="#C2410C" />
        <path d="M23.5 20.5 q1 -1.2 2 0 q1 -1.2 2 0 q0 1.4 -2 2.6 q-2 -1.2 -2 -2.6 z" fill="#F97316" stroke="none" />
      </>
    ),
  },
  "What's Filming": {
    bg: '#FEE2E2', accent: '#DC2626', pop: '#B91C1C',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L24.5 18.5" />
        {/* film camera on shoulder */}
        <rect x="23.5" y="16.5" width="8" height="6" rx="1" fill="#fff" stroke="#B91C1C" />
        <circle cx="25.6" cy="15.3" r="1.5" fill="none" stroke="#B91C1C" />
        <circle cx="29.2" cy="15.3" r="1.5" fill="none" stroke="#B91C1C" />
        <path d="M31.5 18 L34 16.6 L34 22.4 L31.5 21 Z" fill="#EF4444" stroke="#B91C1C" />
      </>
    ),
  },
  'Find Agencies': {
    bg: '#FFE4E6', accent: '#E11D48', pop: '#BE123C',
    art: (
      <>
        <ArmsDown />
        {/* office building */}
        <rect x="25" y="14" width="9" height="14" rx="0.8" fill="#fff" stroke="#BE123C" />
        <line x1="27" y1="17" x2="28.4" y2="17" stroke="#BE123C" strokeWidth="1.2" />
        <line x1="30.6" y1="17" x2="32" y2="17" stroke="#BE123C" strokeWidth="1.2" />
        <line x1="27" y1="20" x2="28.4" y2="20" stroke="#BE123C" strokeWidth="1.2" />
        <line x1="30.6" y1="20" x2="32" y2="20" stroke="#BE123C" strokeWidth="1.2" />
        <line x1="27" y1="23" x2="28.4" y2="23" stroke="#BE123C" strokeWidth="1.2" />
        <line x1="30.6" y1="23" x2="32" y2="23" stroke="#BE123C" strokeWidth="1.2" />
      </>
    ),
  },
  'Agency Click': {
    bg: '#CFFAFE', accent: '#0891B2', pop: '#0E7490',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 20" />
        {/* cursor arrow clicking */}
        <path d="M26 17 L26 27 L28.4 24.6 L30 28 L31.4 27.2 L29.8 24 L33 24 Z" fill="#06B6D4" stroke="#0E7490" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    ),
  },
  'SetReady Casting': {
    bg: '#FEF9C3', accent: '#CA8A04', pop: '#A16207',
    art: (
      <>
        {/* actor in spotlight, arms raised */}
        <path d="M20 15 L16 11" />
        <path d="M20 15 L24 11" />
        <path d="M14 6 L20 13 L26 6 Z" fill="#FDE68A" stroke="#A16207" opacity="0.9" />
        <path d="M27 13.5 l0.8 1.7 1.9 0.28 -1.35 1.35 0.32 1.85 -1.67 -0.9 -1.67 0.9 0.32 -1.85 -1.35 -1.35 1.9 -0.28 z" fill="#F59E0B" stroke="none" />
      </>
    ),
  },
  'Availability': {
    bg: '#F3E8FF', accent: '#9333EA', pop: '#7E22CE',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 19" />
        {/* calendar */}
        <rect x="23" y="16" width="10" height="11" rx="1.2" fill="#fff" stroke="#7E22CE" />
        <line x1="23" y1="19.4" x2="33" y2="19.4" stroke="#7E22CE" />
        <line x1="26" y1="15" x2="26" y2="17.4" stroke="#7E22CE" />
        <line x1="30" y1="15" x2="30" y2="17.4" stroke="#7E22CE" />
        <path d="M25.2 23.6 l1.4 1.4 2.6 -2.8" stroke="#9333EA" strokeWidth="1.5" fill="none" />
      </>
    ),
  },
  'Voucher Wallet': {
    bg: '#ECFCCB', accent: '#65A30D', pop: '#4D7C0F',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 19" />
        {/* ticket */}
        <path d="M23 18 h9 a1 1 0 0 1 1 1 v1.4 a1.4 1.4 0 0 0 0 2.8 v1.4 a1 1 0 0 1 -1 1 h-9 a1 1 0 0 1 -1 -1 v-1.4 a1.4 1.4 0 0 0 0 -2.8 v-1.4 a1 1 0 0 1 1 -1 z" fill="#fff" stroke="#4D7C0F" />
        <line x1="27.5" y1="18.5" x2="27.5" y2="25.5" stroke="#4D7C0F" strokeDasharray="1.3 1.3" />
      </>
    ),
  },
  'Headshot AI': {
    bg: '#FAE8FF', accent: '#C026D3', pop: '#A21CAF',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L24.5 18.5" />
        {/* camera with flash */}
        <rect x="23" y="18" width="10" height="8" rx="1.4" fill="#fff" stroke="#A21CAF" />
        <rect x="26" y="16.6" width="3" height="1.6" rx="0.4" fill="#D946EF" stroke="#A21CAF" strokeWidth="0.8" />
        <circle cx="28" cy="22" r="2.3" fill="none" stroke="#A21CAF" />
        <path d="M31.4 16.4 l1.4 -1.4 M32.2 18 l1.8 -0.5 M31 15 l0.4 -1.9" stroke="#F0ABFC" strokeWidth="1.3" />
      </>
    ),
  },
  'Games': {
    bg: '#E0F2FE', accent: '#0284C7', pop: '#0369A1',
    art: (
      <>
        <path d="M20 16 L16.5 19.5" />
        <path d="M20 16 L23.5 19.5" />
        {/* game controller */}
        <path d="M24 20 q4 -1.6 8 0 q1.6 0.7 1.2 3 q-0.4 2.4 -2.2 2 q-1.3 -0.3 -1.8 -1.6 h-2.4 q-0.5 1.3 -1.8 1.6 q-1.8 0.4 -2.2 -2 q-0.4 -2.3 1.2 -3 z" fill="#38BDF8" stroke="#0369A1" />
        <line x1="26.4" y1="22.2" x2="26.4" y2="24" stroke="#0369A1" strokeWidth="1.2" />
        <line x1="25.5" y1="23.1" x2="27.3" y2="23.1" stroke="#0369A1" strokeWidth="1.2" />
        <circle cx="30.6" cy="22.6" r="0.7" fill="#0369A1" stroke="none" />
        <circle cx="31.8" cy="23.8" r="0.7" fill="#0369A1" stroke="none" />
      </>
    ),
  },
  'A-List Scenes': {
    bg: '#FEF9C3', accent: '#EAB308', pop: '#CA8A04',
    art: (
      <>
        <path d="M20 15 L16 12" />
        <path d="M20 15 L24 12" />
        {/* big star */}
        <path d="M28.5 13 l1.3 2.7 3 0.44 -2.15 2.1 0.5 3 -2.65 -1.4 -2.65 1.4 0.5 -3 -2.15 -2.1 3 -0.44 z" fill="#FACC15" stroke="#CA8A04" strokeLinejoin="round" />
      </>
    ),
  },
  'Messages': {
    bg: '#DBEAFE', accent: '#1D4ED8', pop: '#1E40AF',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 19" />
        {/* envelope */}
        <rect x="23" y="18" width="10" height="8" rx="1" fill="#fff" stroke="#1E40AF" />
        <path d="M23 19 L28 22.5 L33 19" fill="none" stroke="#1E40AF" strokeWidth="1.4" />
      </>
    ),
  },
  'Free Ebooks to Read': {
    bg: '#CCFBF1', accent: '#0F766E', pop: '#115E59',
    art: (
      <>
        <path d="M20 16 L16 20" />
        <path d="M20 16 L24 20" />
        {/* e-reader tablet showing text lines */}
        <rect x="22" y="15" width="11" height="13" rx="1.6" fill="#fff" stroke="#115E59" />
        <line x1="24" y1="18" x2="31" y2="18" stroke="#14B8A6" strokeWidth="1.3" />
        <line x1="24" y1="20.4" x2="31" y2="20.4" stroke="#14B8A6" strokeWidth="1.3" />
        <line x1="24" y1="22.8" x2="29" y2="22.8" stroke="#14B8A6" strokeWidth="1.3" />
        <circle cx="27.5" cy="26" r="0.8" fill="#115E59" stroke="none" />
      </>
    ),
  },
  'My Certificates': {
    bg: '#FEF3C7', accent: '#B45309', pop: '#92400E',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 19" />
        {/* certificate scroll + medal ribbon */}
        <rect x="22.5" y="15.5" width="10" height="8" rx="1" fill="#fff" stroke="#92400E" />
        <line x1="24.5" y1="18" x2="30.5" y2="18" stroke="#92400E" strokeWidth="1.2" />
        <line x1="24.5" y1="20" x2="30.5" y2="20" stroke="#92400E" strokeWidth="1.2" />
        <circle cx="27.5" cy="26" r="2.4" fill="#F59E0B" stroke="#92400E" />
        <path d="M26 27.6 L25.2 31 L27.5 29.6 L29.8 31 L29 27.6" fill="#F59E0B" stroke="#92400E" strokeWidth="1" strokeLinejoin="round" />
      </>
    ),
  },
  'Support SetReady': {
    bg: '#FFEDD5', accent: '#EA580C', pop: '#F59E0B',
    art: (
      <>
        <path d="M20 15.5 L15.6 20" />
        <path d="M20 16 L25 19" />
        {/* coffee cup + heart steam */}
        <path d="M23 20 h7 v3.5 a2.5 2.5 0 0 1 -2.5 2.5 h-2 a2.5 2.5 0 0 1 -2.5 -2.5 z" fill="#fff" stroke="#B45309" />
        <path d="M30 21 h1.4 a1.4 1.4 0 0 1 0 2.8 h-1.4" fill="none" stroke="#B45309" />
        <path d="M25.6 17.4 q0.9 -1.1 1.8 0 q0.9 -1.1 1.8 0 q0 1.3 -1.8 2.4 q-1.8 -1.1 -1.8 -2.4 z" fill="#F59E0B" stroke="none" />
      </>
    ),
  },
};

// Fallback: plain waving stick person
const FALLBACK: IconDef = {
  bg: '#F1F5F9', accent: '#475569', pop: '#F59E0B',
  art: (
    <>
      <path d="M20 15 L15.6 12" />
      <path d="M20 16 L24.4 20" />
    </>
  ),
};

export default function StickIcon({ name, size = 42 }: { name: string; size?: number }) {
  const def = ICONS[name] || FALLBACK;
  return (
    <span
      className="sr-stick"
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        borderRadius: '13px',
        background: def.bg,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size - 6}
        height={size - 6}
        viewBox="0 0 40 40"
        fill="none"
        stroke={def.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <Body />
        {def.art}
      </svg>
    </span>
  );
}
