'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type PayoutRequest = {
  id: string;
  user_id: string;
  user_email: string;
  referral_code: string;
  etransfer_email: string;
  amount: number;
  status: string;
  requested_at: string;
};

type Commission = {
  id: string;
  referrer_email: string;
  referred_email: string;
  sale_amount: number;
  commission_amount: number;
  status: string;
  commission_payable_after: string | null;
  created_at: string;
};

type Summary = {
  pendingCount: number;
  pendingAmount: number;
  monthlyAmount: number;
  totalPaid: number;
  activeReferrers: number;
};

export default function AdminReferralsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState('');
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Assign referral code to user
  const [assignEmail, setAssignEmail] = useState('');
  const [assignCode, setAssignCode] = useState('');
  const [assignConfirming, setAssignConfirming] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');
  const [assignError, setAssignError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const browserClient = createClient()
    const { data: { user }, error } = await browserClient.auth.getUser()
    if (error || !user) { router.push('/auth/sign-in'); return; }
    const { data: { session } } = await browserClient.auth.getSession()

    setAccessToken(session?.access_token ?? '');

    const response = await fetch('/api/admin/referrals', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (response.status === 403) {
      router.push('/dashboard');
      return;
    }

    if (!response.ok) {
      toast.error('Failed to load referral data');
      setLoading(false);
      return;
    }

    const data = await response.json();
    setPayoutRequests(data.payoutRequests || []);
    setCommissions(data.commissions || []);
    setSummary(data.summary || null);
    setLoading(false);
  }

  async function markAsPaid(payoutRequestId: string) {
    setMarkingPaid(payoutRequestId);
    try {
      const response = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ payoutRequestId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to mark as paid');
        return;
      }

      toast.success('Payment marked as complete');

      // Remove from pending list and refresh summary
      setPayoutRequests(prev => prev.filter(r => r.id !== payoutRequestId));
      setCommissions(prev =>
        prev.map(c =>
          c.status === 'pending' ? { ...c, status: 'paid' } : c
        )
      );
      setSummary(prev => prev ? {
        ...prev,
        pendingCount: Math.max(0, prev.pendingCount - 1),
        pendingAmount: Math.max(0, prev.pendingAmount - (payoutRequests.find(r => r.id === payoutRequestId)?.amount || 0)),
      } : prev);
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setMarkingPaid(null);
    }
  }

  async function submitAssignReferral() {
    setAssignSubmitting(true);
    setAssignError('');
    setAssignMessage('');
    try {
      const res = await fetch('/api/admin/assign-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userEmail: assignEmail.trim(), referralCode: assignCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignMessage(data.message || 'Referral code applied successfully.');
        setAssignEmail('');
        setAssignCode('');
        setAssignConfirming(false);
      } else {
        setAssignError(data.error || 'Failed to assign code.');
        setAssignConfirming(false);
      }
    } catch {
      setAssignError('An error occurred. Please try again.');
      setAssignConfirming(false);
    } finally {
      setAssignSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading referral data...</p>
        </div>
      </div>
    );
  }

  const pendingPayouts = payoutRequests.filter(r => r.status === 'pending');
  const paidPayouts = payoutRequests.filter(r => r.status === 'paid');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm mb-1">Admin Panel</p>
              <h1 className="text-2xl font-bold">SetReady Admin — Referral Payouts</h1>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* PAYOUT POLICY NOTICE */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">📋</span>
          <div>
            <p className="font-semibold text-amber-900 mb-1">Payout Policy Reminder</p>
            <ul className="text-sm text-amber-800 space-y-0.5 list-disc pl-4">
              <li>Minimum payout threshold is <strong>$10.00 CAD</strong> — do not process requests below this amount</li>
              <li>Verify the referral commission balance matches the requested amount before sending</li>
              <li>Payments are sent via Interac e-Transfer to the email shown in the request</li>
              <li>Commission is only valid on successful, non-refunded transactions</li>
            </ul>
          </div>
        </div>

        {/* SECTION A — Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Pending Requests</p>
              <p className="text-3xl font-bold text-gray-800">{summary.pendingCount}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Owed This Month</p>
              <p className="text-3xl font-bold text-orange-600">${summary.monthlyAmount.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Paid Out</p>
              <p className="text-3xl font-bold text-green-600">${summary.totalPaid.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Active Referrers</p>
              <p className="text-3xl font-bold text-blue-600">{summary.activeReferrers}</p>
            </div>
          </div>
        )}

        {/* SECTION B — Pending Payout Requests */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Pending Payout Requests</h2>
              <p className="text-sm text-gray-500">{pendingPayouts.length} request{pendingPayouts.length !== 1 ? 's' : ''} awaiting payment</p>
            </div>
            {summary && summary.pendingAmount > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Total owed</p>
                <p className="text-xl font-bold text-orange-600">${summary.pendingAmount.toFixed(2)}</p>
              </div>
            )}
          </div>

          {pendingPayouts.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-500">No pending payout requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">User Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Referral Code</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Amount Owed</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">E-Transfer Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Requested</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pendingPayouts.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800 font-medium">{req.user_email}</td>
                      <td className="px-4 py-3">
                        <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono font-bold">
                          {req.referral_code}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">${req.amount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{req.etransfer_email}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(req.requested_at).toLocaleDateString('en-CA', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => markAsPaid(req.id)}
                          disabled={markingPaid === req.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {markingPaid === req.id ? 'Processing...' : '✓ Mark as Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recently Paid (collapsed view) */}
        {paidPayouts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Completed Payouts</h2>
              <p className="text-sm text-gray-500">{paidPayouts.length} paid • ${summary?.totalPaid.toFixed(2)} total</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">User Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Referral Code</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">E-Transfer Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Requested</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paidPayouts.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 opacity-75">
                      <td className="px-4 py-3 text-gray-700">{req.user_email}</td>
                      <td className="px-4 py-3">
                        <code className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                          {req.referral_code}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">${req.amount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500">{req.etransfer_email}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(req.requested_at).toLocaleDateString('en-CA', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Paid</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION C — All Referral Commissions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">All Referral Commissions</h2>
            <p className="text-sm text-gray-500">{commissions.length} commission record{commissions.length !== 1 ? 's' : ''}</p>
          </div>

          {commissions.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-500">No commissions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Referrer Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Referred User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Sale Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Commission (20%)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('en-CA', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{c.referrer_email}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.referred_email}</td>
                      <td className="px-4 py-3 text-gray-700">${c.sale_amount?.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">${c.commission_amount?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          c.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : c.status === 'pending_30_days'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {c.status === 'pending_30_days' ? 'pending (30-day hold)' : c.status}
                        </span>
                        {c.status === 'pending_30_days' && c.commission_payable_after && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            payable {new Date(c.commission_payable_after).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION D — Assign Referral Code to User */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Assign Referral Code to User</h2>
            <p className="text-sm text-gray-500">Manually apply a referral code to a user who missed it at signup.</p>
          </div>
          <div className="px-6 py-6 space-y-4">
            {assignMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">{assignMessage}</div>
            )}
            {assignError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{assignError}</div>
            )}
            {!assignConfirming ? (
              <form
                onSubmit={(e) => { e.preventDefault(); setAssignError(''); setAssignMessage(''); setAssignConfirming(true); }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">User Email</label>
                  <input
                    type="email"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Referral Code</label>
                  <input
                    type="text"
                    value={assignCode}
                    onChange={(e) => setAssignCode(e.target.value.toUpperCase())}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest uppercase"
                    placeholder="ABC12345"
                    maxLength={20}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!assignEmail.trim() || !assignCode.trim()}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Apply Code →
                </button>
              </form>
            ) : (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-5">
                <p className="font-semibold text-amber-900 mb-3">⚠️ Confirm Assignment</p>
                <p className="text-sm text-amber-800 mb-1">You are about to apply the following referral code:</p>
                <div className="bg-white border border-amber-200 rounded-lg p-3 my-3 space-y-1 text-sm">
                  <p><span className="font-semibold text-gray-600">User email:</span> <span className="text-gray-900">{assignEmail}</span></p>
                  <p><span className="font-semibold text-gray-600">Referral code:</span> <code className="font-mono font-bold text-blue-700">{assignCode}</code></p>
                </div>
                <p className="text-xs text-amber-700 mb-4">This cannot be undone. The user will be permanently linked to this referrer.</p>
                <div className="flex gap-3">
                  <button
                    onClick={submitAssignReferral}
                    disabled={assignSubmitting}
                    className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {assignSubmitting ? 'Saving…' : '✓ Confirm and Apply'}
                  </button>
                  <button
                    onClick={() => setAssignConfirming(false)}
                    disabled={assignSubmitting}
                    className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-4">
          SetReady Admin • Referral Payouts • Data refreshes on page load
        </div>
      </div>
    </div>
  );
}
