'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface SignUpModalProps {
  onClose: () => void;
}

export default function SignUpModal({ onClose }: SignUpModalProps) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — very dark so white card pops */}
      <div
        className="absolute inset-0 backdrop-blur-sm animate-fade-in"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        onClick={onClose}
      />

      {/* Modal card — white, gold border, strong shadow */}
      <div
        className="relative bg-white max-w-md w-full animate-modal-in overflow-hidden"
        style={{
          borderRadius: '1rem',
          border: '3px solid #F59E0B',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Gold accent bar at top */}
        <div className="h-1.5 w-full bg-amber-500" />

        {/* Close button — clearly visible circular grey button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-800 font-bold text-sm leading-none"
        >
          ✕
        </button>

        <div className="px-8 pb-8 pt-6">
          {/* Icon */}
          <div className="text-5xl text-center mb-4">🎬</div>

          {/* Headline */}
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#111827' }}>
            Unlock Your Full Access
          </h2>

          {/* Subheadline */}
          <p className="text-sm text-center mb-8 leading-relaxed" style={{ color: '#374151' }}>
            Join SetReady and start your professional acting journey today
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Primary — gold */}
            <button
              onClick={() => router.push('/auth/sign-up')}
              className="w-full font-bold rounded-xl hover:bg-amber-400 transition-all duration-200"
              style={{
                backgroundColor: '#F59E0B',
                color: '#000000',
                padding: '1rem',
                fontSize: '1.1rem',
              }}
            >
              Create Free Account
            </button>

            {/* Secondary — light grey */}
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="w-full font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
              style={{
                backgroundColor: '#F3F4F6',
                color: '#111827',
                border: '2px solid #D1D5DB',
                padding: '1rem',
                fontSize: '1rem',
              }}
            >
              Sign In to Existing Account
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-gray-200" />

          {/* Pricing reminder */}
          <div className="text-center space-y-1.5">
            <p className="text-sm" style={{ color: '#374151' }}>
              Section 1:{' '}
              <span className="font-semibold" style={{ color: '#111827' }}>$9.99/month</span>
              {'  •  '}
              Section 2:{' '}
              <span className="font-semibold" style={{ color: '#111827' }}>$19.99 once</span>
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              ✓ Cancel anytime{'  •  '}✓ No hidden fees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
