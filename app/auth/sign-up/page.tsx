'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Copyright from '@/components/Copyright';
import { createClient } from '@/utils/supabase/client'
import GoogleSignInButton from '@/components/GoogleSignInButton';

const supabase = createClient()

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [refFromUrl, setRefFromUrl] = useState(false);
  const [codeValidation, setCodeValidation] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [referrerName, setReferrerName] = useState('');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      const code = ref.toUpperCase();
      setReferralCode(code);
      setRefFromUrl(true);
      sessionStorage.setItem('referral_code', code);
    } else {
      const stored = sessionStorage.getItem('referral_code');
      if (stored) setReferralCode(stored);
    }
  }, []);

  async function validateReferralCode(code: string) {
    if (!code || code.trim().length < 4) {
      setCodeValidation('idle');
      return;
    }
    setCodeValidation('checking');
    try {
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      const data = await res.json();
      if (data.valid) {
        setCodeValidation('valid');
        setReferrerName(data.referrerName || '');
      } else {
        setCodeValidation('invalid');
      }
    } catch {
      setCodeValidation('idle');
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!ageConfirmed) {
      setError('You must confirm that you are 18 years of age or older and a resident of Canada to create an account.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, province, city, age_verified: true, referral_code: referralCode || null },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Duplicate email: Supabase returns a user but with no identities
    if (data.user && data.user.identities?.length === 0) {
      setError('An account with this email already exists. Please sign in instead.');
      setLoading(false);
      return;
    }

    if (data.user) {
      const token = data.session?.access_token;

      if (token) {
        // Session available — create profile and redirect immediately
        const res = await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: data.user.id,
            email,
            name,
            province,
            city: city || null,
            referred_by: referralCode || null,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('Failed to create user profile:', errData);
          setError('Account created but profile setup failed: ' + (errData.error || 'Unknown error'));
          setLoading(false);
          return;
        }

        sessionStorage.removeItem('referral_code');

        // Auto-detect film region from city
        if (city.trim()) {
          await fetch('/api/performers/location', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ city: city.trim() }),
          }).catch(() => {})
        }

        const browserClient = createClient();
        await browserClient.auth.setSession({
          access_token: data.session!.access_token,
          refresh_token: data.session!.refresh_token,
        });

        router.push('/dashboard');
      } else {
        // Email confirmation required — no session yet, but still create the
        // public.users profile row now so the account is findable/bookable
        // before they confirm. (Without this, confirmation-flow signups never
        // get a public.users row.)
        await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            email,
            name,
            province,
            city: city || null,
            referred_by: referralCode || null,
          }),
        }).catch(() => {});
        sessionStorage.removeItem('referral_code');
        setShowConfirmation(true);
      }
    } else {
      setError('Sign up failed. Please try again.');
    }

    setLoading(false);
  };

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

  if (showConfirmation) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif', padding: '24px' }}>
        <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📧</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 10px' }}>Check your email</h1>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 8px', lineHeight: '1.6' }}>
            We sent a confirmation link to
          </p>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 24px' }}>{email}</p>
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: '1.6' }}>
              Click the link in the email to activate your account. If you don't see it, check your spam or junk folder.
            </p>
          </div>
          <Link href="/auth/sign-in" style={{ display: 'block', padding: '13px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '15px', borderRadius: '10px', textDecoration: 'none' }}>
            Go to Sign In
          </Link>
          <p style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af' }}>
            Wrong email?{' '}
            <button onClick={() => setShowConfirmation(false)} style={{ background: 'none', border: 'none', color: '#F59E0B', fontWeight: '600', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
              Go back
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system, Arial, sans-serif' }}>

      {/* ── LEFT BRAND PANEL ── */}
      {!isMobile && (
        <div style={{
          width: '50%',
          backgroundColor: '#1a1a2e',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 52px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* SR Badge + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
            <div style={{
              width: '52px', height: '52px',
              backgroundColor: '#F59E0B',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '18px', color: '#1a1a2e',
              letterSpacing: '-0.5px',
              flexShrink: 0,
            }}>SR</div>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 700, color: 'white', lineHeight: 1 }}>SetReady</div>
              <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Background Performer Platform</div>
            </div>
          </div>

          {/* Amber divider */}
          <div style={{ width: '48px', height: '3px', backgroundColor: '#F59E0B', borderRadius: '2px', marginBottom: '28px' }} />

          {/* Headline */}
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: '0 0 36px' }}>
            Everything a Background Performer needs in one place — for free.
          </p>

          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, margin: 0 }}>
            Trusted by performers across Canada. No credit card required. Free forever.
          </p>
        </div>
      )}

      {/* ── RIGHT FORM PANEL ── */}
      <div style={{
        width: isMobile ? '100%' : '50%',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: isMobile ? '40px 24px 60px' : '48px 52px 60px',
        overflowY: 'auto',
        minHeight: '100vh',
      }}>

        {/* Mobile SR circle */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px',
                backgroundColor: '#F59E0B',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '16px', color: '#1a1a2e',
              }}>SR</div>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a2e' }}>SetReady</span>
            </div>
          </div>
        )}

        {/* Form header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
            GET STARTED FREE
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '26px' : '30px', fontWeight: 700, color: '#1a1a2e', margin: 0, lineHeight: 1.2 }}>
            Create your account
          </h1>
        </div>

        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Full Name */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              required
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: '44px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? (
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Province */}
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
              {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>

          {/* City */}
          <div>
            <label style={labelStyle}>
              City{' '}
              <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(helps casting directors find local talent)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Vancouver, Calgary, Toronto"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Referral Code */}
          <div>
            <label style={labelStyle}>
              Referral Code{' '}
              <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            {refFromUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '14px', color: '#15803d' }}>
                <span style={{ fontWeight: 700 }}>✓</span>
                Referral code applied: <strong style={{ marginLeft: '4px' }}>{referralCode}</strong>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="e.g. A3BC9F2D"
                  value={referralCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setReferralCode(val);
                    sessionStorage.setItem('referral_code', val);
                    setCodeValidation('idle');
                  }}
                  onBlur={() => validateReferralCode(referralCode)}
                  style={inputStyle}
                />
                {codeValidation === 'checking' && (
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>Checking code...</p>
                )}
                {codeValidation === 'valid' && (
                  <p style={{ fontSize: '12px', color: '#16a34a', margin: '4px 0 0' }}>
                    ✓ Valid referral code{referrerName ? ` — referred by ${referrerName}` : ''}
                  </p>
                )}
                {codeValidation === 'invalid' && (
                  <p style={{ fontSize: '12px', color: '#dc2626', margin: '4px 0 0' }}>✗ Code not found. Double-check and try again.</p>
                )}
              </div>
            )}
          </div>

          {/* Age confirmation */}
          <div style={{ padding: '14px 16px', backgroundColor: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                required
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: '#F59E0B', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                I confirm I am <strong>18 years of age or older</strong> and a resident of Canada and agree to the{' '}
                <Link href="/terms" style={{ color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" style={{ color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>.
              </span>
            </label>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0 25px', lineHeight: 1.4 }}>
              SetReady is for adults 18 and older who reside in Canada. If you are under 18 or outside Canada, please do not create an account.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          {/* Submit */}
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
              letterSpacing: '0.02em',
              fontFamily: 'inherit',
              marginTop: '4px',
            }}
          >
            {loading ? 'Creating account...' : 'Create My Free Account'}
          </button>
        </form>

        {/* Google sign-up */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>
        <div style={{ marginTop: '16px' }}>
          <GoogleSignInButton
            label="Sign up with Google"
            disabled={!ageConfirmed}
            onBlocked={() => setError('Please confirm you are 18+ and a resident of Canada (check the box above) before continuing with Google.')}
            referralCode={referralCode || undefined}
          />
          {!ageConfirmed && (
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0', textAlign: 'center' }}>
              Check the 18+ / Canada box above to enable Google sign-up.
            </p>
          )}
        </div>

        {/* Sign in link */}
        <p style={{ marginTop: '20px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/auth/sign-in" style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>

        {/* Preview without signing in */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>
        <Link
          href="/dashboard"
          style={{
            display: 'block',
            marginTop: '16px',
            width: '100%',
            padding: '13px',
            backgroundColor: 'white',
            color: '#1a1a2e',
            border: '1.5px solid #1a1a2e',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 700,
            textAlign: 'center',
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          👀 Preview without signing in
        </Link>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
            Need help? support@setready.site
          </p>
        </div>

        <Copyright />
      </div>
    </div>
  );
}
