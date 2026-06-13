import Link from 'next/link';
import Copyright from '@/components/Copyright';

export default function ClothingGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👔</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">What to Wear on Set</h1>
              <p className="text-xs text-gray-500">Background Performer Clothing Guide</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 font-medium transition"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">

        {/* ══════════════════════════════════════
            SECTION 1 — THE GOLDEN RULES
        ══════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">The Golden Rules</h2>
          <p className="text-gray-500 text-sm mb-5">These four rules are non-negotiable on every set.</p>

          <div className="space-y-3">

            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🚫</span>
                <div>
                  <p className="font-extrabold text-red-800 text-base uppercase tracking-wide">No Logos or Brand Names</p>
                  <p className="text-red-700 text-sm mt-1 leading-relaxed">
                    Cameras pick up trademarks. Productions cannot air visible brand names. Check every
                    item — including hats, bags, and shoes.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🚫</span>
                <div>
                  <p className="font-extrabold text-red-800 text-base uppercase tracking-wide">No Bright White</p>
                  <p className="text-red-700 text-sm mt-1 leading-relaxed">
                    White reflects camera light and causes exposure problems. Off-white or cream is
                    usually acceptable.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🚫</span>
                <div>
                  <p className="font-extrabold text-red-800 text-base uppercase tracking-wide">No Neon or Fluorescent Colours</p>
                  <p className="text-red-700 text-sm mt-1 leading-relaxed">
                    These bleed on camera and distract from the scene.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🚫</span>
                <div>
                  <p className="font-extrabold text-red-800 text-base uppercase tracking-wide">No Stripes or Tight Patterns</p>
                  <p className="text-red-700 text-sm mt-1 leading-relaxed">
                    Stripes, small checks, and herringbone create a moiré effect — a visual vibration on
                    screen. Avoid any tight repeating pattern.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 2 — WHAT TO WEAR
        ══════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">What TO Wear</h2>
          <p className="text-gray-500 text-sm mb-5">Follow these guidelines and you will rarely have issues with wardrobe.</p>

          <div className="space-y-3">

            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <p className="font-extrabold text-green-800 text-base uppercase tracking-wide">Neutral Colours Work Best</p>
                  <p className="text-green-700 text-sm mt-1 leading-relaxed">
                    Grey, navy, brown, tan, burgundy, forest green, and earth tones all photograph well
                    and blend naturally into most scenes.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <p className="font-extrabold text-green-800 text-base uppercase tracking-wide">Bring Multiple Options</p>
                  <p className="text-green-700 text-sm mt-1 leading-relaxed">
                    Always bring at least 2–3 outfit options. Wardrobe may reject your first choice and
                    having backups prevents delays.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <p className="font-extrabold text-green-800 text-base uppercase tracking-wide">Dress for the Scene Type</p>
                  <div className="text-green-700 text-sm mt-1 space-y-0.5">
                    <p><span className="font-semibold">Office scene:</span> business casual</p>
                    <p><span className="font-semibold">Street scene:</span> casual everyday clothes</p>
                    <p><span className="font-semibold">Restaurant scene:</span> smart casual</p>
                    <p><span className="font-semibold">Period production:</span> ask your agent — wardrobe usually provides period clothing</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <p className="font-extrabold text-green-800 text-base uppercase tracking-wide">Comfortable Shoes Are Essential</p>
                  <p className="text-green-700 text-sm mt-1 leading-relaxed">
                    You may stand for 10–12 hours. Wear broken-in shoes only. <strong>Never wear new shoes on a shoot day.</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <p className="font-extrabold text-green-800 text-base uppercase tracking-wide">Bring Layers</p>
                  <p className="text-green-700 text-sm mt-1 leading-relaxed">
                    Sets can be extremely cold (heavy lighting equipment creates drafts) or very warm.
                    Dress in layers you can add or remove.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 3 — BUILD YOUR WARDROBE KIT
        ══════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Build Your Wardrobe Kit</h2>
          <p className="text-gray-500 text-sm mb-5">
            Experienced background performers keep a dedicated bag ready at all times.
          </p>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <ul className="space-y-3">
              {[
                { text: '2–3 neutral shirts or blouses', note: 'no logos, no patterns' },
                { text: '1–2 pairs of neutral trousers or skirts', note: null },
                { text: 'A blazer or smart jacket', note: null },
                { text: 'Comfortable broken-in dress shoes', note: null },
                { text: 'Comfortable broken-in casual shoes', note: null },
                { text: 'A watch', note: 'analogue looks better on camera' },
                { text: 'Simple jewellery', note: 'avoid anything flashy' },
                { text: 'Layers', note: 'cardigan, light jacket' },
                { text: 'Extra socks', note: null },
                { text: "Your outfit from the previous day", note: 'for continuity on multi-day bookings' },
              ].map(({ text, note }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="w-5 h-5 border-2 border-gray-300 rounded shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">
                    {text}
                    {note && <span className="text-gray-400 italic"> ({note})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 4 — PERIOD PRODUCTIONS
        ══════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Period Productions</h2>
          <p className="text-gray-500 text-sm mb-5">
            If you are booked for a period production (set in a different era) wardrobe will usually
            provide your costume. If asked to bring your own:
          </p>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-2.5">
            {[
              { ok: false, text: 'No modern synthetic fabrics' },
              { ok: false, text: 'No modern athletic or running shoes' },
              { ok: false, text: 'No visible modern branding' },
              { ok: true,  text: 'Ask your agent for specific guidance' },
              { ok: true,  text: 'When in doubt, wardrobe department will have options available' },
            ].map(({ ok, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span className={`font-bold shrink-0 mt-px ${ok ? 'text-green-600' : 'text-red-500'}`}>
                  {ok ? '✅' : '❌'}
                </span>
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 5 — IF WARDROBE REJECTS YOUR OUTFIT
        ══════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">If Wardrobe Rejects Your Outfit</h2>
          <p className="text-gray-500 text-sm mb-5">
            Stay calm. This happens to experienced performers too.
          </p>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            {[
              'Do not take it personally.',
              'Wardrobe may have a replacement available.',
              'You may sit out one shot while they find a solution.',
              'For next time: ask your agent for a detailed wardrobe brief before arriving.',
              'Bring more options than you think you need.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 pt-1">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 6 — QUICK REFERENCE CARD
        ══════════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Quick Reference Card</h2>
          <p className="text-gray-500 text-sm mb-5">Screenshot this and save it to your phone.</p>

          <div className="bg-white rounded-2xl border-2 border-gray-800 shadow-lg overflow-hidden">
            <div className="bg-gray-800 px-6 py-4 text-center">
              <p className="text-white font-extrabold text-lg tracking-wide uppercase">Quick Wardrobe Checklist</p>
              <p className="text-gray-300 text-sm mt-0.5">Before You Leave Home</p>
            </div>
            <div className="px-6 py-6">
              <ul className="space-y-3">
                {[
                  'No logos visible?',
                  'No white or neon?',
                  'No stripes or tight patterns?',
                  'Comfortable shoes (broken in)?',
                  'Multiple options packed?',
                  'Layers included?',
                  "Previous day's outfit (if multi-day)?",
                ].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-5 h-5 border-2 border-gray-800 rounded shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400 font-medium tracking-wide">SetReady · setready.site</p>
              </div>
            </div>
          </div>
        </section>

      </div>
      <Copyright />
    </div>
  );
}
