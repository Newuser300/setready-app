'use client'
import Link from 'next/link'

export default function DonateThankYouPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>☕</div>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 10px' }}>Thank You!</h1>
        <p style={{ fontSize: '15px', color: '#9ca3af', lineHeight: '1.7', marginBottom: '28px' }}>
          Your support means the world to us. SetReady stays free for performers because of people like you.
        </p>
        <Link href="/dashboard" style={{ display: 'inline-block', padding: '13px 28px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', fontSize: '15px', borderRadius: '12px', textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
