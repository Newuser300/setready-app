'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Copyright from '@/components/Copyright';
import { PROVINCES, PROVINCE_LIST } from '@/lib/provinces';

const UNION_RATES = {
  'General Background Performer': { daily: 270.30, hourly: 33.79, ot1: 50.69, ot2: 67.58 },
  'Stand-in':                      { daily: 293.86, hourly: 36.73, ot1: 55.10, ot2: 73.46 },
  'Special Ability Background Performer': { daily: 362.75, hourly: 45.34, ot1: 68.01, ot2: 90.68 },
  'Photo Double':                  { daily: 270.30, hourly: 33.79, ot1: 50.69, ot2: 67.58 },
} as const;

type RoleKey = keyof typeof UNION_RATES;
const ROLE_KEYS = Object.keys(UNION_RATES) as RoleKey[];

const fmt = (n: number) => `$${n.toFixed(2)}`;

export default function RateCalculator() {
  const [isUnion, setIsUnion]         = useState(true);
  const [role, setRole]               = useState<RoleKey>('General Background Performer');
  // Hours Worked is held as the raw typed string so the field stays freely editable
  // (it can be cleared and retyped). The numeric value used for the math is derived below.
  const [hoursInput, setHoursInput]   = useState('8');
  const [useCustom, setUseCustom]     = useState(false);
  const [customRate, setCustomRate]   = useState('');
  const [province, setProvince]       = useState('BC');

  // Numeric hours for calculations only — clamped to a sane 1–24 range. The input itself
  // keeps the raw string, so typing no longer snaps the field to 24 or refuses input.
  const hours = Math.min(24, Math.max(1, parseInt(hoursInput, 10) || 0));

  useEffect(() => { localStorage.setItem('sr-rate-calc-visited', '1') }, [])

  const provinceInfo = PROVINCES[province] || PROVINCES['BC'];

  const calc = useMemo(() => {
    const hrs = Math.max(1, hours);

    const baseHours = Math.min(hrs, 8);
    const ot1h      = Math.min(Math.max(hrs - 8, 0), 4);
    const ot2h      = Math.max(hrs - 12, 0);

    const prov = PROVINCES[province] || PROVINCES['BC'];
    const nonUnionHourly = prov.nonUnionMin;

    let hourlyRate: number, dailyRate: number | null, ot1Rate: number, ot2Rate: number;

    if (useCustom) {
      const cr = parseFloat(customRate);
      if (isNaN(cr) || cr <= 0) return null;
      hourlyRate = cr; dailyRate = null; ot1Rate = cr * 1.5; ot2Rate = cr * 2;
    } else if (isUnion) {
      const r = UNION_RATES[role];
      hourlyRate = r.hourly; dailyRate = r.daily; ot1Rate = r.ot1; ot2Rate = r.ot2;
    } else {
      hourlyRate = nonUnionHourly;
      dailyRate = baseHours >= 8 ? prov.minCallPay : null;
      ot1Rate = nonUnionHourly * 1.5;
      ot2Rate = nonUnionHourly * 2;
    }

    const basePay = (dailyRate && baseHours >= 8) ? dailyRate : hourlyRate * baseHours;
    const ot1Pay  = ot1h * ot1Rate;
    const ot2Pay  = ot2h * ot2Rate;
    const dayTotal = basePay + ot1Pay + ot2Pay;

    return { isUnion, baseHours, basePay, ot1h, ot1Rate, ot1Pay, ot2h, ot2Rate, ot2Pay, dayTotal };
  }, [isUnion, role, hours, useCustom, customRate, province]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="font-bold text-gray-900">BC Rate Calculator</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition">← Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">UBCP/ACTRA Rate Calculator</h1>
          <p className="text-sm text-gray-500">Official 2025–2028 rates, effective March 29, 2026. For BC productions.</p>
        </div>

        {/* Union toggle */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Performer Type</p>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setIsUnion(true)}
              className={`flex-1 py-3 font-bold text-sm transition ${isUnion ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              🎭 Union (UBCP/ACTRA)
            </button>
            <button
              onClick={() => setIsUnion(false)}
              className={`flex-1 py-3 font-bold text-sm transition ${!isUnion ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Non-Union
            </button>
          </div>
        </div>

        {/* Role selector — union only, and not custom rate */}
        {isUnion && !useCustom && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Role Type</p>
            <div className="space-y-2">
              {ROLE_KEYS.map(r => {
                const rate = UNION_RATES[r];
                const active = role === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`font-semibold text-sm ${active ? 'text-blue-900' : 'text-gray-700'}`}>{r}</span>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-gray-800">{fmt(rate.daily)}<span className="text-xs font-normal text-gray-400">/day</span></span>
                      </div>
                    </div>
                    <div className={`text-xs mt-1 space-x-3 ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                      <span>{fmt(rate.hourly)}/hr</span>
                      <span>OT 1.5× {fmt(rate.ot1)}</span>
                      <span>OT 2× {fmt(rate.ot2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Province selector — non-union only */}
        {!isUnion && !useCustom && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Your Province</p>
            <select
              value={province}
              onChange={e => setProvince(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {PROVINCE_LIST.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Non-union rate info */}
        {!isUnion && !useCustom && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              {province === 'BC' ? 'BC Minimum Wage' : province === 'ON' ? 'Non-Union Rate' : 'Provincial Minimum Wage'}
            </p>
            <p className="text-2xl font-bold text-gray-900">{fmt(provinceInfo.nonUnionMin)}<span className="text-sm font-normal text-gray-500">/hour</span></p>
            <p className="text-xs text-gray-400 mt-1">{provinceInfo.rateNote}</p>
            {provinceInfo.minCallPay > 0 && (
              <p className="text-xs text-gray-500 mt-2">8-hour minimum call: <span className="font-semibold">{fmt(provinceInfo.minCallPay)}</span></p>
            )}
            {province !== 'BC' && province !== 'ON' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                ⚠️ Rates outside BC and Ontario vary. Always verify the current minimum wage for your province before accepting a booking.
              </p>
            )}
          </div>
        )}

        {/* Work details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Work Details</p>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hours Worked</label>
            <input
              type="number" min={1} max={24} value={hoursInput}
              onChange={e => setHoursInput(e.target.value)}
              onBlur={() => setHoursInput(String(Math.min(24, Math.max(1, parseInt(hoursInput, 10) || 8))))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          {hours > 8 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800 mb-4">
              ⏱️ Overtime applies:
              {Math.min(hours - 8, 4) > 0 && <span className="ml-1">{Math.min(hours - 8, 4)} hr{Math.min(hours - 8, 4) !== 1 ? 's' : ''} at 1.5×</span>}
              {hours > 12 && <span className="ml-2">{hours - 12} hr{hours - 12 !== 1 ? 's' : ''} at 2×</span>}
            </div>
          )}

          {/* Custom rate */}
          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
              />
              <span className="text-sm font-medium text-gray-700">My rate is different</span>
            </label>
            {useCustom && (
              <div className="mt-3 space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Your Hourly Rate ($)</label>
                <input
                  type="number" step="0.01" min="0" value={customRate}
                  onChange={e => setCustomRate(e.target.value)}
                  placeholder="e.g. 33.79"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <p className="text-xs text-gray-400">Use this if your production agreed to a different rate. Overtime is calculated at 1.5× and 2×.</p>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {calc ? (
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-900 px-6 py-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Pay Breakdown</p>
              <p className="font-bold text-white text-lg leading-snug">
                {useCustom
                  ? `Custom Rate — ${fmt(parseFloat(customRate) || 0)}/hr`
                  : calc.isUnion ? role : 'Non-Union'
                }
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {calc.isUnion && !useCustom ? 'UBCP/ACTRA — March 29, 2026' : useCustom ? 'Custom hourly rate' : provinceInfo.rateNote}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Per-day breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Base ({calc.baseHours} hr{calc.baseHours !== 1 ? 's' : ''}{calc.isUnion && !useCustom && calc.baseHours >= 8 ? ' — daily rate' : ''})
                  </span>
                  <span className="font-medium text-gray-900">{fmt(calc.basePay)}</span>
                </div>
                {calc.ot1h > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">OT 1.5× ({calc.ot1h}h @ {fmt(calc.ot1Rate)}/hr)</span>
                    <span className="font-medium text-orange-700">{fmt(calc.ot1Pay)}</span>
                  </div>
                )}
                {calc.ot2h > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">OT 2× ({calc.ot2h}h @ {fmt(calc.ot2Rate)}/hr)</span>
                    <span className="font-medium text-red-700">{fmt(calc.ot2Pay)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="bg-gray-900 rounded-xl p-4 flex justify-between items-center">
                <span className="text-white font-semibold">Gross Pay (1 day)</span>
                <span className="text-2xl font-bold text-amber-400">{fmt(calc.dayTotal)}</span>
              </div>

              {/* Agent fee breakdown */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-800 mb-2">💼 If represented by an agent:</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>10% agent fee ({fmt(calc.dayTotal * 0.10)} deducted)</span>
                    <span className="font-bold">Net: {fmt(calc.dayTotal * 0.90)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>15% agent fee ({fmt(calc.dayTotal * 0.15)} deducted)</span>
                    <span className="font-bold">Net: {fmt(calc.dayTotal * 0.85)}</span>
                  </div>
                  {calc.isUnion && !useCustom && (
                    <div className="flex justify-between text-xs text-blue-700 border-t border-blue-200 pt-1.5 mt-1">
                      <span>2.25% working dues ({fmt(calc.dayTotal * 0.0225)} deducted)</span>
                      <span className="font-bold">Net: {fmt(calc.dayTotal * 0.9775)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Agent fee note */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-700 mb-1.5">ℹ️ Agent &amp; Union Fees</p>
                <ul className="text-xs text-gray-500 space-y-0.5 ml-3 list-disc">
                  <li>Most agents charge 10–15% of your gross earnings as commission.</li>
                  <li>Full UBCP/ACTRA members pay 2.25% working dues on each job.</li>
                  <li>Permit members pay a permit fee — check with your union for current rates.</li>
                </ul>
              </div>

              {/* Source */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  📄 Rates sourced from the official 2025–2028 UBCP/ACTRA BC Master Production Agreement, effective March 29, 2026. Always verify current rates at{' '}
                  <a href="https://ubcpactra.ca/agreements/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    ubcpactra.ca/agreements/
                  </a>
                </p>
              </div>
            </div>
          </div>
        ) : (
          useCustom && (
            <div className="bg-gray-100 rounded-2xl p-6 text-center text-gray-500 text-sm">
              Enter a valid hourly rate above to see your breakdown.
            </div>
          )
        )}

        {/* Why go union? — non-union only */}
        {!isUnion && !useCustom && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
            <p className="text-sm font-bold text-amber-900 mb-1">💡 Why go union?</p>
            <p className="text-xs text-amber-800 leading-relaxed mb-3">
              Union performers earn significantly more. A UBCP/ACTRA General Background Performer earns{' '}
              <strong>{fmt(UNION_RATES['General Background Performer'].daily)}/day</strong> — vs{' '}
              <strong>{fmt(provinceInfo.minCallPay)}/day</strong> non-union in {provinceInfo.name}. That's{' '}
              <strong>{fmt(UNION_RATES['General Background Performer'].daily - provinceInfo.minCallPay)} more per day</strong>, plus
              health and retirement benefits.
            </p>
            <Link
              href="/voucher-wallet"
              className="inline-block text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 transition px-4 py-2 rounded-lg"
            >
              Track your vouchers toward union membership →
            </Link>
          </div>
        )}

        <Copyright />
      </div>
    </div>
  );
}
