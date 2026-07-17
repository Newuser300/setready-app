'use client';

import { useRouter } from 'next/navigation';

export default function CastingPortalPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: '-apple-system, Arial, sans-serif',
    }}>
      {/* SR Badge */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          width: '56px', height: '56px',
          backgroundColor: '#F59E0B',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '20px', color: '#1a1a2e',
          margin: '0 auto',
        }}>BG</div>
      </div>

      {/* Title */}
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 700, color: 'white', margin: '0 0 8px', textAlign: 'center' }}>
        BGReady Casting
      </h1>
      <p style={{ fontSize: '14px', color: '#F59E0B', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 20px' }}>
        Background Performer Platform
      </p>

      {/* Amber divider */}
      <div style={{ width: '40px', height: '3px', backgroundColor: '#F59E0B', borderRadius: '2px', marginBottom: '24px' }} />

      {/* Body text */}
      <p style={{ fontSize: '16px', color: '#9ca3af', textAlign: 'center', maxWidth: '420px', lineHeight: 1.6, margin: '0 0 40px' }}>
        Are you an Agent or a Casting Director? Select below to access your portal.
      </p>

      {/* Two cards */}
      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '620px',
      }}>

        {/* Agent card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px 32px',
          textAlign: 'center',
          width: '280px',
          flex: '1 1 260px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '48px' }}>🤝</span>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            I&apos;m an Agent
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.55, margin: 0 }}>
            Manage your roster, receive casting requests and submit performers.
          </p>
          <button
            onClick={() => router.push('/agent/login')}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#F59E0B',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '8px',
              fontFamily: 'inherit',
            }}
          >
            Agent Sign In
          </button>
          <button
            onClick={() => router.push('/agent/register')}
            style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: '13px', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}
          >
            New agency? Register →
          </button>
        </div>

        {/* Casting Director card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px 32px',
          textAlign: 'center',
          width: '280px',
          flex: '1 1 260px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '48px' }}>🎬</span>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            I&apos;m a Casting Director
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.55, margin: 0 }}>
            Browse performers, post casting requests and confirm bookings. Free.
          </p>
          <button
            onClick={() => router.push('/casting/login')}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#F59E0B',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '8px',
              fontFamily: 'inherit',
            }}
          >
            Casting Director Sign In
          </button>
          <button
            onClick={() => router.push('/casting/register')}
            style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: '13px', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}
          >
            Apply for free access →
          </button>
        </div>

      </div>

      {/* Back to dashboard */}
      <button
        onClick={() => router.push('/dashboard')}
        style={{ marginTop: '40px', background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
