'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// Pages where the floating banner is allowed
const ALLOWED_PATHS = ['/', '/dashboard']

export default function PWAInstaller() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const pathname = usePathname()

  // Service worker registration and update flow. This deliberately lives in
  // its own effect, ungated: the old code returned early when running as an
  // installed PWA (the standalone check meant for the banner), so the
  // installed app never re-registered the worker and users kept seeing the
  // previous version until the browser's own ~24h update check.
  useEffect(() => {
    // In development, unregister any lingering service worker and clear caches,
    // then bail — Turbopack's changing filenames break cached responses.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker?.getRegistrations?.().then(
        rs => rs.forEach(r => r.unregister()))
      if (window.caches) caches.keys().then(
        ks => ks.forEach(k => caches.delete(k)))
      return
    }

    if (!('serviceWorker' in navigator)) return

    let onVisible: (() => void) | null = null

    // If a worker was already controlling this page, a controllerchange means
    // a NEW version just took over — reload once so it shows immediately.
    // (Without the hadController guard, the very first install would also
    // trigger a pointless reload via clients.claim().)
    const hadController = !!navigator.serviceWorker.controller
    let reloaded = false
    const onControllerChange = () => {
      if (!hadController || reloaded) return
      reloaded = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        // Check for a new build now…
        reg.update().catch(() => {})
        // …and every time the app comes back to the foreground. Tapping the
        // home-screen icon usually resumes the app rather than reloading it,
        // so this is the moment a stale PWA learns about the new version.
        onVisible = () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {})
        }
        document.addEventListener('visibilitychange', onVisible)
      })
      .catch(err => console.log('SW failed', err))

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      if (onVisible) document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Install banner — separate concern, keeps its original gating.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return

    // Only show on allowed pages
    if (!pathname || !ALLOWED_PATHS.includes(pathname)) return

    const dismissed = localStorage.getItem('sr-pwa-dismissed')
    if (dismissed) return

    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: any) => {
      e.preventDefault()
      setPrompt(e)
      // Show after 30 seconds so it doesn't interrupt on landing
      setTimeout(() => setShow(true), 30000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setShow(false))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [pathname])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setPrompt(null)
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('sr-pwa-dismissed', 'true')
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(440px, 92vw)',
      backgroundColor: '#1a1a2e',
      border: '2px solid #F59E0B',
      borderRadius: '18px',
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '14px',
        backgroundColor: '#F59E0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontWeight: '900',
        color: '#1a1a2e',
      }}>BG</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontWeight: '700', fontSize: '14px', lineHeight: '1.3' }}>
          Add BGReady to your home screen
        </div>
        <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '3px', lineHeight: '1.4' }}>
          Quick access on set — works like a native app
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <button onClick={install} style={{
          backgroundColor: '#F59E0B',
          color: '#1a1a2e',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 18px',
          fontWeight: '700',
          fontSize: '13px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}>📲 Install</button>
        <button onClick={dismiss} style={{
          backgroundColor: 'transparent',
          color: '#6b7280',
          border: 'none',
          borderRadius: '8px',
          padding: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          textAlign: 'center',
        }}>Not now</button>
      </div>
    </div>
  )
}
