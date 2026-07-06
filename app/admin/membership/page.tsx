'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

type Submission = {
  id: string;
  user_id: string;
  union_org: string | null;
  union_label: string;
  tier: string;
  tier_label: string;
  member_number: string | null;
  file_url: string;
  filename: string | null;
  file_type: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
};

export default function AdminMembershipPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function token() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/membership', { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setErr('You are not signed in as an admin (or your session expired). Try signing out and back in.');
        } else if (typeof data.error === 'string' && /membership_verifications|relation|does not exist|schema cache/i.test(data.error)) {
          setErr('The membership database table has not been created yet. Run the SQL migration (sql/2026-07-06_membership-verification.sql) in Supabase, then reload.');
        } else {
          setErr(data.error || 'Could not load submissions.');
        }
        return;
      }
      setSubs(data.submissions || []);
    } catch {
      setErr('Could not load submissions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function viewDoc(fileUrl: string) {
    const t = toast.loading('Opening document...');
    try {
      const res = await fetch('/api/membership/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ fileUrl }),
      });
      const data = await res.json();
      toast.dismiss(t);
      if (!res.ok) { toast.error(data.error || 'Failed to open.'); return; }
      window.open(data.signedUrl, '_blank', 'noopener');
    } catch {
      toast.dismiss(t);
      toast.error('Failed to open document.');
    }
  }

  async function review(id: string, action: 'approve' | 'reject') {
    let notes: string | null = null;
    if (action === 'reject') {
      notes = window.prompt('Reason for rejection (shown to the member):', '') || '';
    }
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ id, action, notes }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Action failed.'); return; }
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  // Opens the public ACTRA/UBCP background-performer directory and copies the
  // member's name so the admin can paste it into the search and confirm quickly.
  async function searchDirectory(s: Submission) {
    const q = `${s.user_name || ''} ${s.member_number || ''}`.trim();
    try {
      if (q && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(q);
        toast.success('Name copied — paste it into the directory search');
      }
    } catch { /* ignore */ }
    window.open('https://background.actraonline.ca/', '_blank', 'noopener');
  }

  const pending = subs.filter((s) => s.status === 'pending');
  const others = subs.filter((s) => s.status !== 'pending');

  const badge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || ''}`}>{status}</span>;
  };

  const Card = ({ s }: { s: Submission }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{s.user_name || '(no name)'} · {s.user_email}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            <span className="font-medium">{s.tier_label}</span>
            {s.union_label && <span className="text-gray-500"> · {s.union_label}</span>}
            {s.member_number && <span className="text-gray-500"> · {s.member_number}</span>}
          </p>
          <p className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleString('en-CA')}</p>
          {s.review_notes && <p className="text-xs text-red-600 mt-1 italic">Note: {s.review_notes}</p>}
        </div>
        {badge(s.status)}
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <button onClick={() => viewDoc(s.file_url)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">👁 View proof</button>
        <button onClick={() => searchDirectory(s)} className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">🔎 Directory</button>
        {s.status !== 'approved' && (
          <button onClick={() => review(s.id, 'approve')} disabled={busyId === s.id} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50">✓ Approve</button>
        )}
        {s.status !== 'rejected' && (
          <button onClick={() => review(s.id, 'reject')} disabled={busyId === s.id} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50">✕ Reject</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <h1 className="text-xl font-bold text-gray-900">Membership Verifications</h1>
          </div>
          <Link href="/admin" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 font-medium transition">← Admin</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : err ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{err}</div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-3">
                Pending review
                {pending.length > 0 && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-sm">{pending.length}</span>}
              </h2>
              {pending.length === 0 ? (
                <p className="text-gray-400 text-sm">Nothing waiting for review. 🎉</p>
              ) : (
                <div className="space-y-3">{pending.map((s) => <Card key={s.id} s={s} />)}</div>
              )}
            </div>

            {others.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3">Reviewed</h2>
                <div className="space-y-3">{others.map((s) => <Card key={s.id} s={s} />)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
