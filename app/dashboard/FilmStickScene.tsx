'use client';

import React from 'react';

/*
 * Animated film-crew of stick people for the BGReady dashboard hero.
 * A director claps a clapperboard, a camera operator films (blinking record dot),
 * and an actor performs under a sweeping spotlight. Pure SVG + CSS keyframes.
 */
export default function FilmStickScene() {
  return (
    <div
      style={{
        width: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'linear-gradient(120deg,#20203a 0%,#2b2350 55%,#3a2a5e 100%)',
        border: '1px solid rgba(245,158,11,0.35)',
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes sr-clap { 0%,72%,100%{ transform: rotate(0deg);} 82%{ transform: rotate(-26deg);} }
        @keyframes sr-wave { 0%,100%{ transform: rotate(0deg);} 50%{ transform: rotate(-22deg);} }
        @keyframes sr-rec  { 0%,49%{ opacity:1;} 50%,100%{ opacity:0.15;} }
        @keyframes sr-spot { 0%,100%{ transform: translateX(-10px) rotate(-6deg);} 50%{ transform: translateX(18px) rotate(6deg);} }
        @keyframes sr-bob  { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-2.5px);} }
        @keyframes sr-reel { 0%{ transform: rotate(0);} 100%{ transform: rotate(360deg);} }
        @keyframes sr-float{ 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-5px);} }
        .sr-clap-arm{ transform-box: fill-box; transform-origin: 8% 92%; animation: sr-clap 3s ease-in-out infinite; }
        .sr-wave-arm{ transform-box: fill-box; transform-origin: 0% 100%; animation: sr-wave 1.6s ease-in-out infinite; }
        .sr-rec{ animation: sr-rec 1.2s steps(1) infinite; }
        .sr-spot{ transform-box: fill-box; transform-origin: 50% 0%; animation: sr-spot 5s ease-in-out infinite; }
        .sr-bob{ animation: sr-bob 2.6s ease-in-out infinite; }
        .sr-reel{ transform-box: fill-box; transform-origin: center; animation: sr-reel 6s linear infinite; }
        .sr-float{ animation: sr-float 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){
          .sr-clap-arm,.sr-wave-arm,.sr-rec,.sr-spot,.sr-bob,.sr-reel,.sr-float{ animation: none !important; }
        }
      `}</style>
      <svg viewBox="0 0 380 96" width="100%" height="96" role="img" aria-label="Film crew at work">
        {/* floor line */}
        <line x1="0" y1="82" x2="380" y2="82" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />

        {/* sweeping spotlight */}
        <g className="sr-spot">
          <path d="M188 4 L150 82 L226 82 Z" fill="#F59E0B" opacity="0.12" />
        </g>

        {/* film reel, floating + spinning (decorative) */}
        <g transform="translate(38,26)" className="sr-float">
          <g className="sr-reel">
            <circle r="13" fill="none" stroke="#F59E0B" strokeWidth="2.4" />
            <circle r="3" fill="#F59E0B" />
            <circle cx="0" cy="-8.5" r="2" fill="#F59E0B" />
            <circle cx="0" cy="8.5" r="2" fill="#F59E0B" />
            <circle cx="8.5" cy="0" r="2" fill="#F59E0B" />
            <circle cx="-8.5" cy="0" r="2" fill="#F59E0B" />
          </g>
        </g>

        {/* ---- DIRECTOR with clapperboard (left) ---- */}
        <g transform="translate(96,30)" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <g className="sr-bob">
            <circle cx="0" cy="0" r="5" />
            <line x1="0" y1="5" x2="0" y2="26" />
            <line x1="0" y1="26" x2="-7" y2="44" />
            <line x1="0" y1="26" x2="7" y2="44" />
            {/* static arm holding board base */}
            <line x1="0" y1="12" x2="13" y2="20" />
          </g>
          {/* clapperboard */}
          <g transform="translate(11,16)">
            <rect x="0" y="6" width="20" height="13" rx="1.5" fill="#20203a" stroke="#F59E0B" />
            <line x1="3.5" y1="10" x2="16.5" y2="10" stroke="#F59E0B" strokeWidth="1.4" />
            <line x1="3.5" y1="14" x2="13" y2="14" stroke="#F59E0B" strokeWidth="1.4" />
            {/* clapper top arm (animated) */}
            <g className="sr-clap-arm">
              <path d="M0 6 L20 2.5 L20.7 5.6 L0.7 9.1 Z" fill="#F59E0B" stroke="#F59E0B" />
              <path d="M3 5.4 l2 -2.4 M8 4.6 l2 -2.4 M13 3.8 l2 -2.4" stroke="#20203a" strokeWidth="1.1" />
            </g>
          </g>
        </g>

        {/* ---- CAMERA OPERATOR (center-right) ---- */}
        <g transform="translate(214,26)" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <g className="sr-bob" style={{ animationDelay: '0.4s' }}>
            <circle cx="0" cy="4" r="5" />
            <line x1="0" y1="9" x2="0" y2="30" />
            <line x1="0" y1="30" x2="-7" y2="48" />
            <line x1="0" y1="30" x2="7" y2="48" />
            <line x1="0" y1="16" x2="14" y2="16" />
          </g>
          {/* tripod */}
          <line x1="30" y1="20" x2="30" y2="48" stroke="#cbd5e1" />
          <line x1="30" y1="44" x2="24" y2="52" stroke="#cbd5e1" />
          <line x1="30" y1="44" x2="36" y2="52" stroke="#cbd5e1" />
          {/* camera body */}
          <rect x="14" y="10" width="20" height="13" rx="2" fill="#20203a" stroke="#F59E0B" />
          <circle cx="20" cy="16.5" r="3.2" fill="none" stroke="#F59E0B" />
          <path d="M34 13 L41 9 L41 24 L34 20 Z" fill="#20203a" stroke="#F59E0B" />
          <circle className="sr-rec" cx="30.5" cy="13.5" r="1.5" fill="#ef4444" stroke="none" />
        </g>

        {/* ---- ACTOR performing / waving (right) ---- */}
        <g transform="translate(320,30)" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <g className="sr-bob" style={{ animationDelay: '0.9s' }}>
            <circle cx="0" cy="0" r="5" />
            <line x1="0" y1="5" x2="0" y2="26" />
            <line x1="0" y1="26" x2="-7" y2="44" />
            <line x1="0" y1="26" x2="7" y2="44" />
            {/* down arm */}
            <line x1="0" y1="12" x2="-9" y2="20" />
          </g>
          {/* waving arm */}
          <g className="sr-wave-arm">
            <line x1="0" y1="12" x2="10" y2="4" />
          </g>
        </g>
      </svg>
    </div>
  );
}
