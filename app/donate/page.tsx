'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

const PRESETS = [5, 10, 20, 50]

export default function DonatePage() {
  const router = useRouter()
  const [amount, setAmount] = useState(10)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const finalAmount = useCustom ? parseFloat(customAmount) || 0 : amount

  async function handleDonate() {
    if (finalAmount < 1 || finalAmount > 1000) {
      setError('Amount must be between $1 and $1,000 CAD.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(finalAmount * 100) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to start checkout'); setLoading(false); return }
      window.location.href = data.url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ maxWidth: '420px', width: '100%' }}>
        {/* Back */}
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', padding: 0 }}>
          ← Back
        </button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Logo size="md" darkBackground showText />
        </div>

        <div style={{ backgroundColor: '#1e1e35', borderRadius: '20px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>☕</div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: '0 0 6px' }}>Support SetReady</h1>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
              SetReady is free for performers. If it's helped your career, consider buying us a coffee to keep the lights on.
            </p>
          </div>

          {/* Preset amounts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => { setAmount(p); setUseCustom(false); setCustomAmount('') }}
                style={{
                  padding: '12px 4px',
                  borderRadius: '10px',
                  border: (!useCustom && amount === p) ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: (!useCustom && amount === p) ? 'rgba(245,158,11,0.15)' : '#1a1a2e',
                  color: (!useCustom && amount === p) ? '#F59E0B' : '#e5e7eb',
                  fontWeight: (!useCustom && amount === p) ? '800' : '600',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                ${p}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '16px', fontWeight: '700', pointerEvents: 'none' }}>$</span>
              <input
                type="number"
                min="1"
                max="1000"
                step="1"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setUseCustom(true) }}
                onFocus={() => setUseCustom(true)}
                placeholder="Custom amount"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 28px',
                  border: useCustom ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  backgroundColor: '#0f0f1a',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            {useCustom && (finalAmount < 1 || finalAmount > 1000) && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>Enter an amount between $1 and $1,000 CAD</div>
            )}
          </div>

          {error && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Donate button */}
          <button
            onClick={handleDonate}
            disabled={loading || finalAmount < 1 || finalAmount > 1000}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: (loading || finalAmount < 1) ? '#374151' : '#F59E0B',
              color: (loading || finalAmount < 1) ? '#6b7280' : '#1a1a2e',
              fontWeight: '900',
              fontSize: '16px',
              border: 'none',
              borderRadius: '12px',
              cursor: (loading || finalAmount < 1) ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Redirecting...' : `☕ Donate $${finalAmount.toFixed(0)} CAD`}
          </button>

          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: '#6b7280' }}>
            Secure payment via Stripe. One-time, no recurring charges.
          </div>
        </div>

        {/* Thanks message */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#9ca3af', lineHeight: '1.6' }}>
          Thank you for believing in SetReady. Every contribution helps us keep the platform free for performers across Canada. 🇨🇦
        </div>
      </div>
    </div>
  )
}
