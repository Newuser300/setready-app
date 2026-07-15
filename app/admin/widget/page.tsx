'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

type Partner = {
  id: string;
  partner_key: string;
  name: string;
  mode: 'free' | 'paid';
  price_cents: number;
  active: boolean;
  created_at: string;
};

type Enrollment = {
  id: string;
  partner_id: string;
  name: string;
  email: string;
  status: 'enrolled' | 'in_progress' | 'completed';
  paid: boolean;
  amount_cents: number;
  modules_done: number;
  cert_id: string | null;
  cert_issued_at: string | null;
  created_at: string;
};

export default function AdminWidgetPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function token() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/widget', { headers: { Authorization: `Bearer ${await token()}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErr('You are not signed in as an admin (or your session expired). Sign out and back in.');
        } else if (typeof data.error === 'string' && /partner_accounts|widget_enrollments|relation|does not exist|schema cache/i.test(data.error)) {
          setErr('The widget tables are not created yet. Run sql/2026-07-10_partner-widget.sql in Supabase, then reload.');
        } else {
          setErr(data.error || 'Could not load widget data.');
        }
        return;
      }
      setPartners(data.partners || []);
      setRows(data.enrollments || []);
    } catch {
      setErr('Network error loading widget data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const nameById: Record<string, string> = {};
  partners.forEach(p => { nameById[p.id] = p.name; });

  const total = rows.length;
  const completed = rows.filter(r => r.status === 'completed').length;
  const paidCount = rows.filter(r => r.paid).length;
  const revenue = rows.reduce((s, r) => s + (r.amount_cents || 0), 0) / 100;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin" style={{ color: '#c77f08', fontWeight: 600, textDecoration: 'none' }}>← Admin</Link>
      </div>
      <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>Widget — partners & subscribers</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0 }}>
        Everyone who used the embedded Training &amp; Certificates widget, across all partner portals.
      </p>

      {err && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, padding: 14, fontSize: 14 }}>{err}</div>
      )}

      {!err && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
            <Stat n={partners.length} l="Partners" />
            <Stat n={total} l="Enrollees" />
            <Stat n={completed} l="Certified" />
            <Stat n={paidCount} l="Paid" />
            <Stat n={`$${revenue.toFixed(2)}`} l="Talent revenue" />
          </div>

          <h2 style={{ fontSize: 16, margin: '10px 0 6px' }}>Partners</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr>{['Partner', 'Key', 'Mode', 'Price', 'Enrollees', 'Certified', 'Active'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {partners.map(p => {
                  const mine = rows.filter(r => r.partner_id === p.id);
                  return (
                    <tr key={p.id}>
                      <td style={tdStyle}>{p.name}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{p.partner_key}</td>
                      <td style={tdStyle}>{p.mode}</td>
                      <td style={tdStyle}>${((p.price_cents || 0) / 100).toFixed(2)}</td>
                      <td style={tdStyle}>{mine.length}</td>
                      <td style={tdStyle}>{mine.filter(r => r.status === 'completed').length}</td>
                      <td style={tdStyle}>{p.active ? '✓' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 16, margin: '22px 0 6px' }}>Subscribers ({total})</h2>
          {loading ? <p style={{ color: '#6b7280' }}>Loading…</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead><tr>{['Name', 'Email', 'Partner', 'Status', 'Modules', 'Certificate', 'Joined'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td style={tdStyle}>{r.name}</td>
                      <td style={tdStyle}>{r.email}</td>
                      <td style={tdStyle}>{nameById[r.partner_id] || '—'}</td>
                      <td style={tdStyle}>{r.status}</td>
                      <td style={tdStyle}>{r.modules_done}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{r.cert_id || '—'}</td>
                      <td style={tdStyle}>{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td style={tdStyle} colSpan={7}>No enrollments yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ n, l }: { n: number | string; l: string }) {
  return (
    <div style={{ flex: 1, minWidth: 120, background: '#fff', border: '1px solid #e8ebf2', borderRadius: 12, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e' }}>{n}</div>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', border: '1px solid #e8ebf2', borderRadius: 12 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e8ebf2', color: '#6b7280', fontWeight: 700, whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f1f3f8', whiteSpace: 'nowrap' };
