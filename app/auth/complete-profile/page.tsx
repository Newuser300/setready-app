'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Copyright from '@/components/Copyright';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const provinces = [
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'ON', name: 'Ontario' },
  { code: 'QC', name: 'Quebec' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NL', name: 'Newfoundland & Labrador' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
];

export default function CompleteProfile() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  // Confirm the user is actually signed in (they arrive here from OAuth callback).
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/sign-in');
        return;
      }
      const meta = user.user_metadata || {};
      setName((meta.full_name as string) || (meta.name as string) || '');
      setReady(true);
    })();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!province) {
      setError('Please select your province.');
      return;
    }
    if (!ageConfirmed) {
      setError('You must confirm you are 18 or older and a resident of Canada to continue.');
      return;
    }

    setLoading(true);

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (userErr || !user || !token) {
      setError('Your session expired. Please sign in again.');
      setLoading(false);
      return;
    }

    // Record consent on the auth user (no schema change needed).
    await supabase.auth.updateUser({
      data: { age_verified: true, terms_accepted_at: new Date().toISOString(), name },
    });

    // Create/complete the public profile row.
    const res = await fetch('/api/auth/create-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: user.id, email: user.email, name, province }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError('Could not save your profile: ' + (data.error || 'Unknown error'));
      setLoading(false);
      return;
    }

    // Auto-detect film region from city (best effort).
    if (city.trim()) {
      await fetch('/api/performers/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ city: city.trim() }),
      }).catch(() => {});
    }

    router.push('/dashboard');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1a1a2e',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#6b7280',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, Arial, sans-serif', color: '#6b7280' }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: '440px', width: '100%', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '44px', height: '44px', backgroundColor: '#F59E0B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', color: '#1a1a2e' }}>SR</div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Almost there</div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Finish setting up</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <label style={labelStyle}>Full Name</label>
            <input type="text" required placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Province</label>
            <select
              required
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              style={{
                ...inputStyle,
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '36px',
                cursor: 'pointer',
              } as React.CSSProperties}
            >
              <option value="">Select your province</option>
              {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              City <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input type="text" placeholder="e.g. Vancouver, Calgary, Toronto" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ padding: '14px 16px', backgroundColor: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" required checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: '#F59E0B', flexShrink: 0, cursor: 'pointer' }} />
              <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                I confirm I am <strong>18 years of age or older</strong> and a resident of Canada and agree to the{' '}
                <Link href="/terms" style={{ color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>{' '}and{' '}
                <Link href="/privacy" style={{ color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>.
              </span>
            </label>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: loading ? '#e5e7eb' : '#F59E0B',
              color: loading ? '#9ca3af' : '#1a1a2e',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Saving…' : 'Enter BGReady'}
          </button>
        </form>

        <Copyright />
      </div>
    </div>
  );
}
