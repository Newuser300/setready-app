'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import SignUpModal from '@/app/components/SignUpModal';
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
      { threshold: 0.08 }
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
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      {children}
    </div>
  );
}

const section1Modules = [
  { num: '01', title: 'Film Set Terminology', desc: 'Master the language of the film set.' },
  { num: '02', title: 'Background Acting Terms and Performance', desc: 'Your role, your performance, your reputation.' },
  { num: '03', title: 'Set Etiquette and Professional Conduct', desc: 'The unwritten rules that get you hired again.' },
  { num: '04', title: 'Safety on Set', desc: 'Protect yourself and others.' },
  { num: '05', title: 'Industry Standards, Pay and Advancement', desc: 'Know what you are owed.' },
];

const section2Modules = [
  { num: '06', title: 'Foundation', desc: 'Build your acting foundation.' },
  { num: '07', title: 'Audition Technique', desc: 'Land the role before you walk in.' },
  { num: '08', title: 'Scene Study', desc: 'Break down scenes with confidence.' },
  { num: '09', title: 'Advanced Technique', desc: 'Elevate your craft to the next level.' },
];

const FREE_TOOLS = [
  { icon: '📅', title: 'Availability Calendar', desc: 'Mark available dates. Agents and casting directors see you in real time.' },
  { icon: '👤', title: 'Casting Profile', desc: 'Your headshot, stats and skills — visible to every approved agency and casting director.' },
  { icon: '📋', title: 'Work Log', desc: 'Log every booking. Track your earnings. Build your work history.' },
  { icon: '📄', title: 'Voucher Storage', desc: 'Photograph and store every voucher inside your work log. Always there when you need it.' },
  { icon: '💰', title: 'Rate Calculator', desc: 'Know your exact pay before you sign anything. Official 2025-2028 UBCP/ACTRA rates built in.' },
  { icon: '📖', title: 'Film Set Glossary', desc: 'A to Z film terminology. Searchable on set. Never feel like an outsider.' },
  { icon: '🎭', title: 'Scenario Simulator', desc: 'Practice 10 real on-set situations before you are standing in one.' },
  { icon: '📔', title: 'On-Set Journal', desc: 'Record who you met and what you learned. With photo upload.' },
  { icon: '👥', title: 'Film Contacts', desc: 'Build your industry directory — directors, ADs, agents, performers.' },
  { icon: '📋', title: 'Proof of Residency', desc: 'Store your documents. Email them to production from your phone.' },
  { icon: '🎯', title: 'Goal Tracking', desc: 'Set milestones. Track progress. See your career grow.' },
  { icon: '🤝', title: 'Referrals', desc: 'Refer performers. Earn 20% of every subscription they pay.' },
];

const TOOL_CHIPS = [
  { icon: '📅', label: 'Availability' },
  { icon: '👤', label: 'Casting Profile' },
  { icon: '📋', label: 'Work Log' },
  { icon: '📄', label: 'Vouchers' },
  { icon: '💰', label: 'Rates' },
  { icon: '📖', label: 'Glossary' },
  { icon: '🎭', label: 'Simulator' },
  { icon: '📔', label: 'Journal' },
  { icon: '👥', label: 'Contacts' },
  { icon: '📋', label: 'Residency Docs' },
  { icon: '🎯', label: 'Goals' },
  { icon: '🤝', label: 'Referrals' },
];

