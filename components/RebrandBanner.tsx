'use client';

import { useEffect, useState } from 'react';

// Shown once to visitors arriving from the retired setready.site domain, which
// redirects to /?from=setready. The redirect targets the real homepage rather
// than a standalone notice page so the old homepage's ranking transfers here.
const FLAG = 'from';
const FLAG_VALUE = 'setready';
const SEEN_KEY = 'bg-rebrand-seen';

export default function RebrandBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cameFromOldDomain = false;
    try {
      cameFromOldDomain =
        new URLSearchParams(window.location.search).get(FLAG) === FLAG_VALUE;
    } catch {
      return;
    }
    if (!cameFromOldDomain) return;

    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(SEEN_KEY) === 'true';
    } catch {
      // Private mode with storage disabled — showing the notice again is
      // preferable to swallowing it.
    }
    if (!alreadySeen) setOpen(true);

    // Drop the marker so a refresh or a shared link doesn't replay the notice.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(FLAG);
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {
      // Non-fatal: the notice still dismisses normally.
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, 'true');
    } catch {
      // Non-fatal.
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bg-rebrand-title"
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(10,10,20,.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <style>{`
        @keyframes bgWave {
          0%,100% { transform: rotate(0deg); }
          25%     { transform: rotate(-26deg); }
          50%     { transform: rotate(6deg); }
          75%     { transform: rotate(-18deg); }
        }
        @keyframes bgBob {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-7px); }
        }
        @keyframes bgFade {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bg-card  { animation: bgFade .6s ease both; }
        .bg-stick { animation: bgBob 2.2s ease-in-out infinite; transform-origin: center bottom; }
        .bg-arm   { animation: bgWave 1.5s ease-in-out infinite; transform-origin: 60px 78px; }
        @media (prefers-reduced-motion: reduce) {
          .bg-card, .bg-stick, .bg-arm { animation: none; }
        }
      `}</style>

      <div
        className="bg-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          width: '100%',
          backgroundColor: '#1a1a2e',
          color: 'white',
          borderRadius: '18px',
          padding: '32px 28px',
          textAlign: 'center',
          boxShadow: '0 18px 50px rgba(0,0,0,.45)',
          fontFamily: '-apple-system, Arial, sans-serif',
        }}
      >
        <svg
          className="bg-stick"
          width="120"
          height="136"
          viewBox="0 0 120 150"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: '14px' }}
          aria-hidden="true"
        >
          <circle cx="60" cy="28" r="16" fill="#1a1a2e" />
          <path d="M53 30 q7 7 14 0" stroke="#F59E0B" strokeWidth="3" fill="none" />
          <line x1="60" y1="44" x2="60" y2="95" />
          <line x1="60" y1="60" x2="38" y2="82" />
          <g className="bg-arm">
            <line x1="60" y1="60" x2="86" y2="44" />
            <circle cx="86" cy="44" r="3" fill="#F59E0B" stroke="none" />
          </g>
          <line x1="60" y1="95" x2="44" y2="128" />
          <line x1="60" y1="95" x2="76" y2="128" />
        </svg>

        <h2
          id="bg-rebrand-title"
          style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 700, margin: '0 0 10px', lineHeight: 1.2 }}
        >
          SetReady is now <span style={{ color: '#F59E0B' }}>BGReady</span>
        </h2>
        <p style={{ fontSize: '14.5px', color: '#c7cad1', lineHeight: 1.6, margin: '0 0 22px' }}>
          We&apos;ve rebranded! Same app, same account &mdash; new name and new home.
        </p>

        <button
          onClick={dismiss}
          style={{
            display: 'inline-block',
            backgroundColor: '#F59E0B',
            color: '#1a1a2e',
            fontWeight: 700,
            fontSize: '15px',
            border: 'none',
            padding: '13px 26px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        >
          Got it &rarr;
        </button>

        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '18px' }}>
          Please update your bookmark to www.bgready.site
        </p>
      </div>
    </div>
  );
}
