'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RedeemPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const redeemCode = async () => {
    setLoading(true);
    setMessage('');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setMessage('Please sign in first');
      setLoading(false);
      return;
    }
    
    const { data: codeData, error } = await supabase
      .from('tester_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();
    
    if (error || !codeData) {
      setMessage('Invalid code');
      setLoading(false);
      return;
    }
    
    if (!codeData.is_active) {
      setMessage('This code is no longer active');
      setLoading(false);
      return;
    }
    
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      setMessage('This code has expired');
      setLoading(false);
      return;
    }
    
    const currentUses = codeData.uses_count || 0;
    const maxUses = codeData.max_uses || 1;
    
    if (currentUses >= maxUses) {
      setMessage('This code has already been used');
      setLoading(false);
      return;
    }
    
    const { error: updateError } = await supabase
      .from('tester_codes')
      .update({ 
        uses_count: currentUses + 1,
        used_by: user.id
      })
      .eq('id', codeData.id);
    
    if (updateError) {
      setMessage('Error activating code');
      setLoading(false);
      return;
    }
    
    setMessage('Success! Your account has been activated. Redirecting...');
    
    setTimeout(() => router.push('/dashboard'), 2000);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-900 to-teal-700">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Redeem Access Code</h1>
          <p className="text-gray-600 mt-2">Enter the unique code provided by SetReady support.</p>
        </div>
        
        <input
          type="text"
          placeholder="Enter code (e.g., X7K9P2M4)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 font-mono text-center text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        
        <button
          onClick={redeemCode}
          disabled={loading}
          className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 font-semibold transition"
        >
          {loading ? 'Processing...' : 'Redeem Access'}
        </button>
        
        {message && (
          <p className={`mt-4 text-center text-sm ${message.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
        
        <p className="text-center text-sm text-gray-500 mt-6">
          Need a code? Email <a href="mailto:setready@mail.com" className="text-teal-600 hover:underline">setready@mail.com</a>
        </p>
      </div>
    </div>
  );
}