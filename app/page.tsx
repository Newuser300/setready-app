'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* ── Scroll-triggered fade-in wrapper ──────────────────────── */
function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── STICKY NAV ──────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a2e] border-b border-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <span className="bg-[#F59E0B] rounded-md px-3 py-1 text-[#1a1a2e] text-xl font-bold tracking-tight">🎬 SetReady</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="px-3 sm:px-4 py-2 text-gray-300 hover:text-white text-sm transition"
            >
              Sign In
            </button>
            <button
              onClick={goToSignUp}
              className="px-4 py-2 bg-amber-500 text-black rounded-xl hover:bg-amber-400 transition-all duration-200 font-semibold text-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-4 overflow-hidden bg-white">
        {/* Subtle amber radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(245,158,11,0.06)_0%,transparent_70%)]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-6xl sm:text-7xl font-extrabold text-[#1a1a2e] text-center tracking-tight mb-4 animate-fade-in">
            SetReady
          </h2>

          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-50 text-amber-600 text-xs font-semibold mb-8 animate-fade-in">
            🎬 Professional Background Performer Training
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-[#1a1a2e] mb-4 leading-tight animate-fade-in-up">
            Everything a background performer needs. One app.
          </h1>

          {/* Sub-headline */}
          <p
            className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            From your first call time to your hundredth set.
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-6 animate-fade-in-up"
            style={{ animationDelay: '0.35s' }}
          >
            <button
              onClick={() => router.push('/preview')}
              className="px-8 py-4 bg-amber-500 text-black text-base font-bold rounded-xl hover:bg-amber-400 hover:scale-105 transition-all duration-200 shadow-lg shadow-amber-500/20"
            >
              Start Learning →
            </button>
            <button
              onClick={() => router.push('/preview')}
              className="px-8 py-4 bg-transparent text-gray-700 border border-gray-300 text-base font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              View Curriculum
            </button>
          </div>

          <p className="text-4xl font-bold text-amber-500 text-center mt-6 animate-fade-in-up">
            $9.99/month
          </p>

        </div>

        {/* Scroll arrow */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20 animate-bounce text-gray-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* CHANGE 3: Marquee/ticker section removed entirely */}

      {/* ── PROBLEM / SOLUTION ─────────────────────────────── */}
      <section className="bg-[#F9FAFB] py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-start">

          {/* Problem */}
          <FadeIn>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 h-full">
              <span className="inline-block px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full mb-5 uppercase tracking-wide">
                The Problem
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 leading-snug">
                Breaking into the industry is harder than it looks.
              </h2>
              <div className="space-y-4">
                {[
                  'Not knowing set etiquette costs you callbacks.',
                  'Missing industry terminology marks you as amateur.',
                  'Not knowing what to do can be stressful.',
                ].map(pt => (
                  <div key={pt} className="flex items-start gap-3">
                    <span className="text-red-500 font-bold text-lg mt-0.5 shrink-0">✗</span>
                    <p className="text-gray-600 leading-snug">{pt}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Solution — CHANGE 1: button text updated */}
          <FadeIn delay={150}>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-amber-200 h-full">
              <span className="inline-block px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full mb-5 uppercase tracking-wide">
                The Solution
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 leading-snug">
                SetReady has you covered.
              </h2>
              <div className="space-y-4">
                {[
                  'Master professional set conduct in hours, not years.',
                  'Speak the language that gets you hired again.',
                  'Log your work. Upload vouchers. Track your earnings.',
                  'Store residency docs. Build contacts. Know what to wear.',
                  'Find an agent. Discover what\'s filming. Journal your journey.',
                ].map(pt => (
                  <div key={pt} className="flex items-start gap-3">
                    <span className="text-amber-500 font-bold text-lg mt-0.5 shrink-0">✓</span>
                    <p className="text-gray-600 leading-snug">{pt}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={goToSignUp}
                className="mt-8 w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-all duration-200"
              >
                Start Learning →
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CURRICULUM PREVIEW ─────────────────────────────── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Two comprehensive sections designed by industry professionals, and much more.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Section 1 — gold */}
            <FadeIn delay={100}>
              <div className="relative bg-white rounded-2xl p-8 border-2 border-amber-400 shadow-md h-full flex flex-col">
                <span className="absolute -top-3.5 left-6 px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full uppercase tracking-wide">
                  Most Popular
                </span>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Background Acting Essentials</h3>
                  <p className="text-amber-500 text-3xl font-bold">
                    $9.99
                    <span className="text-sm text-gray-500 font-normal">/month</span>
                  </p>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {[
                    'Film Set Terminology',
                    'Background Acting Terms & Performance',
                    'Set Etiquette & Professional Conduct',
                    'Safety on Set',
                    'Industry Standards, Pay & Career Advancement',
                  ].map(m => (
                    <li key={m} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-amber-500 font-bold shrink-0 mt-0.5">✓</span> {m}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mb-6 border-t border-gray-100 pt-4">
                  Includes: Quizzes, Certificates, 14 Career Tools
                </p>
                <button
                  onClick={() => router.push('/preview')}
                  className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-all duration-200"
                >
                  Start Section 1 →
                </button>
              </div>
            </FadeIn>

            {/* Section 2 — silver */}
            <FadeIn delay={200}>
              <div className="relative bg-white rounded-2xl p-8 border border-gray-200 shadow-sm h-full flex flex-col">
                <span className="absolute -top-3.5 left-6 px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-full uppercase tracking-wide">
                  Advanced
                </span>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">Advanced Acting Techniques</h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full border border-gray-200 uppercase tracking-wide">
                      Optional
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Unlocks after Section 1 is complete. One-time fee.</p>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {[
                    'Foundation',
                    'Audition Technique',
                    'Scene Study',
                    'Advanced Technique',
                  ].map(m => (
                    <li key={m} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-gray-400 font-bold shrink-0 mt-0.5">✓</span> {m}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/preview')}
                  className="w-full py-3 bg-transparent text-gray-700 border border-gray-300 font-bold rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Unlock Section 2 →
                </button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CHANGE 4: "Learn From The Masters" instructor section removed entirely */}

      {/* CHANGE 5: "Everything Included" features section removed entirely */}

      {/* ── REFERRAL SLIM BANNER ───────────────────────────── */}
      <div className="bg-gray-50 border-y border-gray-200 py-3 text-center px-4">
        <p className="text-sm text-gray-500">
          💰 Know another performer? Refer them and earn 20% commission{' '}
          <span className="text-gray-400">— paid monthly via e-transfer.</span>
        </p>
      </div>

      {/* ── BOLD STATEMENT ─────────────────────────────────── */}
      <section style={{ backgroundColor: '#F59E0B' }} className="py-10 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
            Not just a course.<br />Your complete career companion.
          </h2>
          <p className="text-[#1a1a2e]/80 text-base leading-relaxed">
            Most background performers learn through costly mistakes on the job. SetReady performers arrive prepared, professional and confident — from day one.
          </p>
        </div>
      </section>

      {/* ── MORE TOOLS INCLUDED ────────────────────────────── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                More Than a Course — A Complete Career Platform
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Every tool a working background performer actually needs. Included with your subscription.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '📋',
                title: 'Work Log & Earnings Tracker',
                desc: 'Track every booking — production name, role type, hours worked and total pay. Your complete film industry work history in one place.',
              },
              {
                icon: '💰',
                title: 'Rate Calculator',
                desc: 'Calculate your exact pay for any booking. Union and non-union rates based on the official 2025-2028 UBCP/ACTRA agreement.',
              },
              {
                icon: '📄',
                title: 'Upload Work Vouchers',
                desc: 'Photograph and store your union and non-union work vouchers directly inside each work log entry. Always have proof of your work days ready.',
              },
              {
                icon: '🏆',
                title: 'Certificates',
                desc: 'Earn a certificate for every module you complete. Download and share your achievements with agents and casting directors.',
              },
              {
                icon: '🤝',
                title: 'Referrals',
                desc: 'Refer friends and earn 20% commission on every subscription. Request payouts directly through the app.',
              },
              {
                icon: '🎭',
                title: 'Set Etiquette Simulator',
                desc: 'Test your on-set knowledge with 10 real scenarios. Learn how to handle tricky situations before they happen on a real set.',
              },
              {
                icon: '📖',
                title: 'Glossary',
                desc: 'A to Z reference of every film set term you need to know. Search instantly while you are on set.',
              },
              {
                icon: '🎯',
                title: 'Goal Tracking',
                desc: 'Set career goals and track your progress. Days worked, agencies registered, vouchers earned and more.',
              },
              {
                icon: '👥',
                title: 'Film Contacts',
                desc: 'Build your industry contact list. Save details for directors, ADs, agents, makeup artists and fellow performers you meet on set.',
              },
              {
                icon: '📔',
                title: 'On-Set Journal',
                desc: 'Record your experiences after every booking. Who you met, what you learned and memorable moments — with photo upload.',
              },
              {
                icon: '📋',
                title: 'Proof of Residency',
                desc: 'Store your residency documents securely. Email them to production directly from the app when requested on set.',
              },
              {
                icon: '👔',
                title: 'What to Wear on Set',
                desc: 'A complete background performer clothing guide. Know exactly what to wear and what to avoid before every booking.',
              },
              {
                icon: '🎬',
                title: "Discover What's Filming",
                desc: 'Direct link to the UBCP/ACTRA production list — see every active production currently filming in BC.',
              },
              {
                icon: '🤝',
                title: 'Find an Agent',
                desc: 'Browse our directory of background performer agencies across Canada organized by city and province.',
              },
            ].map((f, i) => (
              <FadeIn key={f.title} delay={i * 50}>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
                  <span className="text-3xl mb-4 block">{f.icon}</span>
                  <h3 className="text-gray-900 font-bold mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-white font-bold text-xl">🎬 SetReady</p>
              <p className="text-gray-400 text-sm mt-1">Professional training for background performers</p>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <Link href="/terms"   className="hover:text-white transition">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
              <a href="mailto:setready@mail.com" className="hover:text-white transition">Contact</a>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-xs text-gray-500">© 2026 SetReady. All rights reserved.</p>
            <a href="mailto:setready@mail.com" className="text-xs text-gray-500 hover:text-gray-300 transition">
              setready@mail.com
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
