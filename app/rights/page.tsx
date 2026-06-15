'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RightsPage() {
  const router = useRouter();

  const rights = [
    {
      icon: '💰',
      title: 'Minimum Daily Rate',
      body: 'Background performers are entitled to the negotiated minimum daily rate set by UBCP/ACTRA. Rates vary by project type (theatrical film, TV movie, commercial, etc.). Always verify your rate before accepting a booking.',
    },
    {
      icon: '⏰',
      title: 'Overtime & Turnaround',
      body: 'You are entitled to overtime pay after 8 hours on set. There must be a minimum 10-hour turnaround between your wrap time and your next call time. Violations must be flagged to your union steward.',
    },
    {
      icon: '🍽️',
      title: 'Meal Breaks',
      body: 'A meal break must be provided no later than 6 hours after your call time. If production runs late, you are entitled to a "meal penalty" payment added to your voucher.',
    },
    {
      icon: '📋',
      title: 'Voucher Rights',
      body: 'You must receive a completed and signed voucher at wrap. Never leave set without your voucher. Check that your hours, rate, and overtime are recorded correctly before signing.',
    },
    {
      icon: '🎭',
      title: 'Upgraded Work',
      body: 'If you are given lines, upgraded to a featured role, or asked to perform as a principal, you are entitled to the appropriate principal rate — not the background rate. Notify your union rep immediately.',
    },
    {
      icon: '🛡️',
      title: 'Safe Working Conditions',
      body: 'You have the right to a safe set. This includes proper rest, protection from hazardous conditions, and the right to refuse unsafe work without penalty under BC OHS regulations.',
    },
    {
      icon: '📸',
      title: 'Likeness & Consent',
      body: 'Your image may only be used as specified by the production\'s contract. Nudity or unusual physical exposure requires explicit negotiated consent and additional compensation.',
    },
    {
      icon: '🤝',
      title: 'Union Membership & Qualifying',
      body: 'After accumulating the required number of background vouchers under UBCP/ACTRA jurisdiction, you may be eligible for union membership. Track your qualifying days using the Voucher Wallet.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#1a1a2e', color: 'white', padding: '16px 20px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '20px', padding: 0, lineHeight: 1 }}>←</button>
          <div>
            <h1 style={{ fontWeight: '800', fontSize: '18px', margin: 0 }}>⚖️ Know Your Rights</h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Background performer rights under UBCP/ACTRA</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: '#78350f', margin: 0, lineHeight: '1.5' }}>
            <strong>Disclaimer:</strong> This is general information only and not legal advice. For the most current rates, rules, and collective agreements, visit{' '}
            <a href="https://ubcpactra.ca/agreements/" target="_blank" rel="noopener noreferrer" style={{ color: '#92400e', fontWeight: '700' }}>
              ubcpactra.ca
            </a>.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {rights.map((right, i) => (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{right.icon}</span>
                <div>
                  <p style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e', margin: '0 0 6px' }}>{right.title}</p>
                  <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '1.6' }}>{right.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: '#1a1a2e', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ color: 'white', fontWeight: '700', fontSize: '15px', margin: '0 0 8px' }}>Read the Full Collective Agreement</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 14px' }}>The official UBCP/ACTRA agreements cover all rates, rules, and performer protections.</p>
          <a
            href="https://ubcpactra.ca/agreements/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', fontSize: '14px', borderRadius: '10px', textDecoration: 'none' }}
          >
            View Agreements →
          </a>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}>← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
