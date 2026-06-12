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
  const [scrolled, setScrolled] = useState(false);

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

    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
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
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <span className="text-gray-900 text-xl font-bold tracking-tight">🎬 SetReady</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-900 text-sm transition"
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
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-50 text-amber-600 text-xs font-semibold mb-8 animate-fade-in">
            🎬 Professional Background Performer Training
          </div>

          {/* Headline — CHANGE 2: "Your Acting Career Starts Here" */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 mb-4 leading-tight animate-fade-in-up">
            Your Acting Career<br />
            <span className="text-amber-500">Starts Here</span>
          </h1>

          {/* 5-star rating */}
          <div
            className="flex flex-col items-center gap-1 mb-6 animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="text-amber-500 text-2xl tracking-widest">★★★★★</span>
            <span className="text-gray-400 text-sm">5/5 from our performers</span>
          </div>

          {/* Sub-headline */}
          <p
            className="text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            Professional training trusted by background performers across Canada
          </p>

          {/* CTA buttons — CHANGE 1: "Start Learning Free" → "Start Learning" */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-fade-in-up"
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

          {/* Trust badge */}
          <div
            className="flex justify-center animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className="text-green-500 font-bold">✓</span> Cancel Anytime
            </span>
          </div>
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
                Breaking into the industry is harder than it looks
              </h2>
              <div className="space-y-4">
                {[
                  'Not knowing set etiquette costs you callbacks',
                  'Missing industry terminology marks you as amateur',
                  'No guidance on rates means leaving money behind',
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
                SetReady changes everything
              </h2>
              <div className="space-y-4">
                {[
                  'Master professional set conduct in hours, not years',
                  'Speak the language that gets you hired again',
                  'Know your worth and negotiate confidently',
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
                Two comprehensive sections designed by industry professionals
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
                  Includes: Quizzes, Certificates, Progress Tracking
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced Acting Techniques</h3>
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
                <p className="text-xs text-gray-400 mb-6 border-t border-gray-100 pt-4">
                  Includes: Master Class Content, Certificates
                </p>
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

      {/* ── TESTIMONIALS ───────────────────────────────────── */}
      <section className="bg-[#F9FAFB] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                What Performers Are Saying
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: 'SetReady is perfect. I learned everything I needed to be a Background Performer.',
                name: 'Sarah M.',
                location: 'Vancouver, BC',
              },
              {
                quote: 'The set etiquette module alone was worth the subscription. I finally feel confident walking onto any set.',
                name: 'James T.',
                location: 'Vancouver, BC',
              },
              {
                quote: 'Section 2 was worth it.',
                name: 'Maria L.',
                location: 'Vancouver, BC',
              },
            ].map((t, i) => (
              <FadeIn key={t.name} delay={i * 100}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4 h-full">
                  <div>
                    <p className="text-amber-500 text-lg tracking-wider">★★★★★</p>
                    <p className="text-xs text-gray-400 mt-0.5">5/5</p>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="text-gray-900 font-semibold text-sm">— {t.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{t.location}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── REFERRAL SLIM BANNER ───────────────────────────── */}
      <div className="bg-gray-50 border-y border-gray-200 py-3 text-center px-4">
        <p className="text-sm text-gray-500">
          💰 Refer a friend and earn 20% commission on their subscription{' '}
          <span className="text-gray-400">— paid monthly via e-transfer</span>
        </p>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-white font-bold text-xl">🎬 SetReady</p>
              <p className="text-gray-400 text-sm mt-1">Professional training for background performers</p>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <Link href="/agencies" className="hover:text-white transition">Find Background Agencies in Canada →</Link>
              <Link href="/terms"    className="hover:text-white transition">Terms</Link>
              <Link href="/privacy"  className="hover:text-white transition">Privacy</Link>
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
