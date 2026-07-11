'use client';

import React, { useEffect, useState } from 'react';

/*
 * Bottom-of-dashboard flourish: animated film-crew stick people (light theme,
 * no dark strip) + a "Quote of the Day" that rotates daily through famous
 * ethical / legal / moral movie lines. Short, attributed quotations only.
 */

const QUOTES: { q: string; film: string }[] = [
  { q: 'With great power comes great responsibility.', film: 'Spider-Man' },
  { q: 'It is our choices that show what we truly are.', film: 'Harry Potter and the Chamber of Secrets' },
  { q: 'What we do in life echoes in eternity.', film: 'Gladiator' },
  { q: "It's not who I am underneath, but what I do that defines me.", film: 'Batman Begins' },
  { q: 'Get busy living, or get busy dying.', film: 'The Shawshank Redemption' },
  { q: 'The needs of the many outweigh the needs of the few.', film: 'Star Trek II: The Wrath of Khan' },
  { q: 'Do, or do not. There is no try.', film: 'Star Wars: The Empire Strikes Back' },
  { q: 'Why do we fall? So we can learn to pick ourselves up.', film: 'Batman Begins' },
  { q: 'Keep your friends close, but your enemies closer.', film: 'The Godfather Part II' },
  { q: 'The first rule of leadership: everything is your fault.', film: "A Bug's Life" },
  { q: 'Hope is a good thing, maybe the best of things.', film: 'The Shawshank Redemption' },
  { q: 'A person is a person, no matter how small.', film: 'Horton Hears a Who!' },
  { q: 'No man is a failure who has friends.', film: "It's a Wonderful Life" },
  { q: 'You must not be afraid to do the right thing.', film: 'Hotel Rwanda' },
];

