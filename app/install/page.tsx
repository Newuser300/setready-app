'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Tab = 'ios' | 'android' | 'desktop'

export default function InstallPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ios')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Auto-detect device
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) setActiveTab('ios')
    else if (/android/.test(ua)) setActiveTab('android')
    else setActiveTab('desktop')

    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)

    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ios', label: '📱 iPhone' },
    { id: 'android', label: '🤖 Android' },
    { id: 'desktop', label: '💻 Desktop' },
  ]

  const iosSteps = [
    { icon: '⬆️', title: 'Open in Safari', desc: 'Make sure you are using the Safari browser — Chrome on iPhone does not support home screen installation.' },
    { icon: '⎙', title: 'Tap the Share button', desc: 'Tap the Share icon at the bottom of the browser (the box with an arrow pointing up).' },
    { icon: '＋', title: 'Tap "Add to Home Screen"', desc: 'Scroll down in the share sheet to find the "Add to Home Screen" option and tap it.' },
    { icon: '✓', title: 'Tap Add', desc: 'Confirm by tapping "Add" in the top right. BGReady appears on your home screen instantly.' },
  ]

  const androidSteps = [
    { icon: '⋮', title: 'Open Chrome menu', desc: 'Tap the three-dot menu icon in the top right corner of Chrome.' },
    { icon: '＋', title: 'Tap "Add to Home Screen"', desc: 'Scroll down in the menu to find "Add to Home Screen" and tap it.' },
    { icon: '✓', title: 'Tap Install', desc: 'A dialog will appear — tap "Install" to confirm. BGReady is now on your home screen.' },
  ]

  const desktopSteps = [
    { icon: '⊕', title: 'Look for the install icon', desc: 'In Chrome, Edge, or Brave, look for the install icon (⊕) in the address bar on the right side.' },
    { icon: '↓', title: 'Click "Install BGReady"', desc: 'Click the icon and select "Install BGReady" from the dropdown prompt.' },
    { icon: '✓', title: 'Launch from desktop', desc: 'BGReady now opens as a standalone app — no browser chrome, no tabs.' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f1a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', color: '#1a1a2e', fontFamily: 'Arial, sans-serif' }}>SR</div>
          <span style={{ fontWeight: '700', fontSize: '15px', color: 'white' }}>BGReady</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back</Link>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '48px 24px 32px', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '20px', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '24px', color: '#1a1a2e', fontFamily: 'Arial, sans-serif', margin: '0 auto 20px' }}>SR</div>
        {installed ? (
          <>
            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 10px' }}>✅ Already Installed!</h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.5' }}>You are using the BGReady app. No further action needed.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 10px', lineHeight: '1.2' }}>Install BGReady</h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.5' }}>Add to your home screen for instant access on set — works like a native app, no App Store needed.</p>
          </>
        )}
      </div>

      {!installed && (
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 20px 60px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px', marginBottom: '28px', gap: '4px' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: activeTab === t.id ? '#F59E0B' : 'transparent',
                  color: activeTab === t.id ? '#1a1a2e' : 'rgba(255,255,255,0.55)',
                  fontWeight: activeTab === t.id ? '700' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* iOS */}
          {activeTab === 'ios' && (
            <div>
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#92400e', marginBottom: '24px' }}>
                ⚠️ <strong>Safari only.</strong> Chrome on iPhone does not support home screen installation.
              </div>
              {iosSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', flexShrink: 0, color: '#F59E0B' }}>{s.icon}</div>
                  <div style={{ paddingTop: '4px' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '5px' }}>Step {i + 1}: {s.title}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.55' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Android */}
          {activeTab === 'android' && (
            <div>
              {deferredPrompt ? (
                <div style={{ textAlign: 'center', padding: '8px 0 32px' }}>
                  <button
                    onClick={handleInstall}
                    style={{ width: '100%', padding: '18px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', fontSize: '17px', border: 'none', borderRadius: '14px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}
                  >
                    📲 Install Now
                  </button>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '12px' }}>Tap to add BGReady to your home screen</p>
                </div>
              ) : (
                androidSteps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', flexShrink: 0, color: '#F59E0B' }}>{s.icon}</div>
                    <div style={{ paddingTop: '4px' }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '5px' }}>Step {i + 1}: {s.title}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.55' }}>{s.desc}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Desktop */}
          {activeTab === 'desktop' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {['✓ Chrome', '✓ Edge', '✓ Brave'].map(b => (
                  <span key={b} style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '5px 12px', fontSize: '13px', color: '#F59E0B', fontWeight: '600' }}>{b}</span>
                ))}
              </div>
              {desktopSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', flexShrink: 0, color: '#F59E0B' }}>{s.icon}</div>
                  <div style={{ paddingTop: '4px' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '5px' }}>Step {i + 1}: {s.title}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.55' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>Not supported in Firefox or Safari on desktop.</div>
            </div>
          )}

          {/* Footer note */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: '1.6' }}>
            Once installed, BGReady opens like a native app — no browser needed.
          </div>

          {/* CTA */}
          <div style={{ marginTop: '32px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: '0 0 14px' }}>Don&apos;t have an account yet?</p>
            <Link
              href="/auth/sign-up"
              style={{ display: 'inline-block', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', fontSize: '15px', padding: '13px 28px', borderRadius: '10px', textDecoration: 'none' }}
            >
              Create Free Account →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
