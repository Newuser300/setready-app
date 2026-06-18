// app/dashboard/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/client'

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

  // Referral code state
  const [referralInput, setReferralInput] = useState('');
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');
  const [referralError, setReferralError] = useState('');
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [ownReferralCode, setOwnReferralCode] = useState<string | null>(null);

  const provinces = [
    'British Columbia', 'Ontario', 'Quebec (English)', 'Quebec (French)',
    'Alberta', 'Saskatchewan', 'Manitoba', 'Maritimes', 'Newfoundland', 'Territories'
  ];

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  async function loadUserAndProfile() {
    const bc = createClient()
    const { data: { user }, error } = await bc.auth.getUser()
    if (error || !user) {
      router.push('/auth/sign-in');
      return;
    }
    setUser(user);

    const { data: profileData } = await supabase
      .from('users')
      .select('name, province, subscription_id, subscription_status, referred_by, referral_code')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile({
        name: profileData.name || user.email?.split('@')[0] || '',
        province: profileData.province || 'British Columbia',
      });
      setReferredBy(profileData.referred_by || null);
      setOwnReferralCode(profileData.referral_code || null);
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

  /**
   * Cancel Lemon Squeezy subscription via API route
   * This calls your internal API which then calls Lemon Squeezy
   */
  async function cancelLemonSqueezySubscription(subscriptionId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/lemon/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Lemon Squeezy cancellation failed:', error);
        return false;
      }

      const data = await response.json();
      console.log('Subscription cancelled:', data);
      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  async function applyReferralCode(e: React.FormEvent) {
    e.preventDefault();
    if (!referralInput.trim()) return;
    setReferralSubmitting(true);
    setReferralMessage('');
    setReferralError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setReferralError('Please sign in again.'); return; }
      const res = await fetch('/api/referral/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code: referralInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setReferredBy(referralInput.trim().toUpperCase());
        setReferralMessage('Referral code applied successfully!');
        setReferralInput('');
      } else {
        setReferralError(data.error || 'Failed to apply code.');
      }
    } catch {
      setReferralError('An error occurred. Please try again.');
    } finally {
      setReferralSubmitting(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion');
      return;
    }

    if (!confirm('Are you absolutely sure? This action cannot be undone. All your progress, certificates, data, and your active subscription will be permanently cancelled and deleted.')) {
      return;
    }

    setDeleting(true);

    try {
      // STEP 1: Get user's subscription info before deleting
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('subscription_id, subscription_status')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching user subscription:', fetchError);
      }

      // STEP 2: Cancel Lemon Squeezy subscription if it exists and is active
      if (userData?.subscription_id && userData.subscription_status === 'active') {
        console.log('Cancelling subscription:', userData.subscription_id);
        const cancellationSuccess = await cancelLemonSqueezySubscription(userData.subscription_id);
        
        if (!cancellationSuccess) {
          const continueDeletion = confirm(
            'Warning: We could not automatically cancel your subscription. ' +
            'You may need to cancel it manually from your Lemon Squeezy customer portal. ' +
            'Do you still want to delete your account?'
          );
          if (!continueDeletion) {
            setDeleting(false);
            return;
          }
        } else {
          console.log('Subscription cancelled successfully');
        }
      }

      // STEP 3: Delete user data from Supabase tables
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
      alert('Error deleting account. Please contact support at setready@mail.com');
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

        {/* Referral Code Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
            🎁 Referral Code
          </h2>
          <p className="text-sm text-gray-500 mb-4">Were you referred by a friend? Enter their code to link your account.</p>

          {referredBy ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium mb-1">✅ Referral code applied</p>
              <p className="text-sm text-gray-600">
                You were referred by code: <span className="font-mono font-bold text-gray-800">{referredBy}</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">Referral codes cannot be changed after they are applied.</p>
            </div>
          ) : (
            <form onSubmit={applyReferralCode} className="space-y-3">
              {referralMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{referralMessage}</div>
              )}
              {referralError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{referralError}</div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Enter Referral Code</label>
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => { setReferralInput(e.target.value.toUpperCase()); setReferralError(''); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono tracking-widest uppercase"
                  placeholder="e.g. ABC12345"
                  maxLength={20}
                />
                {ownReferralCode && (
                  <p className="text-xs text-gray-400 mt-1">Your own code is {ownReferralCode} — you cannot use your own code.</p>
                )}
              </div>
              <button
                type="submit"
                disabled={referralSubmitting || !referralInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {referralSubmitting ? 'Applying…' : 'Apply Code'}
              </button>
            </form>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
            ⚠️ Danger Zone
          </h2>
          <div className="bg-red-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 font-semibold mb-2">Delete/Cancel Account</p>
            <p className="text-sm text-red-700 mb-3">
              <strong>Warning:</strong> This will permanently delete your account data AND cancel your active subscription (if any). 
              Your subscription will not renew after cancellation. This action cannot be undone.
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
              {deleting ? 'Processing...' : 'Permanently Delete / Cancel Account'}
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
            <div className="pt-2 mt-2 border-t border-gray-200">
              <a 
                href="mailto:setready@mail.com" 
                className="block text-blue-600 hover:underline"
              >
                📧 Contact Support: setready@mail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}