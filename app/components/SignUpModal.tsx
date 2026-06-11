'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface SignUpModalProps {
  onClose: () => void;
}

export default function SignUpModal({ onClose }: SignUpModalProps) {
  const router = useRouter();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl animate-modal-in overflow-hidden">
        {/* Gold accent bar */}
        <div className="h-1 w-full bg-amber-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="px-8 pb-8 pt-6">
          {/* Icon */}
          <div className="text-5xl text-center mb-5">🎬</div>

          {/* Headline */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Unlock Your Full Access
          </h2>
          <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
            Join SetReady and start your professional acting journey today
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/sign-up')}
              className="w-full py-3.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-all duration-200 text-base"
            >
              Create Free Account
            </button>
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="w-full py-3.5 bg-gray-100 text-gray-700 border border-gray-200 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 text-base"
            >
              Sign In to Existing Account
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-gray-200" />

          {/* Pricing reminder */}
          <div className="text-center space-y-1.5">
            <p className="text-gray-500 text-sm">
              Section 1:{' '}
              <span className="text-gray-900 font-medium">$9.99/month</span>
              {'  •  '}
              Section 2:{' '}
              <span className="text-gray-900 font-medium">$19.99 once</span>
            </p>
            <p className="text-gray-400 text-xs">
              ✓ Cancel anytime{'  •  '}✓ 30-day guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
