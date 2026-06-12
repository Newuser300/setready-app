'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

type Stats = {
  totalUsers: number;
  activeSubscribers: number;
  section2Purchases: number;
  totalCertificates: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
};

type RecentUser = {
  id: string;
  email: string;
  name: string | null;
  subscription_status: string | null;
  section2_unlocked: boolean;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
};

type ModuleStat = {
  moduleNumber: number;
  title: string;
  completions: number;
  avgScore: number;
  certificates: number;
};

type SystemInfo = {
  stripeMode: string;
  vercelEnv: string;
};

type AdminRecord = {
  id: string;
  email: string;
  added_by: string;
  added_at: string;
};

type NavSection = 'overview' | 'users' | 'referrals' | 'certificates' | 'tools' | 'admins';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleStat[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('overview');

  // Email download / copy
  const [allEmails, setAllEmails] = useState<string[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);

  // Admin management
  const [envAdmins, setEnvAdmins] = useState<string[]>([]);
  const [dbAdmins, setDbAdmins] = useState<AdminRecord[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [adminMgmtMessage, setAdminMgmtMessage] = useState('');
  const [adminMgmtError, setAdminMgmtError] = useState('');
  const [confirmNewAdmin, setConfirmNewAdmin] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Backfill modal
  const [showBackfill, setShowBackfill] = useState(false);
  const [backfillEmail, setBackfillEmail] = useState('');
  const [backfillLoading, setBackfillLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [backfillUserInfo, setBackfillUserInfo] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [backfillResults, setBackfillResults] = useState<any>(null);
  const [backfillError, setBackfillError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { router.push('/auth/sign-in'); return; }
    setAccessToken(session.access_token);

    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 403) { router.push('/dashboard'); return; }
    if (!res.ok) { setError('Failed to load admin data.'); setLoading(false); return; }

    const data = await res.json();
    setStats(data.stats);
    setRecentUsers(data.recentUsers || []);
    setModuleStats(data.moduleStats || []);
    setSystemInfo(data.systemInfo);
    setLoading(false);
  }

  // ── Email helpers ──────────────────────────────────────────────────────────

  async function fetchAllEmails(token: string): Promise<string[]> {
    if (allEmails.length > 0) return allEmails;
    setEmailsLoading(true);
    try {
      const res = await fetch('/api/admin/emails', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const emails: string[] = data.emails || [];
      setAllEmails(emails);
      return emails;
    } finally {
      setEmailsLoading(false);
    }
  }

  async function downloadEmails() {
    const emails = await fetchAllEmails(accessToken);
    if (!emails.length) { toast.error('No emails found.'); return; }
    const blob = new Blob([emails.join(',\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `setready-emails-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${emails.length} emails`);
  }

  async function copyEmails() {
    const emails = await fetchAllEmails(accessToken);
    if (!emails.length) { toast.error('No emails found.'); return; }
    await navigator.clipboard.writeText(emails.join(', '));
    toast.success(`Copied ${emails.length} emails to clipboard`);
  }

  // ── Admin management helpers ───────────────────────────────────────────────

  async function loadAdmins() {
    setAdminsLoading(true);
    setAdminMgmtMessage('');
    setAdminMgmtError('');
    try {
      const res = await fetch('/api/admin/manage-admins', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) { setAdminMgmtError(data.error || 'Failed to load admins.'); return; }
      setEnvAdmins(data.envAdmins || []);
      setDbAdmins(data.dbAdmins || []);
    } finally {
      setAdminsLoading(false);
    }
  }

  async function addAdmin() {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    setAdminMgmtMessage('');
    setAdminMgmtError('');
    try {
      const res = await fetch('/api/admin/manage-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email: newAdminEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAdminMgmtError(data.error || 'Failed to add admin.'); return; }
      setAdminMgmtMessage(`${newAdminEmail.trim()} added as admin.`);
      setNewAdminEmail('');
      setConfirmNewAdmin(false);
      await loadAdmins();
    } finally {
      setAddingAdmin(false);
    }
  }

  async function removeAdmin(id: string) {
    setRemovingAdminId(id);
    setAdminMgmtMessage('');
    setAdminMgmtError('');
    try {
      const res = await fetch(`/api/admin/manage-admins?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) { setAdminMgmtError(data.error || 'Failed to remove admin.'); return; }
      setAdminMgmtMessage('Admin removed.');
      setConfirmRemoveId(null);
      await loadAdmins();
    } finally {
      setRemovingAdminId(null);
    }
  }

  // ── Backfill helpers ───────────────────────────────────────────────────────

  function openBackfill() {
    setShowBackfill(true);
    setBackfillEmail('');
    setBackfillUserInfo(null);
    setBackfillResults(null);
    setBackfillError('');
  }

  function closeBackfill() {
    setShowBackfill(false);
    setBackfillEmail('');
    setBackfillUserInfo(null);
    setBackfillResults(null);
    setBackfillError('');
  }

  async function findBackfillUser() {
    if (!backfillEmail.trim()) return;
    setBackfillLoading(true);
    setBackfillError('');
    setBackfillUserInfo(null);
    setBackfillResults(null);
    const res = await fetch(`/api/admin/backfill-certificates?email=${encodeURIComponent(backfillEmail.trim())}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) setBackfillError(data.error || 'User not found.');
    else setBackfillUserInfo(data);
    setBackfillLoading(false);
  }

  async function runBackfill() {
    if (!backfillUserInfo?.userId) return;
    setBackfillLoading(true);
    setBackfillError('');
    const res = await fetch('/api/admin/backfill-certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ userId: backfillUserInfo.userId }),
    });
    const data = await res.json();
    if (!res.ok) setBackfillError(data.error || 'Backfill failed.');
    else setBackfillResults(data);
    setBackfillLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <Link href="/dashboard" className="text-blue-600 underline text-sm">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const navItems: { key: NavSection; label: string; icon: string }[] = [
    { key: 'overview',     label: 'Overview',     icon: '📊' },
    { key: 'users',        label: 'Users',         icon: '👥' },
    { key: 'referrals',    label: 'Referrals',     icon: '💰' },
    { key: 'certificates', label: 'Certificates',  icon: '🏆' },
    { key: 'tools',        label: 'Tools',         icon: '🔧' },
    { key: 'admins',       label: 'Admins',        icon: '🔐' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">SetReady</p>
              <h1 className="text-lg font-bold leading-tight">Admin Panel</h1>
            </div>
          </div>
          <Link href="/dashboard" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">
            ← Dashboard
          </Link>
        </div>

        {/* ── Nav tabs ── */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-t border-white/10 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => {
                setActiveSection(item.key);
                if (item.key === 'admins' && envAdmins.length === 0 && dbAdmins.length === 0) {
                  loadAdmins();
                }
              }}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                activeSection === item.key
                  ? 'border-blue-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="mr-1.5">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ══════════════════════════════════════
            OVERVIEW
        ══════════════════════════════════════ */}
        {activeSection === 'overview' && stats && (
          <div className="space-y-8">

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: '👥', label: 'Total Users',             value: stats.totalUsers,                            color: 'text-blue-600' },
                { icon: '✅', label: 'Active Subscribers',      value: stats.activeSubscribers,                     color: 'text-green-600' },
                { icon: '🎓', label: 'Section 2 Purchases',     value: stats.section2Purchases,                     color: 'text-purple-600' },
                { icon: '🏆', label: 'Certificates Issued',     value: stats.totalCertificates,                     color: 'text-yellow-600' },
                { icon: '💰', label: 'Pending Payout Requests', value: stats.pendingPayouts,                        color: 'text-orange-600' },
                { icon: '💵', label: 'Total Pending Amount',    value: `$${stats.pendingPayoutAmount.toFixed(2)}`,  color: 'text-red-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{card.icon}</span>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide leading-tight">{card.label}</p>
                  </div>
                  <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Link href="/admin/referrals" className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition cursor-pointer">
                  <div className="text-2xl mb-1">💰</div>
                  <p className="text-sm font-semibold text-gray-700">Referral Payouts</p>
                </Link>
                <button onClick={() => { openBackfill(); setActiveSection('tools'); }} className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition">
                  <div className="text-2xl mb-1">🔧</div>
                  <p className="text-sm font-semibold text-gray-700">Certificate Backfill</p>
                </button>
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition">
                  <div className="text-2xl mb-1">📊</div>
                  <p className="text-sm font-semibold text-gray-700">Supabase</p>
                </a>
                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition">
                  <div className="text-2xl mb-1">💳</div>
                  <p className="text-sm font-semibold text-gray-700">Stripe</p>
                </a>
                <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-sm transition">
                  <div className="text-2xl mb-1">🚀</div>
                  <p className="text-sm font-semibold text-gray-700">Vercel</p>
                </a>
              </div>
            </div>

            {/* System Status */}
            {systemInfo && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3">System Status</h2>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Stripe Mode</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        systemInfo.stripeMode === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {systemInfo.stripeMode === 'LIVE' ? '🟢' : '🟡'} {systemInfo.stripeMode}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Supabase</p>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ Connected</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Environment</p>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{systemInfo.vercelEnv}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            USERS
        ══════════════════════════════════════ */}
        {activeSection === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Recent Users</h2>
                <p className="text-sm text-gray-500">Latest 20 signups</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadEmails}
                  disabled={emailsLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {emailsLoading ? '...' : '⬇ Download All Emails'}
                </button>
                <button
                  onClick={copyEmails}
                  disabled={emailsLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {emailsLoading ? '...' : '📋 Copy All Emails'}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Email', 'Name', 'Joined', 'Status', 'Section 2', 'Referral Code', 'Referred By'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {recentUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800 font-medium">{u.email}</td>
                        <td className="px-4 py-3 text-gray-600">{u.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            u.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.subscription_status || 'none'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.section2_unlocked
                            ? <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">✓ Unlocked</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {u.referral_code
                            ? <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{u.referral_code}</code>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {u.referred_by
                            ? <code className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">{u.referred_by}</code>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                    {recentUsers.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            REFERRALS
        ══════════════════════════════════════ */}
        {activeSection === 'referrals' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Referral Payouts</h2>
            <p className="text-gray-500 text-sm">Manage payout requests, view commission history, and assign referral codes to users.</p>
            {stats && stats.pendingPayouts > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-orange-900">{stats.pendingPayouts} pending payout request{stats.pendingPayouts !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-orange-700">Total owed: ${stats.pendingPayoutAmount.toFixed(2)} CAD</p>
                </div>
              </div>
            )}
            <Link
              href="/admin/referrals"
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              💰 Open Referral Payouts Manager →
            </Link>
          </div>
        )}

        {/* ══════════════════════════════════════
            CERTIFICATES
        ══════════════════════════════════════ */}
        {activeSection === 'certificates' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Module Completion Stats</h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#', 'Module', 'Completions', 'Avg Score', 'Certificates'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {moduleStats.map(m => (
                      <tr key={m.moduleNumber} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{m.moduleNumber}</td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{m.title}</td>
                        <td className="px-4 py-3 font-bold text-blue-700">{m.completions}</td>
                        <td className="px-4 py-3">
                          {m.completions > 0
                            ? <span className={`font-semibold ${m.avgScore >= 80 ? 'text-green-600' : m.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{m.avgScore}%</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-yellow-600">{m.certificates}</td>
                      </tr>
                    ))}
                    {moduleStats.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No module data.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
              <span className="text-2xl">🔧</span>
              <div>
                <p className="font-semibold text-amber-900 mb-1">Missing a certificate?</p>
                <p className="text-sm text-amber-700 mb-3">Use the Certificate Backfill Tool to generate missing certificates for any user.</p>
                <button
                  onClick={() => { openBackfill(); setActiveSection('tools'); }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition"
                >
                  Open Backfill Tool →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TOOLS
        ══════════════════════════════════════ */}
        {activeSection === 'tools' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Tools & Utilities</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="font-bold text-gray-800 mb-1">Certificate Backfill</h3>
                <p className="text-sm text-gray-500 mb-4">Generate missing certificates for a user who completed modules but didn't receive them.</p>
                <button
                  onClick={openBackfill}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Open Backfill Tool
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-3xl mb-3">🎁</div>
                <h3 className="font-bold text-gray-800 mb-1">Assign Referral Code</h3>
                <p className="text-sm text-gray-500 mb-4">Manually apply a referral code to a user who missed it at signup.</p>
                <Link
                  href="/admin/referrals"
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition text-center"
                >
                  Go to Referrals Panel →
                </Link>
              </div>

              {systemInfo && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-3xl mb-3">🖥️</div>
                  <h3 className="font-bold text-gray-800 mb-3">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stripe Mode</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        systemInfo.stripeMode === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {systemInfo.stripeMode === 'LIVE' ? '🟢' : '🟡'} {systemInfo.stripeMode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Supabase</span>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Environment</span>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{systemInfo.vercelEnv}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-gray-700 mb-3">External Dashboards</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { href: 'https://supabase.com/dashboard', icon: '📊', label: 'Supabase Dashboard' },
                  { href: 'https://dashboard.stripe.com', icon: '💳', label: 'Stripe Dashboard' },
                  { href: 'https://vercel.com/dashboard', icon: '🚀', label: 'Vercel Dashboard' },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-300 hover:shadow-sm transition"
                  >
                    {link.icon} {link.label} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            ADMINS
        ══════════════════════════════════════ */}
        {activeSection === 'admins' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Admin Management</h2>
                <p className="text-sm text-gray-500">Manage who has access to this admin panel.</p>
              </div>
              <button
                onClick={loadAdmins}
                disabled={adminsLoading}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition disabled:opacity-50"
              >
                {adminsLoading ? '...' : '↻ Refresh'}
              </button>
            </div>

            {adminMgmtMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">{adminMgmtMessage}</div>
            )}
            {adminMgmtError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{adminMgmtError}</div>
            )}

            {/* Primary (env) admins */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Primary Admins</h3>
                  <p className="text-xs text-gray-500">Configured via ADMIN_EMAILS environment variable. Cannot be removed here.</p>
                </div>
              </div>
              {adminsLoading ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : envAdmins.length === 0 ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">No primary admins found.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {envAdmins.map(email => (
                    <li key={email} className="px-5 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-800 font-medium">{email}</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">Primary Admin</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dynamic (db) admins */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Additional Admins</h3>
                  <p className="text-xs text-gray-500">Stored in the admin_emails table. Can be added or removed below.</p>
                </div>
              </div>
              {adminsLoading ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : dbAdmins.length === 0 ? (
                <div className="px-5 py-6 text-center text-gray-400 text-sm">No additional admins yet.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {dbAdmins.map(record => (
                    <li key={record.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-800 font-medium">{record.email}</p>
                        <p className="text-xs text-gray-400">
                          Added by {record.added_by} · {new Date(record.added_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {confirmRemoveId === record.id ? (
                          <>
                            <span className="text-xs text-red-600 font-semibold">Remove this admin?</span>
                            <button
                              onClick={() => removeAdmin(record.id)}
                              disabled={removingAdminId === record.id}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                            >
                              {removingAdminId === record.id ? '...' : 'Yes, Remove'}
                            </button>
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setConfirmRemoveId(record.id); setAdminMgmtMessage(''); setAdminMgmtError(''); }}
                            className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add new admin */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-1 text-sm">Add New Admin</h3>
              <p className="text-xs text-gray-500 mb-4">Grant admin access to another email address. They must already have a SetReady account.</p>

              {!confirmNewAdmin ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newAdminEmail.trim()) setConfirmNewAdmin(true); }}
                    placeholder="admin@example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={() => { if (newAdminEmail.trim()) setConfirmNewAdmin(true); }}
                    disabled={!newAdminEmail.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Add Admin
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-amber-900 font-semibold">
                    Grant admin access to <span className="font-bold">{newAdminEmail}</span>?
                  </p>
                  <p className="text-xs text-amber-700">This will give them full access to this admin panel.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={addAdmin}
                      disabled={addingAdmin}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                    >
                      {addingAdmin ? 'Adding...' : 'Confirm — Add Admin'}
                    </button>
                    <button
                      onClick={() => { setConfirmNewAdmin(false); setAdminMgmtError(''); }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          CERTIFICATE BACKFILL MODAL
      ══════════════════════════════════════ */}
      {showBackfill && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeBackfill(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">🏆 Certificate Backfill Tool</h2>
                <p className="text-xs text-gray-500">Generate missing certificates for a user</p>
              </div>
              <button onClick={closeBackfill} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {backfillError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{backfillError}</div>
              )}

              {!backfillUserInfo && !backfillResults && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={backfillEmail}
                      onChange={e => setBackfillEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') findBackfillUser(); }}
                      placeholder="user@example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={findBackfillUser}
                      disabled={backfillLoading || !backfillEmail.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {backfillLoading ? '...' : 'Find User'}
                    </button>
                  </div>
                </div>
              )}

              {backfillUserInfo && !backfillResults && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                    <p><span className="font-semibold text-gray-600">User ID:</span> <code className="text-xs font-mono text-gray-500 break-all">{backfillUserInfo.userId}</code></p>
                    <p><span className="font-semibold text-gray-600">Completed modules:</span> {backfillUserInfo.debug?.completedModulesForUser?.length ?? 0}</p>
                    <p><span className="font-semibold text-gray-600">Existing certificates:</span> {backfillUserInfo.debug?.certificatesForUser?.length ?? 0}</p>
                  </div>

                  {(backfillUserInfo.debug?.completedModulesForUser?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Completed Modules</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {backfillUserInfo.debug.completedModulesForUser.map((m: any) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const hasCert = (backfillUserInfo.debug.certificatesForUser || []).some((c: any) => c.module_id === m.module_number);
                          return (
                            <div key={m.progress_module_id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
                              <span className="text-gray-700">Module {m.module_number}{m.title ? `: ${m.title}` : ''}</span>
                              <span className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ml-2 ${
                                hasCert ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {hasCert ? '✓ Has cert' : '⚠ Missing'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={runBackfill}
                      disabled={backfillLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {backfillLoading ? 'Generating...' : '✓ Generate Missing Certificates'}
                    </button>
                    <button
                      onClick={() => { setBackfillUserInfo(null); setBackfillEmail(''); setBackfillError(''); }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {backfillResults && (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${backfillResults.created > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="font-semibold text-sm text-gray-800">
                      {backfillResults.created > 0
                        ? `✅ Created ${backfillResults.created} certificate${backfillResults.created !== 1 ? 's' : ''}`
                        : '✅ No missing certificates — all up to date'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Skipped: {backfillResults.skipped} · Errors: {backfillResults.errors}</p>
                  </div>

                  {(backfillResults.results?.length ?? 0) > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {backfillResults.results.map((r: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100">
                          <span className="text-gray-700">Module {r.moduleNumber}{r.title ? `: ${r.title}` : ''}</span>
                          <span className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ml-2 ${
                            r.status === 'created' ? 'bg-green-100 text-green-700'
                            : r.status === 'skipped' ? 'bg-gray-100 text-gray-600'
                            : 'bg-red-100 text-red-700'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => { setBackfillResults(null); setBackfillUserInfo(null); setBackfillEmail(''); setBackfillError(''); }}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Run Another
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
