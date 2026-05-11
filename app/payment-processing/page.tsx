// app/payment-processing/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PaymentProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const plan = searchParams.get('plan');

  useEffect(() => {
    if (!sessionId) {
      router.push('/dashboard');
      return;
    }

    // Simple approach: redirect to dashboard after 5 seconds
    // The webhook will have updated the database by then
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [sessionId, router, plan]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🎬</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-4">
          Thank you for your subscription. Redirecting you to your dashboard...
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-green-600 h-2 rounded-full animate-pulse w-full" />
        </div>
        <p className="text-sm text-gray-500">
          You will be redirected automatically.
        </p>
      </div>
    </div>
  );
}