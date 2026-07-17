'use client';

import { useState } from 'react';
import Link from 'next/link';

type Region = {
  province: string;
  union: string;
  url: string;
  note?: string;
};

const REGIONS: Region[] = [
  { province: 'British Columbia', union: 'UBCP/ACTRA', url: 'https://ubcpactra.ca/production-list/' },
  { province: 'Alberta', union: 'ACTRA Alberta', url: 'https://actraalberta.com/whats-shooting/' },
  { province: 'Saskatchewan', union: 'ACTRA Saskatchewan', url: 'https://actrasask.com/whats-shooting/' },
  { province: 'Manitoba', union: 'ACTRA Manitoba', url: 'http://actramanitoba.ca/whats-filming/' },
  { province: 'Ontario — Toronto', union: 'ACTRA Toronto', url: 'https://actratoronto.com/whats-shooting/' },
  { province: 'Ontario — Ottawa', union: 'ACTRA Ottawa', url: 'https://actraottawa.ca/whats-shooting/' },
  { province: 'Quebec', union: 'ACTRA Montreal', url: 'https://www.actramontreal.ca/', note: 'Montreal branch' },
  { province: 'Maritimes (NS · NB · PEI)', union: 'ACTRA Maritimes', url: 'https://actramaritimes.ca/whats-filming/' },
  { province: 'Newfoundland & Labrador', union: 'ACTRA Maritimes', url: 'https://actramaritimes.ca/whats-filming/', note: 'Covered by ACTRA Maritimes' },
];

export default function WhatsFilmingPage() {
  const [active, setActive] = useState(0);
  const region = REGIONS[active];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a' }}>
      <div style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '14px' }}>
              ← Back
            </Link>
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'white' }}>🎬 What&apos;s Filming</h1>
          </div>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
            Live production lists from each province&apos;s performers&apos; union. Select a region to view what&apos;s shooting.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {REGIONS.map((r, i) => (
            <button
              key={r.province}
              onClick={() => setActive(i)}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: '600',
                border: `1px solid ${active === i ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '999px',
                backgroundColor: active === i ? 'rgba(245,158,11,0.15)' : '#1e1e35',
                color: active === i ? '#F59E0B' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {r.province}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: '#1e1e35', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎬</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 6px' }}>{region.province}</h2>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 4px' }}>{region.union}</p>
          {region.note ? <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 20px' }}>{region.note}</p> : <div style={{ height: '20px' }} />}
          <a
            href={region.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', backgroundColor: '#F59E0B', color: '#1a1a2e', padding: '13px 28px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}
          >
            View {region.union} Production List →
          </a>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '18px 0 0' }}>
            Opens the union&apos;s official site in a new tab. Lists update regularly.
          </p>
        </div>

        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            All Regions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {REGIONS.map(r => (
              <a
                key={r.province + r.union}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', backgroundColor: '#1e1e35', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', textDecoration: 'none' }}
              >
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'white', marginBottom: '2px' }}>{r.province}</div>
                <div style={{ fontSize: '12px', color: '#F59E0B' }}>{r.union} →</div>
              </a>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', margin: '28px 0 0', lineHeight: '1.6' }}>
          BGReady links to each union&apos;s public production list. Productions shown are signatory to that union&apos;s agreements. Always confirm details with the production or your agent.
        </p>
      </div>
    </div>
  );
}
