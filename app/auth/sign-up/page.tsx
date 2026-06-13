'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [refFromUrl, setRefFromUrl] = useState(false);
  const [codeValidation, setCodeValidation] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [referrerName, setReferrerName] = useState('');

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

    // Age verification check
    if (!ageConfirmed) {
      setError('You must confirm that you are 13 years or older to create an account.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, province, age_verified: true },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const token = data.session?.access_token;

      const res = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: data.user.id,
          email,
          name,
          province,
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
      router.push('/dashboard');
    } else {
      setError('Sign up failed. Please try again.');
    }
    
    setLoading(false);
  };

  const provinces = [
    'British Columbia', 'Ontario', 'Quebec (English)', 'Quebec (French)',
    'Alberta', 'Saskatchewan', 'Manitoba', 'Maritimes', 'Newfoundland', 'Territories'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow">
        <div className="flex justify-center">
          <Logo size="lg" darkBackground={false} showText={true} />
        </div>
        <p className="text-center text-gray-600">Create your account</p>
        <p className="text-center text-sm text-gray-500 italic">
          Essential Training for Every Film Industry Background Performer
        </p>
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-4">
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">Select your province</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Referral Code */}
            {refFromUrl ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-300 rounded-lg text-sm text-green-700">
                ✓ Referral code applied: <strong className="ml-1">{referralCode}</strong>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Referral code (optional) e.g. A3BC9F2D"
                  value={referralCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setReferralCode(val);
                    sessionStorage.setItem('referral_code', val);
                    setCodeValidation('idle');
                  }}
                  onBlur={() => validateReferralCode(referralCode)}
                />
                {codeValidation === 'checking' && (
                  <p className="text-xs text-gray-400 mt-1">Checking code...</p>
                )}
                {codeValidation === 'valid' && (
                  <p className="text-xs text-green-600 mt-1">✓ Valid referral code{referrerName ? ` — referred by ${referrerName}` : ''}</p>
                )}
                {codeValidation === 'invalid' && (
                  <p className="text-xs text-red-500 mt-1">✗ Code not found. Double-check and try again.</p>
                )}
              </div>
            )}

            {/* Age Disclaimer Checkbox */}
            <div className="space-y-2 pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I confirm that I am <strong>13 years of age or older</strong> and have read and agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              <p className="text-xs text-gray-500 pl-6">
                SetReady is for users 13 and older. If you are under 13, please do not create an account.
              </p>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}