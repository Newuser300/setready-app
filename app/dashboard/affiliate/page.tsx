'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AffiliatePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [stats, setStats] = useState({ clicks: 0, signups: 0, earnings: 0 });

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    setUser(user);
    
    // Load affiliate data
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (affiliate) {
      setAffiliateCode(affiliate.code);
      setStats({
        clicks: affiliate.clicks || 0,
        signups: affiliate.signups || 0,
        earnings: affiliate.earnings || 0
      });
    }
    
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Affiliate Dashboard</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
        
        <p className="text-gray-600 mb-8">Track your referrals and earnings</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200">
            <p className="text-3xl font-bold text-blue-600">{stats.clicks}</p>
            <p className="text-gray-600 mt-1">Total Clicks</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200">
            <p className="text-3xl font-bold text-green-600">{stats.signups}</p>
            <p className="text-gray-600 mt-1">Signups</p>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg text-center border border-yellow-200">
            <p className="text-3xl font-bold text-yellow-600">${stats.earnings}</p>
            <p className="text-gray-600 mt-1">Earnings</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-200">
            <p className="text-3xl font-bold text-purple-600">20%</p>
            <p className="text-gray-600 mt-1">Commission Rate</p>
          </div>
        </div>
        
        {affiliateCode && (
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <p className="font-semibold text-gray-700 mb-2">Your Referral Code:</p>
            <div className="bg-gray-100 p-3 rounded-lg inline-block">
              <code className="text-lg font-mono text-gray-800">{affiliateCode}</code>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Share this code with others. When they sign up using your code, you earn 20% commission!
            </p>
          </div>
        )}
        
        {!affiliateCode && (
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 text-center">
            <p className="text-gray-600">No affiliate code yet.</p>
            <p className="text-sm text-gray-500 mt-1">Contact support to get your affiliate code.</p>
          </div>
        )}
      </div>
    </div>
  );
}