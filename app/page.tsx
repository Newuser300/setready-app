'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import Copyright from '@/components/Copyright';

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
      }}
    >
      {children}
    </div>
  );
}

const FREE_TOOLS = [
  { icon: '📋', title: 'Work Log', desc: 'Log every booking. Track your earnings. Build your work history.' },
  { icon: '📄', title: 'Voucher Storage', desc: 'Photograph and store every voucher inside your work log. Always there when you need it.' },
  { icon: '💰', title: 'Rate Calculator', desc: 'Know your exact pay before you sign anything. Official 2025-2028 UBCP/ACTRA rates built in.' },
  { icon: '📖', title: 'Film Set Glossary', desc: 'A to Z film terminology. Searchable on set. Never feel like an outsider.' },
  { icon: '🎭', title: 'Scenario Simulator', desc: 'Practice 10 real on-set situations before you are standing in one.' },
  { icon: '📔', title: 'On-Set Journal', desc: 'Record who you met and what you learned. With photo upload.' },
  { icon: '👥', title: 'Film Contacts', desc: 'Build your industry directory — directors, ADs, agents, performers.' },
  { icon: '📋', title: 'Proof of Residency', desc: 'Store your documents. Email them to production from your phone.' },
  { icon: '🎯', title: 'Goal Tracking', desc: 'Set milestones. Track progress. See your career grow.' },
  { icon: '🤝', title: 'Earn 20% Commission', desc: 'Refer performers. Earn 20% of every subscription they pay.' },
  { icon: '📅', title: 'Availability Calendar', desc: 'Mark available dates. Agents and casting directors see you in real time.' },
  { icon: '👤', title: 'Casting Profile', desc: 'Your headshot, stats and skills — visible to every approved agency and casting director.' },
];

