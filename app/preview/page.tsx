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
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-amber-500 text-black rounded-xl hover:bg-amber-400 transition-all duration-200 font-semibold text-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* offset for fixed nav */}
      <div className="pt-[52px]">

        {/* ── HERO AREA ───────────────────────────────────────── */}
        <section className="bg-white border-b border-gray-200 px-4 py-14 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-50 text-amber-600 text-xs font-semibold mb-6">
                👁 Preview Mode — Explore the full curriculum
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-5 leading-tight max-w-3xl">
                SetReady
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
                  <p className="text-gray-500 text-sm mt-1">$9.99/month • Instant access to all 5 modules, quizzes, certificates, and all the tools you need to succeed.</p>
                </div>
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <p className="text-xs text-gray-400 italic text-center">Join performers across Canada who are showing up to set prepared and professional.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 hover:scale-105 transition-all duration-200 text-sm shadow-sm"
                  >
                    Unlock Full Access →
                  </button>
                </div>
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

        {/* ── SCENARIO SIMULATOR PREVIEW ──────────────────────── */}
        <section className="bg-white px-4 pb-10">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <button
                onClick={() => setShowModal(true)}
                className="group w-full text-left bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200 border-t-2 border-t-amber-500 hover:shadow-md hover:border-gray-300 transition-all duration-200 relative"
              >
                {/* Lock badge */}
                <span className="absolute top-4 right-4 text-base text-gray-400">🔒</span>

                {/* Header */}
                <div className="mb-4">
                  <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md mb-3 bg-amber-50 text-amber-600">
                    Bonus Tool
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 pr-8 mb-2">
                    🎭 Set Etiquette Scenario Simulator
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xl">
                    Test your on-set knowledge with real scenarios. Learn how to handle tricky situations like a professional.
                  </p>
                </div>

                {/* Example scenarios */}
                <div className="space-y-2 mb-5">
                  {[
                    'What do you do when you can\'t hear the director?',
                    'How do you handle a phone going off on set?',
                    'What\'s the correct way to approach a lead actor?',
                  ].map((q) => (
                    <div key={q} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-amber-500 shrink-0 mt-0.5">→</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-medium text-amber-600">🔒 Sign up to access</p>
              </button>
            </FadeIn>
          </div>
        </section>

        {/* ── SECTION 2 PREVIEW ───────────────────────────────── */}
        <section className="bg-[#F9FAFB] px-4 py-14 border-y border-gray-200">
          <div className="max-w-6xl mx-auto">

            {/* Section header */}
            <FadeIn>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pl-4 border-l-4 border-gray-400">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded uppercase tracking-wide">
                      Advanced
                    </div>
                    <div className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-400 text-xs font-semibold rounded border border-gray-200 uppercase tracking-wide">
                      Optional
                    </div>
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
                <h2 className="text-xl font-bold text-gray-900 mb-1">More Than a Course — A Complete Career Platform</h2>
                <p className="text-gray-500 text-sm">Every tool a working background performer actually needs. All included.</p>
              </div>
            </FadeIn>

            {/* 3-col grid on desktop, horizontal scroll on mobile */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
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
                  title: 'Discover What\'s Filming',
                  desc: 'Direct link to the UBCP/ACTRA production list — see every active production currently filming in BC.',
                },
                {
                  icon: '🤝',
                  title: 'Find an Agent',
                  desc: 'Browse our directory of background performer agencies across Canada organized by city and province.',
                },
              ].map((f, i) => (
                <FadeIn key={f.title} delay={i * 60} className="snap-start shrink-0 w-72 sm:w-auto">
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
              <p className="text-gray-500 text-sm mb-10">Subscribe for $9.99/month.</p>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500 mb-8">
                {['Instant Access', 'Secure Payment'].map(b => (
                  <span key={b} className="flex items-center gap-1.5">
                    <span className="text-green-500 font-bold">✓</span> {b}
                  </span>
                ))}
              </div>

            </div>
          </FadeIn>
        </section>

      </div>{/* end pt-[52px] wrapper */}
    </div>
  );
}
