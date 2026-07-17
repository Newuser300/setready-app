'use client';

import { useEffect, useState } from 'react';

const TARGET = 'https://www.bgready.site';
const SECONDS = 5;

export default function Moved() {
  const [count, setCount] = useState(SECONDS);

  useEffect(() => {
    const tick = setInterval(() => setCount((c) => (c > 0 ? c - 1 : 0)), 1000);
    const go = setTimeout(() => { window.location.href = TARGET; }, SECONDS * 1000);
    return () => { clearInterval(tick); clearTimeout(go); };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '-apple-system, Arial, sans-serif',
        textAlign: 'center',
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
        .bg-card { animation: bgFade .6s ease both; }
        .bg-stick { animation: bgBob 2.2s ease-in-out infinite; transform-origin: center bottom; }
        .bg-arm { animation: bgWave 1.5s ease-in-out infinite; transform-origin: 60px 78px; }
      `}</style>

      <div className="bg-card" style={{ maxWidth: '440px', width: '100%' }}>
        {/* Animated waving stickman */}
        <svg
          className="bg-stick"
          width="150"
          height="170"
          viewBox="0 0 120 150"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: '18px' }}
          aria-hidden="true"
        >
          {/* head */}
          <circle cx="60" cy="28" r="16" fill="#1a1a2e" />
          {/* smile */}
          <path d="M53 30 q7 7 14 0" stroke="#F59E0B" strokeWidth="3" fill="none" />
          {/* body */}
          <line x1="60" y1="44" x2="60" y2="95" />
          {/* static arm */}
          <line x1="60" y1="60" x2="38" y2="82" />
          {/* waving arm */}
          <g className="bg-arm">
            <line x1="60" y1="60" x2="86" y2="44" />
            <circle cx="86" cy="44" r="3" fill="#F59E0B" stroke="none" />
          </g>
          {/* legs */}
          <line x1="60" y1="95" x2="44" y2="128" />
          <line x1="60" y1="95" x2="76" y2="128" />
        </svg>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '30px', fontWeight: 700, margin: '0 0 10px', lineHeight: 1.2 }}>
          SetReady is now <span style={{ color: '#F59E0B' }}>BGReady</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#c7cad1', lineHeight: 1.6, margin: '0 0 6px' }}>
          We&apos;ve rebranded! Same app, same account &mdash; new name and new home.
        </p>
        <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 28px' }}>
          Taking you to the app in <span style={{ color: '#F59E0B', fontWeight: 700 }}>{count}</span>&hellip;
        </p>

        <a
          href={TARGET}
          style={{
            display: 'inline-block',
            backgroundColor: '#F59E0B',
            color: '#1a1a2e',
            fontWeight: 700,
            fontSize: '15px',
            textDecoration: 'none',
            padding: '13px 26px',
            borderRadius: '10px',
          }}
        >
          Go to BGReady now &rarr;
        </a>

        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '22px' }}>
          Please update your bookmark to www.bgready.site
        </p>
      </div>
    </div>
  );
}
