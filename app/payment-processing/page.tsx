// app/payment-processing/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Logo from '@/components/Logo';

// Force dynamic rendering to avoid static prerendering issues
export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 30000;

// This component uses useSearchParams() and must be wrapped in Suspense
function PaymentProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id') ?? null;
  const plan = searchParams?.get('plan') ?? null;
  const supabase = createClient();

  const [statusMessage, setStatusMessage] = useState('Activating your subscription...');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      router.push('/dashboard');
      return;
    }

    const startTime = Date.now();

    // Smooth progress bar — ticks every 100 ms
    const progressInterval = setInterval(() => {
      setElapsed(Math.min(Date.now() - startTime, TIMEOUT_MS));
    }, 100);

    // Poll subscription status directly via Supabase client (avoids 401 after Stripe redirect)
    const pollInterval = setInterval(async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          await supabase.auth.refreshSession();
          ({ data: { user } } = await supabase.auth.getUser());
        }
        if (!user) return;

        const { data } = await supabase
          .from('users')
          .select('subscription_status, section2_unlocked')
          .eq('id', user.id)
          .maybeSingle();

        const isReady = plan === 'section2'
          ? data?.section2_unlocked === true
          : data?.subscription_status === 'active';

        if (isReady) {
          clearInterval(pollInterval);
          clearInterval(progressInterval);
          clearTimeout(fallbackTimeout);
          setStatusMessage('Access granted! Redirecting...');
          router.push('/dashboard?subscribed=true');
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, POLL_INTERVAL_MS);

    // Hard 30-second timeout: redirect regardless
    const fallbackTimeout = setTimeout(() => {
      clearInterval(pollInterval);
      clearInterval(progressInterval);
      setElapsed(TIMEOUT_MS);
      setStatusMessage("Taking a little longer than expected — redirecting now. Refresh your dashboard if your subscription isn't showing.");
      setTimeout(() => router.push('/dashboard?subscribed=true'), 2000);
    }, TIMEOUT_MS);

    return () => {
      clearInterval(pollInterval);
      clearInterval(progressInterval);
      clearTimeout(fallbackTimeout);
    };
  }, [sessionId, router]);

  const progressPct = (elapsed / TIMEOUT_MS) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Logo size="sm" showText={false} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-4">
          {statusMessage}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          Please wait while we confirm your payment...
        </p>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function PaymentProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentProcessingContent />
    </Suspense>
  );
}
