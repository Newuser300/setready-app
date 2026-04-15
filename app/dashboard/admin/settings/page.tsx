// app/dashboard/admin/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
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
    
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
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
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-white/80 hover:text-white">
              ← Back to Admin
            </Link>
            <h1 className="text-2xl font-bold">Platform Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">General Settings</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
              <input
                type="email"
                value="mikebhangu@gmail.com"
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Contact support to change admin email</p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-md font-medium text-gray-800 mb-4">Platform Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Version</p>
                  <p className="font-medium">SetReady v1.0.0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Environment</p>
                  <p className="font-medium">Production</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}