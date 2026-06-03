'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      // Insert the user into the users table with ALL required fields
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          name: name,
          province: province,
          subscription_status: 'inactive',
          section2_unlocked: false,
          section1_completed: false,
        });

      if (insertError) {
        console.error('Error inserting user:', insertError);
        setError('Account created but profile setup failed. Please contact support.');
      } else {
        // Success - redirect to dashboard
        router.push('/dashboard');
      }
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
        <h2 className="text-3xl font-bold text-center text-gray-900">SetReady</h2>
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