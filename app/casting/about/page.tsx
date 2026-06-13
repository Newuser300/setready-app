'use client'
import Link from 'next/link'
import Logo from '@/components/Logo'

const FEATURES = [
  { icon: '🗓️', title: 'Availability Heatmap', desc: 'See exactly which days have the most available performers — at a glance, before you even post.' },
  { icon: '🔍', title: 'Powerful Performer Search', desc: 'Filter by date, gender, age range, height, hair/eye colour, ethnicity, union status, and special skills.' },
  { icon: '📋', title: '5-Step Casting Requests', desc: 'Post a casting call in under 2 minutes. Agencies are notified instantly.' },
  { icon: '✅', title: 'One-Click Confirmation', desc: 'Shortlist, confirm, or pass on any submission without a single email.' },
  { icon: '🔔', title: 'Real-Time Notifications', desc: 'Get notified the moment an agency submits performers for your request.' },
  { icon: '🆓', title: 'Free Forever', desc: 'SetReady Casting is completely free for verified casting directors. No credit card required.' },
]

const COMPARISON = [
  ['Feature', 'AgencyClick', 'SetReady Casting'],
  ['Availability calendar', '❌', '✅ Heatmap'],
  ['Performer search filters', 'Basic', 'Advanced (8+ filters)'],
  ['Casting request workflow', '✅', '✅ Streamlined'],
  ['Mobile-first design', '❌', '✅'],
  ['Real-time notifications', '❌', '✅'],
  ['Cost for CDs', 'Paid', '🆓 Free'],
]

export default function CastingAboutPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'inherit' }}>

      {/* Nav */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size="sm" darkBackground showText />
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>/ Casting</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/casting/login" style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/casting/register" style={{ padding: '8px 18px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
            Apply Free
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', padding: '80px 24px 70px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '20px', color: '#4ade80', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}>
          Free for casting directors
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: '900', color: 'white', margin: '0 0 16px', lineHeight: '1.1' }}>
          Cast smarter.<br />Confirm faster.
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#9ca3af', maxWidth: '560px', margin: '0 auto 36px', lineHeight: '1.6' }}>
          The only casting platform built around performer availability — so you know before you ask.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/casting/register" style={{ padding: '14px 32px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', borderRadius: '12px', textDecoration: 'none', fontSize: '16px' }}>
            Apply for Free Access
          </Link>
          <Link href="/casting/login" style={{ padding: '14px 28px', backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: '600', borderRadius: '12px', textDecoration: 'none', fontSize: '16px', border: '1px solid rgba(255,255,255,0.15)' }}>
            Sign In
          </Link>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '8px' }}>How It Works</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '48px' }}>From opening the dashboard to confirming performers — in minutes, not days.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            { n: '1', title: 'Apply for access', desc: 'Submit your application. We verify and approve within 24 hours.' },
            { n: '2', title: 'Browse the heatmap', desc: 'See which dates have the highest performer availability before you decide your shoot day.' },
            { n: '3', title: 'Post a casting request', desc: 'Fill in role details in our 5-step wizard. Agencies receive an instant notification.' },
            { n: '4', title: 'Review submissions', desc: 'Shortlist, confirm, or pass — all from one Kanban-style view.' },
          ].map(s => (
            <div key={s.n} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px 20px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '900', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {s.n}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 8px' }}>{s.title}</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ backgroundColor: 'white', padding: '64px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '48px' }}>Everything you need</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ display: 'flex', gap: '14px', padding: '18px', borderRadius: '12px', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '28px', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 5px' }}>{f.title}</h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '32px' }}>SetReady vs AgencyClick</h2>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          {COMPARISON.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', borderBottom: i < COMPARISON.length - 1 ? '1px solid #f3f4f6' : 'none', backgroundColor: i === 0 ? '#1a1a2e' : i % 2 === 0 ? '#f9fafb' : 'white' }}>
              {row.map((cell, j) => (
                <div key={j} style={{ padding: '13px 18px', fontSize: i === 0 ? '12px' : '14px', fontWeight: i === 0 ? '700' : j === 0 ? '500' : '600', color: i === 0 ? '#9ca3af' : j === 2 ? '#16a34a' : '#374151', textAlign: j === 0 ? 'left' : 'center' }}>
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #f97316 100%)', padding: '64px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#1a1a2e', margin: '0 0 12px' }}>Ready to cast smarter?</h2>
        <p style={{ fontSize: '17px', color: 'rgba(26,26,46,0.7)', margin: '0 0 32px' }}>Join casting directors who've switched from AgencyClick. It's free.</p>
        <Link href="/casting/register" style={{ display: 'inline-block', padding: '16px 40px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '800', borderRadius: '14px', textDecoration: 'none', fontSize: '17px' }}>
          Apply for Free Access
        </Link>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '24px', textAlign: 'center' }}>
        <div style={{ color: '#4b5563', fontSize: '13px' }}>
          © {new Date().getFullYear()} SetReady · <Link href="/agent/about" style={{ color: '#6b7280', textDecoration: 'none' }}>For Agencies</Link> · <Link href="/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</Link> · <Link href="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</Link>
        </div>
      </div>
    </div>
  )
}
