// app/dashboard/admin/affiliates/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Affiliate {
  id: string;
  user_id: string;
  code: string;
  clicks: number;
  signups: number;
  earnings: number;
  status: string;
  created_at: string;
  user_email?: string;
}

export default function AdminAffiliatesPage() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkAdminAndLoadAffiliates();
  }, []);

  async function checkAdminAndLoadAffiliates() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }

    const adminEmails = ['mikebhangu@gmail.com', 'admin@example.com'];
    const isUserAdmin = adminEmails.includes(user.email || '');
    setIsAdmin(isUserAdmin);

    if (!isUserAdmin) {
      router.push('/dashboard');
      return;
    }

    await loadAffiliates();
  }

  async function loadAffiliates() {
    setLoading(true);
    
    const { data: affiliateData, error } = await supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && affiliateData) {
      // Get user emails for each affiliate
      const affiliatesWithEmails = await Promise.all(
        affiliateData.map(async (affiliate: Affiliate) => {
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', affiliate.user_id)
            .single();
          
          return {
            ...affiliate,
            user_email: userData?.email || 'Unknown'
          };
        })
      );
      setAffiliates(affiliatesWithEmails);
    }
    
    setLoading(false);
  }

  async function generateReferralCode() {
    if (!newCode.trim()) {
      alert('Please enter a referral code');
      return;
    }

    setGenerating(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('Please sign in');
      setGenerating(false);
      return;
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from('affiliates')
      .select('code')
      .eq('code', newCode.toUpperCase())
      .single();

    if (existing) {
      alert('Code already exists. Please choose another.');
      setGenerating(false);
      return;
    }

    const { error } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        code: newCode.toUpperCase(),
        clicks: 0,
        signups: 0,
        earnings: 0,
        status: 'active'
      });

    if (error) {
      console.error('Error generating code:', error);
      alert('Error generating code');
    } else {
      alert(`Referral code "${newCode.toUpperCase()}" generated successfully!`);
      setNewCode('');
      setShowGenerateForm(false);
      await loadAffiliates();
    }
    
    setGenerating(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading affiliates...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-blue-800 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin" className="text-white/80 hover:text-white">
                ← Back to Admin
              </Link>
              <h1 className="text-2xl font-bold">Affiliate Management</h1>
            </div>
            <button
              onClick={() => setShowGenerateForm(!showGenerateForm)}
              className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition"
            >
              + Generate Referral Code
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Generate Form */}
        {showGenerateForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Generate New Referral Code</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter code (e.g., MIKE2024)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button
                onClick={generateReferralCode}
                disabled={generating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={() => setShowGenerateForm(false)}
                className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Affiliates Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">All Affiliates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signups</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No affiliates found. Generate a referral code to get started.
                    </td>
                  </tr>
                ) : (
                  affiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{affiliate.user_email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{affiliate.code}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{affiliate.clicks || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{affiliate.signups || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(affiliate.earnings || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${affiliate.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {affiliate.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(affiliate.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}