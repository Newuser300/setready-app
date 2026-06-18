'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Copyright from '@/components/Copyright';
import { createClient } from '@/utils/supabase/client'

type ReferralCommission = {
  id: string;
  commission_amount: number;
  sale_amount: number;
  status: string;
  created_at: string;
  referred_email: string;
};

type ReferralStats = {
  referralCode: string;
  totalReferrals: number;
  pendingCommission: number;
  totalEarned: number;
  commissions: ReferralCommission[];
};

export default function ReferralsPage() {
  const router = useRouter();

  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(true);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState('');
  const [copiedText, setCopiedText] = useState('');

  useEffect(() => {
    loadReferralStats();
  }, []);

  async function loadReferralStats() {
    setLoadingReferral(true);
    try {
      const browserClient = createClient()
      const { data: { user }, error } = await browserClient.auth.getUser()
      if (error || !user) { router.push('/auth/sign-in'); return; }
      const { data: { session } } = await browserClient.auth.getSession()
      const response = await fetch('/api/referral/stats', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReferralStats(data);
        if (data.referralCode) setReferralCode(data.referralCode);
      }
    } catch (error) {
      console.error('Failed to load referral stats:', error);
    } finally {
      setLoadingReferral(false);
    }
  }

  async function submitPayoutRequest() {
    if (!payoutEmail || !payoutAmount) {
      setPayoutMessage('Please fill in all fields.');
      return;
    }
    setPayoutLoading(true);
    setPayoutMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/referral/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ etransferEmail: payoutEmail, amount: parseFloat(payoutAmount), referralCode, note: payoutNote }),
      });
      const data = await response.json();
      if (response.ok) {
        setPayoutMessage(data.message);
        setShowPayoutForm(false);
        setPayoutEmail('');
        setPayoutAmount('');
        setPayoutNote('');
      } else {
        setPayoutMessage(data.error || 'Failed to submit request.');
      }
    } catch {
      setPayoutMessage('An error occurred. Please try again.');
    } finally {
      setPayoutLoading(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      setTimeout(() => setCopiedText(''), 2000);
    });
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>←</button>
        <span style={{ color: '#e5e7eb', fontWeight: '600', fontSize: '15px' }}>🤝 My Referrals</span>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px 60px' }}>

        {loadingReferral ? (
          <div className="text-center py-12 text-gray-400">Loading your referral info...</div>
        ) : !referralCode ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
            <div className="text-4xl mb-3">🤝</div>
            <p className="text-gray-500">Your referral code is being set up. Refresh the page in a moment.</p>
          </div>
        ) : (
          <>
            {/* Your Code */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Your Referral Code</h2>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="font-mono font-bold text-gray-900 tracking-widest text-xl bg-gray-100 px-4 py-2 rounded-xl">{referralCode}</span>
                <button onClick={() => copyToClipboard(referralCode, 'code')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">
                  {copiedText === 'code' ? '✓ Copied!' : 'Copy Code'}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">Your referral link:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded break-all">
                    {`https://www.setready.site/auth/sign-up?ref=${referralCode}`}
                  </code>
                  <button onClick={() => copyToClipboard(`https://www.setready.site/auth/sign-up?ref=${referralCode}`, 'link')}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
                    {copiedText === 'link' ? '✓ Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">How It Works</h2>
              <ol className="space-y-2 text-sm text-gray-600 list-none">
                <li className="flex items-start gap-2"><span className="font-bold text-blue-600 shrink-0">1.</span> Share your referral link with friends</li>
                <li className="flex items-start gap-2"><span className="font-bold text-blue-600 shrink-0">2.</span> They sign up and subscribe using your link</li>
                <li className="flex items-start gap-2"><span className="font-bold text-blue-600 shrink-0">3.</span> You earn 20% commission, paid monthly via e-transfer</li>
                <li className="flex items-start gap-2"><span className="font-bold text-blue-600 shrink-0">4.</span> Once you reach $10.00, request your payout below</li>
              </ol>
            </div>

            {/* Stats */}
            {referralStats && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-white rounded-xl p-4 border border-gray-200 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-800">{referralStats.totalReferrals}</p>
                    <p className="text-xs text-gray-500 mt-1">Referrals</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 text-center shadow-sm">
                    <p className="text-2xl font-bold text-orange-600">${referralStats.pendingCommission.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Pending</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 text-center shadow-sm">
                    <p className="text-2xl font-bold text-green-600">${referralStats.totalEarned.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Earned</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
                  <span className="text-lg mt-0.5">💰</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Minimum payout threshold: $10.00</p>
                    <p className="text-xs text-blue-700 mt-0.5">Commissions paid monthly via e-transfer. Reach $10.00 to request payout.</p>
                  </div>
                </div>

                {/* Commission history */}
                <div className="mb-5">
                  <h2 className="text-base font-bold text-gray-800 mb-3">Commission History</h2>
                  {referralStats.commissions.length === 0 ? (
                    <div className="bg-white rounded-xl p-6 text-center border border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm">No commissions yet. Share your link to start earning!</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Referred User</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Commission</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {referralStats.commissions.map((c) => (
                              <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-600">{new Date(c.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.referred_email}</td>
                                <td className="px-4 py-3 font-semibold text-green-700">${c.commission_amount.toFixed(2)}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payout request */}
                {!showPayoutForm ? (
                  <div>
                    <button
                      onClick={() => {
                        setPayoutAmount(referralStats.pendingCommission.toFixed(2));
                        setPayoutMessage('');
                        setShowPayoutForm(true);
                      }}
                      disabled={referralStats.pendingCommission < 10.00}
                      title={referralStats.pendingCommission < 10.00
                        ? `Minimum payout is $10.00. You have $${referralStats.pendingCommission.toFixed(2)} pending.`
                        : undefined}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      💸 Request E-Transfer Payout
                    </button>
                    {referralStats.pendingCommission < 10.00 && referralStats.pendingCommission > 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        Minimum payout is $10.00. You have ${referralStats.pendingCommission.toFixed(2)} pending.
                      </p>
                    )}
                    {payoutMessage && (
                      <p className="mt-3 text-sm text-green-700">{payoutMessage}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">Request E-Transfer Payout</h3>
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Referral Code</label>
                        <input type="text" value={referralCode} readOnly
                          className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono tracking-widest" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-Transfer Email</label>
                        <input type="email" value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)}
                          placeholder="your@bank-email.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                        <p className="text-xs text-gray-400 mt-1">Must be registered with your bank for Interac e-Transfer</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                        <input type="number" step="0.01" min="0.01" value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                        <textarea value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)}
                          placeholder="Any additional details..." rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
                      </div>
                    </div>
                    {payoutMessage && (
                      <p className={`text-sm mb-3 ${payoutMessage.includes('ubmitted') ? 'text-green-700' : 'text-red-600'}`}>
                        {payoutMessage}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button onClick={submitPayoutRequest} disabled={payoutLoading}
                        className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50">
                        {payoutLoading ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button onClick={() => { setShowPayoutForm(false); setPayoutMessage(''); setPayoutNote(''); }}
                        className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <Copyright />
      </div>
    </div>
  );
}
