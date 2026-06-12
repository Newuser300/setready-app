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
    /*
     * CHANGE 6 — The outer div IS the overlay. No child backdrop needed.
     * This eliminates every transparency path: no animation on the overlay,
     * no partial-opacity child, no bg-white/XX Tailwind fraction.
     * backdropFilter blurs page content behind the solid overlay.
     */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      {/* Modal card — clicks stop here so they don't close the modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in"
        style={{
          backgroundColor: '#FFFFFF',
          opacity: 1,
          borderRadius: '1rem',
          border: '3px solid #F59E0B',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          maxWidth: '28rem',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Gold accent bar */}
        <div style={{ height: '6px', backgroundColor: '#F59E0B', width: '100%' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            backgroundColor: '#F3F4F6',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: '#111827',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
        >
          ✕
        </button>

        <div style={{ padding: '1.5rem 2rem 2rem' }}>
          {/* Icon */}
          <div style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>

          {/* Headline */}
          <h2 style={{
            textAlign: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem',
          }}>
            Unlock Your Full Access
          </h2>

          {/* Subheadline */}
          <p style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#374151',
            marginBottom: '2rem',
            lineHeight: '1.6',
          }}>
            Join SetReady and start your professional acting journey today
          </p>

          {/* Primary button — gold */}
          <button
            onClick={() => router.push('/auth/sign-up')}
            style={{
              display: 'block',
              width: '100%',
              padding: '1rem',
              backgroundColor: '#F59E0B',
              color: '#000000',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '0.75rem',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D97706')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F59E0B')}
          >
            Create Free Account
          </button>

          {/* Secondary button — grey */}
          <button
            onClick={() => router.push('/auth/sign-in')}
            style={{
              display: 'block',
              width: '100%',
              padding: '1rem',
              backgroundColor: '#F3F4F6',
              color: '#111827',
              fontWeight: '600',
              fontSize: '1rem',
              borderRadius: '0.75rem',
              border: '2px solid #D1D5DB',
              cursor: 'pointer',
              marginBottom: '1.5rem',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
          >
            Sign In to Existing Account
          </button>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #E5E7EB', marginBottom: '1.5rem' }} />

          {/* Pricing reminder */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.375rem' }}>
              Section 1:{' '}
              <span style={{ fontWeight: '600', color: '#111827' }}>$9.99/month</span>
              {'  •  '}
              Section 2:{' '}
              <span style={{ fontWeight: '600', color: '#111827' }}>$19.99 once</span>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
              ✓ Cancel anytime{'  •  '}✓ No hidden fees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
