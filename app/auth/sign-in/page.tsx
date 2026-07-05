'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import Copyright from '@/components/Copyright';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
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
        justifyContent: 'center',
        padding: isMobile ? '48px 24px 60px' : '60px 52px',
        minHeight: '100vh',
      }}>

        {/* Mobile SR circle */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
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
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
            WELCOME BACK
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '26px' : '30px', fontWeight: 700, color: '#1a1a2e', margin: 0, lineHeight: 1.2 }}>
            Sign in to SetReady
          </h1>
        </div>

        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Password</span>
              <a
                href="/auth/reset-password"
                style={{ fontSize: '12px', color: '#F59E0B', textDecoration: 'none', fontWeight: 500 }}
              >
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Your password"
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Create account link */}
        <p style={{ marginTop: '20px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/sign-up" style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}>Create one free</Link>
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
            Need help? setready@mail.com
          </p>
        </div>

        <Copyright />
      </div>
    </div>
  );
}
