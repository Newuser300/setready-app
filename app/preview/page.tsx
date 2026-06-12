'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import SignUpModal from '@/app/components/SignUpModal';

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
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Module data ────────────────────────────────────────────── */
const section1Modules = [
  {
    num: '01',
    title: 'Film Set Terminology',
    desc: 'Master the language of the film set. The terms that separate professionals from amateurs on day one.',
  },
  {
    num: '02',
    title: 'Background Acting Terms & Performance',
    desc: 'Understand your role on set. Deliver natural, professional background work every time.',
  },
  {
    num: '03',
    title: 'Set Etiquette & Professional Conduct',
    desc: 'The unwritten rules that get you hired again. Professional conduct that builds your reputation.',
  },
  {
    num: '04',
    title: 'Safety on Set',
    desc: 'Protect yourself and others. Know every protocol background performers must follow.',
  },
  {
    num: '05',
    title: 'Industry Standards, Pay & Career Advancement',
    desc: 'Know your worth. Union rates, vouchers, and the path from background to principal performer.',
  },
];

const section2Modules = [
  { num: '06', title: 'Foundation' },
  { num: '07', title: 'Audition Technique' },
  { num: '08', title: 'Scene Study' },
  { num: '09', title: 'Advanced Technique' },
];

/* ── Locked module card ─────────────────────────────────────── */
function LockedCard({
  num,
  title,
  desc,
  accent,
  onUnlock,
}: {
  num: string;
  title: string;
  desc?: string;
  accent: 'gold' | 'silver';
  onUnlock: () => void;
}) {
  const isGold = accent === 'gold';
  return (
    <button
      onClick={onUnlock}
      className={`group w-full text-left bg-gray-50 rounded-2xl p-6 relative
        border border-gray-200 border-t-2 ${isGold ? 'border-t-amber-500' : 'border-t-gray-400'}
        hover:shadow-md hover:border-gray-300 transition-all duration-200`}
    >
      {/* Lock icon */}
      <span className="absolute top-4 right-4 text-base text-gray-400">
        🔒
      </span>

      {/* Module number badge */}
      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md mb-3 ${
        isGold ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
      }`}>
        {num}
      </span>

      {/* Title */}
      <h3 className="text-gray-800 font-bold text-base mb-2 pr-6 leading-snug">{title}</h3>

      {/* Description */}
      {desc && <p className="text-gray-500 text-sm leading-relaxed mb-4">{desc}</p>}

      {/* Footer */}
      <p className={`text-xs font-medium ${isGold ? 'text-amber-600' : 'text-gray-500'}`}>
        🔒 Sign up to access
      </p>
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function PreviewPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {showModal && <SignUpModal onClose={() => setShowModal(false)} />}

      {/* ── STICKY TOP BANNER (dark is intentional) ─────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-gray-300 truncate">
              🎬 <span className="hidden sm:inline">Preview Mode — </span>Sign up to unlock full access
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="px-3 py-1.5 text-sm text-white/60 hover:text-white transition"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-1.5 text-sm bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-all duration-200"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>

      {/* offset for fixed banner */}
      <div className="pt-[52px]">

        {/* ── HERO AREA ───────────────────────────────────────── */}
        <section className="bg-white border-b border-gray-200 px-4 py-14 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-50 text-amber-600 text-xs font-semibold mb-6">
                👁 Preview Mode — Explore the full curriculum
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-5 leading-tight max-w-3xl">
                Your Acting Journey<br />
                <span className="text-amber-500">Starts Here</span>
              </h1>
              <p className="text-gray-500 text-lg max-w-xl mb-8 leading-relaxed">
                Explore our complete curriculum below. Sign up to unlock instant access to all modules,
                quizzes, and certificates.
              </p>

              {/* Progress bar preview */}
              <div className="max-w-sm">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Your Progress</span>
                  <span>0% Complete</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-2 w-0 bg-amber-500 rounded-full" />
                </div>
                <p className="text-xs text-gray-400 mt-2">Sign up to start tracking your progress</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 1 PREVIEW ───────────────────────────────── */}
        <section className="bg-white px-4 py-14">
          <div className="max-w-6xl mx-auto">

            {/* Section header */}
            <FadeIn>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pl-4 border-l-4 border-amber-500">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Section 1: Background Acting Essentials
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">$9.99/month • Cancel anytime</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="shrink-0 px-6 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 hover:scale-105 transition-all duration-200 text-sm shadow-sm"
                >
                  Unlock Full Access →
                </button>
              </div>
            </FadeIn>

            {/* Module cards grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {section1Modules.map((mod, i) => (
                <FadeIn key={mod.num} delay={i * 70}>
                  <LockedCard
                    num={mod.num}
                    title={mod.title}
                    desc={mod.desc}
                    accent="gold"
                    onUnlock={() => setShowModal(true)}
                  />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2 PREVIEW ───────────────────────────────── */}
        <section className="bg-[#F9FAFB] px-4 py-14 border-y border-gray-200">
          <div className="max-w-6xl mx-auto">

            {/* Section header */}
            <FadeIn>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pl-4 border-l-4 border-gray-400">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded mb-2 uppercase tracking-wide">
                    Advanced
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Section 2: Advanced Acting Techniques
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">Unlocks after Section 1 is complete. Designed for those who want to act. One-time purchase fee.</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="shrink-0 px-6 py-2.5 bg-transparent text-gray-700 border border-gray-300 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-sm"
                >
                  Unlock Section 2 →
                </button>
              </div>
            </FadeIn>

            {/* Module cards grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {section2Modules.map((mod, i) => (
                <FadeIn key={mod.num} delay={i * 70}>
                  <LockedCard
                    num={mod.num}
                    title={mod.title}
                    desc={mod.desc}
                    accent="silver"
                    onUnlock={() => setShowModal(true)}
                  />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES PREVIEW STRIP ──────────────────────────── */}
        <section className="bg-white px-4 py-14">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">More Tools Included</h2>
                <p className="text-gray-500 text-sm">Everything you need to manage your career, all in one place</p>
              </div>
            </FadeIn>

            {/* Horizontal scroll on mobile, 3-col on desktop */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
              {[
                {
                  icon: '📋',
                  title: 'Work Log',
                  desc: 'Log every booking, production name, location, and pay rate. Track your career growth.',
                },
                {
                  icon: '🏆',
                  title: 'Certificates',
                  desc: 'Earn professional certificates for each completed module. Download and share anywhere.',
                },
                {
                  icon: '💰',
                  title: 'Referrals',
                  desc: 'Earn 20% commission on every friend you refer. Paid monthly via Interac e-Transfer.',
                },
              ].map((f, i) => (
                <FadeIn key={f.title} delay={i * 80} className="snap-start shrink-0 w-72 sm:w-auto">
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full h-full text-left bg-white rounded-2xl p-6 border border-gray-200 hover:border-amber-300 transition-all duration-200 group shadow-sm hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-3xl">{f.icon}</span>
                      <span className="text-amber-500/70 text-sm group-hover:text-amber-500 transition">🔒</span>
                    </div>
                    <h3 className="text-gray-900 font-bold mb-2">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{f.desc}</p>
                    <p className="text-xs text-gray-400 group-hover:text-amber-600 transition">
                      Sign up to access →
                    </p>
                  </button>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ──────────────────────────────────────── */}
        <section className="bg-[#F9FAFB] border-t border-gray-200 px-4 py-20">
          <FadeIn>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Ready to Begin?
              </h2>
              <p className="text-gray-500 text-lg mb-10 leading-relaxed">
                Join performers already advancing their careers with SetReady
              </p>

              <button
                onClick={() => setShowModal(true)}
                className="px-10 py-4 bg-amber-500 text-black font-bold text-lg rounded-xl hover:bg-amber-400 hover:scale-105 transition-all duration-200 shadow-md mb-4"
              >
                Create Free Account
              </button>
              <p className="text-gray-500 text-sm mb-10">Then subscribe from $9.99/month</p>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500 mb-8">
                {['Cancel Anytime', '30-Day Guarantee', 'Secure Payment'].map(b => (
                  <span key={b} className="flex items-center gap-1.5">
                    <span className="text-green-500 font-bold">✓</span> {b}
                  </span>
                ))}
              </div>

              {/* Agencies link */}
              <a
                href="/agencies"
                className="text-sm text-amber-600 hover:text-amber-700 font-medium transition"
              >
                🍁 Find Background Agencies in Canada →
              </a>
            </div>
          </FadeIn>
        </section>

      </div>{/* end pt-[52px] wrapper */}
    </div>
  );
}
