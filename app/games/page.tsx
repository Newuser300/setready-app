'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Copyright from '@/components/Copyright';

export default function GamesPage() {
  useEffect(() => { localStorage.setItem('sr-games-visited', '1') }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif' }}>

      {/* Nav */}
      <div style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '26px' }}>🎮</span>
              <div>
                <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.3px' }}>Games</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '1px' }}>Learn while you play — all free</div>
              </div>
            </div>
            <Link href="/dashboard" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}>
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '28px 16px 48px' }}>

        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>
          Sharpen your film set knowledge with games designed for background performers.
        </p>

        {/* Film Set Trivia card */}
        <Link href="/games/film-trivia" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '18px',
            cursor: 'pointer',
            transition: 'box-shadow 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
          >
            <div style={{ fontSize: '48px', lineHeight: 1, flexShrink: 0 }}>🎬</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontWeight: '800', fontSize: '18px', color: '#1a1a2e' }}>Film Set Trivia</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px', lineHeight: '1.5' }}>
                Test your knowledge of film set terminology. See a definition — pick the correct term. 10 questions per round.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>📖 60 terms</span>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>⏱ ~3 min</span>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>🔁 Randomised</span>
              </div>
            </div>
            <div style={{ fontSize: '20px', color: '#d1d5db', flexShrink: 0, alignSelf: 'center' }}>›</div>
          </div>
        </Link>

        {/* Studio Tycoon card */}
        <Link href="/games/studio-tycoon" style={{ textDecoration: 'none', display: 'block', marginTop: '14px' }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', gap: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
          >
            <div style={{ fontSize: '48px', lineHeight: 1, flexShrink: 0 }}>🎬</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontWeight: '800', fontSize: '18px', color: '#1a1a2e' }}>Studio Tycoon</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px', lineHeight: '1.5' }}>
                Start with one background performer and build a film empire. Earn while you play — and even while you are away.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>📈 Idle tycoon</span>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>⭐ Daily rewards</span>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>🌙 Offline earnings</span>
              </div>
            </div>
            <div style={{ fontSize: '20px', color: '#d1d5db', flexShrink: 0, alignSelf: 'center' }}>›</div>
          </div>
        </Link>

        {/* Set Match card */}
        <Link href="/games/set-match" style={{ textDecoration: 'none', display: 'block', marginTop: '14px' }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', gap: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
          >
            <div style={{ fontSize: '48px', lineHeight: 1, flexShrink: 0 }}>🎞️</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontWeight: '800', fontSize: '18px', color: '#1a1a2e' }}>Set Match</span>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px', lineHeight: '1.5' }}>
                Swap film props to match three or more. Clear the target score before you run out of moves and climb the levels.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>🧩 Match-3</span>
                <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>📈 Endless levels</span>
              </div>
            </div>
            <div style={{ fontSize: '20px', color: '#d1d5db', flexShrink: 0, alignSelf: 'center' }}>›</div>
          </div>
        </Link>

        {/* More coming soon */}
        <div style={{ marginTop: '16px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #e5e7eb', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚧</div>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px' }}>More games coming soon</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Set Etiquette challenges, voucher quizzes, and more.</p>
        </div>

        <Copyright />
      </div>
    </div>
  );
}
