// app/dashboard/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({ name: '', province: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const provinces = [
    'British Columbia', 'Ontario', 'Quebec (English)', 'Quebec (French)',
    'Alberta', 'Saskatchewan', 'Manitoba', 'Maritimes', 'Newfoundland', 'Territories'
  ];

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  async function loadUserAndProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    setUser(user);

    const { data: profileData } = await supabase
      .from('users')
      .select('name, province')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile({
        name: profileData.name || user.email?.split('@')[0] || '',
        province: profileData.province || 'British Columbia',
      });
    }

    setLoading(false);
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const { error: updateError } = await supabase
      .from('users')
      .update({ name: profile.name, province: profile.province })
      .eq('id', user.id);

    if (updateError) {
      setError('Failed to update profile');
      console.error(updateError);
    } else {
      setMessage('Profile updated successfully!');
    }
    setSaving(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters');
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    if (error) {
      setPasswordMessage(error.message);
    } else {
      setPasswordMessage('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setPasswordLoading(false);
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion');
      return;
    }

    if (!confirm('Are you absolutely sure? This action cannot be undone. All your progress, certificates, and data will be permanently deleted.')) {
      return;
    }

    setDeleting(true);

    try {
      // Delete from user_progress
      await supabase.from('user_progress').delete().eq('user_id', user.id);
      
      // Delete from work_logs
      await supabase.from('work_logs').delete().eq('user_id', user.id);
      
      // Delete from certificates
      await supabase.from('certificates').delete().eq('user_id', user.id);
      
      // Delete from users
      await supabase.from('users').delete().eq('id', user.id);
      
      // Delete auth user (this will cascade to remaining tables)
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        console.error('Error deleting user:', error);
      }
      
      // Sign out
      await supabase.auth.signOut();
      router.push('/auth/sign-in');
      
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting account. Please contact support.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚙️</div>
            <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
          </div>
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            👤 Profile Information
          </h2>
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={updateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Province</label>
              <select
                value={profile.province}
                onChange={(e) => setProfile({...profile, province: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🔐 Security
          </h2>
          {passwordMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${passwordMessage.includes('successfully') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {passwordMessage}
            </div>
          )}
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-red-600 mb-4 flex-items-center gap-2">
            ⚠️ Danger Zone
          </h2>
          <div className="bg-red-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 font-semibold mb-2">Delete Account</p>
            <p className="text-sm text-red-700 mb-3">
              This action cannot be undone. All your progress, certificates, and data will be permanently deleted.
            </p>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Type <span className="font-mono bg-gray-200 px-1 rounded">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Type DELETE here"
              />
            </div>
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
          </div>
        </div>

        {/* Legal Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📋 Legal
          </h2>
          <div className="space-y-2">
            <Link href="/privacy" className="block text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="block text-blue-600 hover:underline">
              Terms of Service
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/auth/sign-in');
              }}
              className="block text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}