'use client'
import Link from 'next/link'
import Logo from '@/components/Logo'

const FEATURES = [
  { icon: '📅', title: 'Availability at a glance', desc: 'See your entire roster\'s availability in one calendar — no more texting everyone individually.' },
  { icon: '🎬', title: 'Instant casting alerts', desc: 'Get notified the moment a casting director posts a new request that matches your roster.' },
  { icon: '📤', title: 'Bulk submissions', desc: 'Submit multiple performers for a role in seconds — the platform checks who is actually available on the shoot date.' },
  { icon: '📊', title: 'Submission tracking', desc: 'See the status of every submission across all requests: submitted, shortlisted, confirmed, or rejected.' },
  { icon: '🤝', title: 'Direct with casting directors', desc: 'No middlemen. When your performer is confirmed, you are notified immediately.' },
  { icon: '🔔', title: 'Smart notifications', desc: 'Shortlisted? Confirmed? Rejected? Every status change lands in your notification centre.' },
]

const PLANS = [
  {
    name: 'Basic',
    price: 'Free',
    sub: 'Forever',
    color: '#e5e7eb',
    textColor: '#374151',
    features: ['Up to 20 roster members', 'Submit to all casting requests', 'Availability calendar', 'Status notifications'],
    cta: 'Get Started Free',
    href: '/agent/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    sub: '/month',
    color: '#F59E0B',
    textColor: '#1a1a2e',
    features: ['Unlimited roster', 'Priority placement in search', 'Advanced analytics', 'Bulk CSV import', 'Dedicated support', 'Early access to new features'],
    cta: 'Start Free Trial',
    href: '/agent/register',
    highlight: true,
  },
]

export default function AgentAboutPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'inherit' }}>

      {/* Nav */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size="sm" darkBackground showText />
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>/ Agencies</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/agent/login" style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/agent/register" style={{ padding: '8px 18px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
            Register Agency
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', padding: '80px 24px 70px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '20px', color: '#F59E0B', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}>
          For talent agencies &amp; background casting agencies
        </div>
        <h1 style={{ fontSize: 'clamp(30px, 6vw, 52px)', fontWeight: '900', color: 'white', margin: '0 0 16px', lineHeight: '1.1' }}>
          Your roster.<br />Casting's radar.
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2.5vw, 19px)', color: '#9ca3af', maxWidth: '540px', margin: '0 auto 36px', lineHeight: '1.6' }}>
          Get your performers in front of verified casting directors who are actively looking — right now.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/agent/register" style={{ padding: '14px 32px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', borderRadius: '12px', textDecoration: 'none', fontSize: '16px' }}>
            Register Your Agency
          </Link>
          <Link href="/agent/login" style={{ padding: '14px 28px', backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: '600', borderRadius: '12px', textDecoration: 'none', fontSize: '16px', border: '1px solid rgba(255,255,255,0.15)' }}>
            Sign In
          </Link>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '8px' }}>How It Works</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '48px' }}>Getting your performers booked has never been this fast.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            { n: '1', title: 'Register your agency', desc: 'Your account is reviewed and approved by the SetReady team — usually same day.' },
            { n: '2', title: 'Build your roster', desc: 'Invite performers by email. They join your roster and set up their availability calendars.' },
            { n: '3', title: 'Get notified of casting calls', desc: 'When a casting director posts a request, you\'re notified instantly in the dashboard.' },
            { n: '4', title: 'Submit available performers', desc: 'Filter your roster by the shoot date, check who\'s available, and submit in one click.' },
          ].map(s => (
            <div key={s.n} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px 20px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#1a1a2e', color: '#F59E0B', fontWeight: '900', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
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
          <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '48px' }}>Built for agencies</h2>
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

      {/* Pricing */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginBottom: '8px' }}>Simple pricing</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '40px' }}>Start free. Upgrade when you need more.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ backgroundColor: plan.highlight ? '#1a1a2e' : 'white', borderRadius: '20px', padding: '32px 24px', boxShadow: plan.highlight ? '0 8px 32px rgba(0,0,0,0.2)' : '0 1px 8px rgba(0,0,0,0.07)', position: 'relative', overflow: 'hidden', border: plan.highlight ? 'none' : '1px solid #f3f4f6' }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '14px', right: '-24px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontSize: '11px', fontWeight: '800', padding: '4px 32px', transform: 'rotate(30deg)' }}>
                  POPULAR
                </div>
              )}
              <div style={{ fontSize: '16px', fontWeight: '700', color: plan.highlight ? '#9ca3af' : '#6b7280', marginBottom: '8px' }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '40px', fontWeight: '900', color: plan.highlight ? 'white' : '#1a1a2e', lineHeight: '1' }}>{plan.price}</span>
                <span style={{ fontSize: '15px', color: plan.highlight ? '#9ca3af' : '#6b7280', paddingBottom: '6px' }}>{plan.sub}</span>
              </div>
              <div style={{ margin: '20px 0', borderTop: `1px solid ${plan.highlight ? 'rgba(255,255,255,0.1)' : '#f3f4f6'}` }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: plan.highlight ? '#e5e7eb' : '#374151' }}>
                    <span style={{ color: '#22c55e', fontWeight: '700' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} style={{ display: 'block', textAlign: 'center', padding: '13px', backgroundColor: plan.highlight ? '#F59E0B' : '#1a1a2e', color: plan.highlight ? '#1a1a2e' : 'white', fontWeight: '800', borderRadius: '10px', textDecoration: 'none', fontSize: '15px' }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', padding: '64px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '30px', fontWeight: '900', color: 'white', margin: '0 0 12px' }}>Get your performers in front of casting directors</h2>
        <p style={{ fontSize: '16px', color: '#9ca3af', margin: '0 0 32px' }}>Free to start. No credit card required.</p>
        <Link href="/agent/register" style={{ display: 'inline-block', padding: '15px 40px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', borderRadius: '12px', textDecoration: 'none', fontSize: '16px' }}>
          Register Your Agency
        </Link>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#111827', padding: '24px', textAlign: 'center' }}>
        <div style={{ color: '#4b5563', fontSize: '13px' }}>
          © {new Date().getFullYear()} SetReady · <Link href="/casting/about" style={{ color: '#6b7280', textDecoration: 'none' }}>For Casting Directors</Link> · <Link href="/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</Link> · <Link href="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</Link>
        </div>
      </div>
    </div>
  )
}