export default function DailyQuoteScene() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
    setIdx(((day % QUOTES.length) + QUOTES.length) % QUOTES.length);
  }, []);

  const quote = QUOTES[idx];

  return (
    <div
      style={{
        marginTop: '8px',
        marginBottom: '24px',
        borderRadius: '18px',
        padding: '22px 20px 8px',
        background: 'linear-gradient(135deg,#FFF7ED 0%,#F5F3FF 55%,#ECFEFF 100%)',
        border: '1px solid #f1e6d6',
        textAlign: 'center',
      }}
    >
      <style>{`
        @keyframes sr2-clap { 0%,72%,100%{ transform: rotate(0);} 82%{ transform: rotate(-26deg);} }
        @keyframes sr2-wave { 0%,100%{ transform: rotate(0);} 50%{ transform: rotate(-24deg);} }
        @keyframes sr2-rec  { 0%,49%{ opacity:1;} 50%,100%{ opacity:0.15;} }
        @keyframes sr2-bob  { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-2.5px);} }
        @keyframes sr2-reel { 0%{ transform: rotate(0);} 100%{ transform: rotate(360deg);} }
        @keyframes sr2-float{ 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-5px);} }
        @keyframes sr2-fade { 0%{ opacity:0; transform: translateY(6px);} 100%{ opacity:1; transform:none;} }
        .sr2-clap-arm{ transform-box: fill-box; transform-origin: 8% 92%; animation: sr2-clap 3s ease-in-out infinite; }
        .sr2-wave-arm{ transform-box: fill-box; transform-origin: 0% 100%; animation: sr2-wave 1.6s ease-in-out infinite; }
        .sr2-rec{ animation: sr2-rec 1.2s steps(1) infinite; }
        .sr2-bob{ animation: sr2-bob 2.6s ease-in-out infinite; }
        .sr2-reel{ transform-box: fill-box; transform-origin: center; animation: sr2-reel 6s linear infinite; }
        .sr2-float{ animation: sr2-float 4s ease-in-out infinite; }
        .sr2-quote{ animation: sr2-fade .5s ease-out; }
        @media (prefers-reduced-motion: reduce){
          .sr2-clap-arm,.sr2-wave-arm,.sr2-rec,.sr2-bob,.sr2-reel,.sr2-float,.sr2-quote{ animation: none !important; }
        }
      `}</style>

      <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: '10px' }}>
        🎬 Quote of the Day
      </div>
      <div key={idx} className="sr2-quote" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <p style={{ fontSize: '19px', lineHeight: 1.4, fontWeight: 700, fontStyle: 'italic', color: '#1a1a2e', margin: '0 0 8px' }}>
          &ldquo;{quote.q}&rdquo;
        </p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#7C3AED', margin: 0 }}>— {quote.film}</p>
      </div>

      {/* animated crew (light theme) */}
      <svg viewBox="0 0 380 96" width="100%" height="92" style={{ maxWidth: '460px', marginTop: '6px' }} role="img" aria-label="Film crew of stick people">
        <line x1="20" y1="82" x2="360" y2="82" stroke="#d8cbb8" strokeWidth="1" />

        {/* film reel */}
        <g transform="translate(48,28)" className="sr2-float">
          <g className="sr2-reel">
            <circle r="12" fill="none" stroke="#F59E0B" strokeWidth="2.2" />
            <circle r="2.6" fill="#F59E0B" />
            <circle cx="0" cy="-8" r="1.8" fill="#F59E0B" />
            <circle cx="0" cy="8" r="1.8" fill="#F59E0B" />
            <circle cx="8" cy="0" r="1.8" fill="#F59E0B" />
            <circle cx="-8" cy="0" r="1.8" fill="#F59E0B" />
          </g>
        </g>

        {/* director + clapperboard */}
        <g transform="translate(110,30)" stroke="#1a1a2e" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <g className="sr2-bob">
            <circle cx="0" cy="0" r="5" />
            <line x1="0" y1="5" x2="0" y2="26" />
            <line x1="0" y1="26" x2="-7" y2="44" />
            <line x1="0" y1="26" x2="7" y2="44" />
            <line x1="0" y1="12" x2="13" y2="20" />
          </g>
          <g transform="translate(11,16)">
            <rect x="0" y="6" width="20" height="13" rx="1.5" fill="#fff" stroke="#1a1a2e" />
            <line x1="3.5" y1="10" x2="16.5" y2="10" stroke="#F59E0B" strokeWidth="1.5" />
            <line x1="3.5" y1="14" x2="13" y2="14" stroke="#F59E0B" strokeWidth="1.5" />
            <g className="sr2-clap-arm">
              <path d="M0 6 L20 2.5 L20.7 5.6 L0.7 9.1 Z" fill="#F59E0B" stroke="#1a1a2e" />
              <path d="M3 5.4 l2 -2.4 M8 4.6 l2 -2.4 M13 3.8 l2 -2.4" stroke="#fff" strokeWidth="1.1" />
            </g>
          </g>
        </g>

        {/* camera operator */}
        <g transform="translate(216,26)" stroke="#1a1a2e" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <g className="sr2-bob" style={{ animationDelay: '0.4s' }}>
            <circle cx="0" cy="4" r="5" />
            <line x1="0" y1="9" x2="0" y2="30" />
            <line x1="0" y1="30" x2="-7" y2="48" />
            <line x1="0" y1="30" x2="7" y2="48" />
            <line x1="0" y1="16" x2="14" y2="16" />
          </g>
          <line x1="30" y1="20" x2="30" y2="48" stroke="#9aa0aa" />
          <line x1="30" y1="44" x2="24" y2="52" stroke="#9aa0aa" />
          <line x1="30" y1="44" x2="36" y2="52" stroke="#9aa0aa" />
          <rect x="14" y="10" width="20" height="13" rx="2" fill="#fff" stroke="#1a1a2e" />
          <circle cx="20" cy="16.5" r="3.2" fill="none" stroke="#1a1a2e" />
          <path d="M34 13 L41 9 L41 24 L34 20 Z" fill="#fff" stroke="#1a1a2e" />
          <circle className="sr2-rec" cx="30.5" cy="13.5" r="1.5" fill="#ef4444" stroke="none" />
        </g>

        {/* actor waving */}
        <g transform="translate(322,30)" stroke="#1a1a2e" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <g className="sr2-bob" style={{ animationDelay: '0.9s' }}>
            <circle cx="0" cy="0" r="5" />
            <line x1="0" y1="5" x2="0" y2="26" />
            <line x1="0" y1="26" x2="-7" y2="44" />
            <line x1="0" y1="26" x2="7" y2="44" />
            <line x1="0" y1="12" x2="-9" y2="20" />
          </g>
          <g className="sr2-wave-arm">
            <line x1="0" y1="12" x2="10" y2="4" />
          </g>
        </g>
      </svg>
    </div>
  );
}
