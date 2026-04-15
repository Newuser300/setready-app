'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    
    await supabase.from('user_progress').delete().eq('user_id', user.id);
    await supabase.from('certificates').delete().eq('user_id', user.id);
    await supabase.from('users').delete().eq('id', user.id);
    await supabase.auth.signOut();
    
    router.push('/');
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