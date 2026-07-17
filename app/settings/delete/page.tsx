'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient()

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function deleteAccount() {
    if (confirmText !== 'DELETE') {
      setError('Type "DELETE" to confirm');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Error deleting account. Please contact support at support@setready.site');
        return;
      }
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      setError('Error deleting account. Please contact support at support@setready.site');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 text-center">
      <h1 className="text-2xl font-bold mb-4 text-red-600">Delete Account</h1>
      <p className="mb-4 text-gray-600">This action cannot be undone.</p>
      <p className="mb-2">Type "DELETE" to confirm:</p>
      <input
        type="text"
        className="w-full border rounded p-2 mb-4"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
      />
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <button
        onClick={deleteAccount}
        disabled={confirmText !== 'DELETE' || deleting}
        className="w-full bg-red-600 text-white py-2 rounded disabled:opacity-50"
      >
        {deleting ? 'Deleting...' : 'Permanently Delete Account'}
      </button>
    </div>
  );
}