export default function PreviewPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white', fontFamily: '-apple-system, Arial, sans-serif', color: '#1a1a2e' }}>
      {showModal && <SignUpModal onClose={() => setShowModal(false)} />}

      {/* ── NAV ──────────────────────────────────────────────── */}
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
              onClick={() => setShowModal(true)}
              style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '0 20px', height: '40px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              Create Account
            </button>
          </div>
        </div>
      </nav>

      {/* ── SECTION 1 — PREVIEW HERO ─────────────────────────── */}
      <section style={{ backgroundColor: 'white', padding: '120px 20px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p style={{ fontSize: '12px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>
            Preview
          </p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(36px, 7vw, 52px)', fontWeight: '700', color: '#1a1a2e', lineHeight: '1.15', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            See everything BGReady includes.
          </h1>
          <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 32px' }}>
            Explore every module and tool below. Create a free account to get started.
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', height: '48px', padding: '0 28px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
          >
            Create Free Account
          </button>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '12px' }}>
            No credit card required.
          </p>
        </div>
      </section>

      {/* ── SECTION 2 — FREE TOOLS STRIP ─────────────────────── */}
      <section style={{ backgroundColor: '#f9fafb', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '20px', fontWeight: '600' }}>
            Free with every account
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {TOOL_CHIPS.map(chip => (
              <div
                key={chip.label}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', color: '#374151', fontWeight: '500' }}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
                <span style={{ fontSize: '10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '4px', padding: '1px 5px', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Free</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — SECTION 1 MODULES ────────────────────── */}
      <section style={{ backgroundColor: 'white', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: '12px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '16px' }}>
              Section 1 &nbsp;·&nbsp; $9.99/month
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: '700', color: '#1a1a2e', margin: '0 0 10px' }}>
              Background Acting Essentials
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 28px' }}>
              5 modules. Quizzes. Certificates. Instant access.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '36px' }}
            >
              Unlock Full Access →
            </button>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {section1Modules.map((mod, i) => (
              <FadeIn key={mod.num} delay={i * 60}>
                <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderLeft: '3px solid #F59E0B', borderRadius: '0 8px 8px 0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#1a1a2e' }}>{mod.num}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' }}>{mod.title}</h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 10px', lineHeight: '1.5' }}>{mod.desc}</p>
                      <p style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600', margin: 0 }}>Includes quiz + certificate</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '15px' }}>🔒</span>
                    <button
                      onClick={() => setShowModal(true)}
                      style={{ fontSize: '12px', color: '#F59E0B', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
                    >
                      Create account
                    </button>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — SIMULATOR PREVIEW ────────────────────── */}
      <section style={{ backgroundColor: '#f9fafb', padding: '60px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <FadeIn>
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px 36px' }}>
              <p style={{ fontSize: '11px', color: '#F59E0B', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: '700', margin: '0 0 14px' }}>
                Bonus Tool · Free
              </p>
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 14px', lineHeight: '1.2' }}>
                🎭 Set Etiquette Simulator
              </h3>
              <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.65', margin: '0 0 24px' }}>
                Practice 10 real on-set scenarios before they happen. How do you handle a phone going off on set? What do you do when you miss your mark? Find out before day one.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {[
                  'The director calls action — you missed your position. What do you do?',
                  'A fellow extra is complaining loudly in holding. Do you engage?',
                  'Wardrobe rejects your outfit. How do you handle it?',
                ].map(s => (
                  <div key={s} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#F59E0B', flexShrink: 0, fontWeight: '700', marginTop: '1px' }}>→</span>
                    <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>&ldquo;{s}&rdquo;</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{ background: 'none', border: 'none', color: '#F59E0B', fontWeight: '700', fontSize: '14px', cursor: 'pointer', padding: 0 }}
              >
                Create account to access →
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION 5 — SECTION 2 PREVIEW ────────────────────── */}
      <section style={{ backgroundColor: 'white', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '16px' }}>
              Section 2 &nbsp;·&nbsp; Optional upgrade
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' }}>
              Advanced Acting Techniques
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', maxWidth: '520px', margin: '0 0 36px', lineHeight: '1.6' }}>
              For performers who want to pursue acting beyond background work. Unlocks after Section 1. One-time fee.
            </p>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {section2Modules.map((mod, i) => (
              <FadeIn key={mod.num} delay={i * 60}>
                <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderLeft: '3px solid #9ca3af', borderRadius: '0 8px 8px 0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280' }}>{mod.num}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#374151', margin: '0 0 2px' }}>{mod.title}</h3>
                      <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>{mod.desc}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '15px', flexShrink: 0 }}>🔒</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — MORE TOOLS ───────────────────────────── */}
      <section style={{ backgroundColor: '#f9fafb', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: '12px', color: '#F59E0B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '16px' }}>
              More than a course
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: '700', color: '#1a1a2e', margin: '0 0 12px' }}>
              A complete career platform.
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 44px' }}>
              Everything below is included with your free account. No subscription.
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FREE_TOOLS.map((tool, i) => (
              <FadeIn key={tool.title} delay={i * 40}>
                <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', position: 'relative', height: '100%', boxSizing: 'border-box' }}>
                  <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '4px', padding: '2px 6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Free
                  </span>
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '14px' }}>{tool.icon}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 7px' }}>{tool.title}</h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{tool.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7 — BOTTOM CTA ───────────────────────────── */}
      <section style={{ backgroundColor: '#1a1a2e', padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: '700', color: 'white', lineHeight: '1.2', margin: '0 0 20px' }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: '18px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 36px' }}>
            Create your free account. Your casting profile goes live immediately.
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', height: '56px', padding: '0 32px', fontSize: '17px', fontWeight: '700', cursor: 'pointer' }}
          >
            Create Free Account
          </button>
          <p style={{ marginTop: '20px' }}>
            <button
              onClick={() => router.push('/auth/sign-in')}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer', padding: 0 }}
            >
              Already have an account? Sign in →
            </button>
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
            © 2026 BGReady. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
            <a href="/terms" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>Terms</a>
            <a href="/privacy" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>Privacy</a>
            <a href="mailto:support@bgready.site" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>
      <Copyright />

    </div>
  );
}