const MODULES = [
  { num: '01', title: 'Film Set Terminology', desc: 'Master the language before day one.' },
  { num: '02', title: 'Background Acting Terms', desc: 'Understand your role. Deliver professional work every time.' },
  { num: '03', title: 'Set Etiquette and Conduct', desc: 'The unwritten rules that get you hired again.' },
  { num: '04', title: 'Safety on Set', desc: 'Protocols every background performer must know.' },
  { num: '05', title: 'Industry Standards and Pay', desc: 'Union rates, vouchers, and the path forward.' },
];

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref.toUpperCase());
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push('/dashboard');
      setIsLoading(false);
    }
    checkAuth();
  }, [supabase, router]);

  function goToSignUp() {
    router.push(refCode ? `/auth/sign-up?ref=${refCode}` : '/auth/sign-up');
  }

  function scrollToTools() {
    document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <div
          className="animate-spin"
          style={{ width: '40px', height: '40px', border: '3px solid #F59E0B', borderTopColor: 'transparent', borderRadius: '50%' }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white', fontFamily: '-apple-system, Arial, sans-serif', color: '#1a1a2e' }}>

      {/* ── SECTION 0 — STICKY NAV ───────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#1a1a2e', height: '64px', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size="md" darkBackground={true} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/auth/sign-in')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer', padding: '6px 8px' }}
            >
              Sign In
            </button>
            <button
              onClick={goToSignUp}
              style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '0 20px', height: '40px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── SECTION 1 — HERO ─────────────────────────────────── */}
      <section style={{ backgroundColor: 'white', paddingTop: '140px', paddingBottom: '100px', textAlign: 'center', padding: '140px 20px 100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontSize: '12px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '28px' }}>
            Canada&apos;s Background Performer Platform
          </p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(44px, 8vw, 72px)', fontWeight: '700', color: '#1a1a2e', lineHeight: '1.1', letterSpacing: '-0.02em', margin: '0 0 28px' }}>
            Everything a Background Performer<br />needs in one place.
          </h1>
          <p style={{ fontSize: 'clamp(17px, 2.5vw, 20px)', color: '#6b7280', maxWidth: '560px', margin: '0 auto 40px', lineHeight: '1.6' }}>
            Work log. Residency Docs. Rate calculator. Vouchers. Casting profile. Journal. Glossary. Availability calendar. Film contacts. And professional training — all in one app.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <button
              onClick={goToSignUp}
              style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '0 28px', height: '48px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
            >
              Create Free Account
            </button>
            <button
              onClick={scrollToTools}
              style={{ backgroundColor: 'transparent', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: '8px', padding: '0 28px', height: '48px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
            >
              See What&apos;s Included
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
            Free account &nbsp;·&nbsp; No credit card
          </p>
        </div>
      </section>

      {/* ── SECTION 2 — SPLIT STATEMENT ──────────────────────── */}
      <section style={{ backgroundColor: '#1a1a2e', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '24px 56px' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(64px, 10vw, 96px)', fontWeight: '700', color: '#F59E0B', lineHeight: '1', margin: '0 0 10px' }}>17</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>free tools</p>
            </div>
            <div style={{ width: '1px', height: '80px', backgroundColor: '#F59E0B', opacity: 0.35, flexShrink: 0 }} />
            <div style={{ textAlign: 'center', padding: '24px 56px' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(64px, 10vw, 96px)', fontWeight: '700', color: 'white', lineHeight: '1', margin: '0 0 10px' }}>5</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>training modules — $9.99</p>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '18px', color: '#9ca3af', marginTop: '36px', lineHeight: '1.6' }}>
            Most of SetReady is free. The training is optional.
          </p>
        </div>
      </section>

      {/* ── SECTION 3 — FREE TOOLS GRID ──────────────────────── */}
      <section id="tools" style={{ backgroundColor: 'white', padding: '100px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: '12px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '16px' }}>
              Free with every account
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: '700', color: '#1a1a2e', margin: '0 0 20px' }}>
              Your career tools. No subscription.
            </h2>
            <div style={{ width: '60px', height: '4px', backgroundColor: '#F59E0B', marginBottom: '52px' }} />
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FREE_TOOLS.map((tool, i) => (
              <FadeIn key={tool.title} delay={i * 40}>
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 10px rgba(0,0,0,0.07)', padding: '24px', height: '100%', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '28px', display: 'block', marginBottom: '14px' }}>{tool.icon}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a2e', margin: '0 0 8px' }}>{tool.title}</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{tool.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — THE TRAINING ─────────────────────────── */}
      <section style={{ backgroundColor: '#f9fafb', padding: '100px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: '12px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '16px' }}>
              02 &nbsp;&nbsp; Professional training
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: '700', color: '#1a1a2e', margin: '0 0 52px' }}>
              Train before you arrive.
            </h2>
          </FadeIn>

          {/* Two-column layout: modules list + pricing card */}
          <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Module list — 60% */}
            <div style={{ flex: '3 1 380px', minWidth: 0 }}>
              {MODULES.map((mod, i) => (
                <FadeIn key={mod.num} delay={i * 60}>
                  <div style={{ borderBottom: i < MODULES.length - 1 ? '1px solid #e5e7eb' : 'none', padding: '22px 0' }}>
                    <p style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '700', margin: '0 0 6px', letterSpacing: '0.05em' }}>{mod.num}</p>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 5px' }}>{mod.title}</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 10px', lineHeight: '1.5' }}>{mod.desc}</p>
                    <p style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600', margin: 0 }}>Includes quiz + certificate</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Pricing card — 40% */}
            <div style={{ flex: '2 1 260px' }}>
              <div style={{ position: 'sticky', top: '84px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.09)', borderTop: '4px solid #F59E0B', padding: '32px' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '48px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px', lineHeight: '1' }}>$9.99</p>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px' }}>per month</p>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 28px' }}>Cancel after 30 days</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                  {['All 5 modules', 'Quizzes after each module', '5 verifiable certificates', 'Instant access'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#F59E0B', fontWeight: '700', fontSize: '16px' }}>✓</span>
                      <span style={{ fontSize: '14px', color: '#374151' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => router.push('/preview')}
                  style={{ width: '100%', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '15px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Start Training
                </button>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#9ca3af', marginTop: '48px' }}>
            Optional: Advanced Acting Techniques — 4 additional modules. One-time upgrade.
          </p>
        </div>
      </section>

      {/* ── SECTION 5 — HOW IT WORKS ─────────────────────────── */}
      <section style={{ backgroundColor: 'white', padding: '100px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: '12px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '16px' }}>
              03 &nbsp;&nbsp; Get started
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: '700', color: '#1a1a2e', margin: '0 0 52px' }}>
              Three steps.
            </h2>
          </FadeIn>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                n: '1',
                title: 'Create your free account',
                desc: 'No credit card. Takes 60 seconds. Your casting profile goes live immediately.',
              },
              {
                n: '2',
                title: 'Set your availability',
                desc: 'Mark the dates you can work. Agents and casting directors see you in real time.',
              },
              {
                n: '3',
                title: 'Train when you\'re ready',
                desc: 'Subscribe to unlock 5 professional modules for $9.99. Cancel after 30 days.',
              },
            ].map((step, i) => (
              <FadeIn key={step.n} delay={i * 80}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#F59E0B' }}>{step.n}</span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>{step.title}</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.65', margin: 0 }}>{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — REFERRAL BANNER ──────────────────────── */}
      <section style={{ backgroundColor: '#1a1a2e', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: '700', lineHeight: '1.3', margin: '0 0 16px' }}>
            <span style={{ color: 'white' }}>Refer a fellow performer. </span>
            <span style={{ color: '#F59E0B' }}>Earn 20% commission — paid monthly.</span>
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
            Your referral code is in your dashboard from day one. No subscription required.
          </p>
        </div>
      </section>

      {/* ── SECTION 7 — CASTING PLATFORM CALLOUT ─────────────── */}
      <section style={{ backgroundColor: 'white', padding: '100px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap', alignItems: 'center' }}>
            <FadeIn>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <p style={{ fontSize: '12px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '16px' }}>
                  SetReady Casting
                </p>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '700', color: '#1a1a2e', margin: '0 0 20px', lineHeight: '1.25' }}>
                  Get discovered by agents and casting directors.
                </h2>
                <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.7', margin: '0 0 28px' }}>
                  Your free performer profile is visible to every approved agency and casting director on SetReady Casting — Canada&apos;s background performer casting network.
                </p>
                <Link
                  href="/casting/about"
                  style={{ color: '#F59E0B', fontWeight: '600', fontSize: '15px', textDecoration: 'none' }}
                >
                  Learn More →
                </Link>
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {['Create your free profile', 'Mark your availability', 'Get added to agency rosters'].map((pt, i) => (
                  <div key={pt} style={{ display: 'flex', alignItems: 'center', gap: '18px', borderLeft: '3px solid #F59E0B', paddingLeft: '20px' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '700', flexShrink: 0 }}>0{i + 1}</span>
                    <p style={{ fontSize: '17px', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>{pt}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── SECTION 8 — FINAL CTA ────────────────────────────── */}
      <section style={{ backgroundColor: '#1a1a2e', padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: '700', color: 'white', lineHeight: '1.15', margin: '0 0 40px' }}>
            Your career starts with<br />a free account.
          </h2>
          <button
            onClick={goToSignUp}
            style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', height: '56px', padding: '0 32px', fontSize: '17px', fontWeight: '700', cursor: 'pointer' }}
          >
            Create Free Account
          </button>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '20px' }}>
            Then subscribe from $9.99 when you are ready to train.
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#1a1a2e', borderTop: '1px solid rgba(245,158,11,0.4)', padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ marginBottom: '18px' }}>
            <Logo size="sm" darkBackground={true} />
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
            © 2026 SetReady. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
            <Link href="/terms" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>Terms</Link>
            <Link href="/privacy" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>Privacy</Link>
          </div>
        </div>
      </footer>
      <Copyright />

    </div>
  );
}
