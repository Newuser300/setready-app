'use client'
import { useEffect, useState } from 'react'

export default function PWAInstaller() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('sr-pwa-dismissed')
    if (dismissed) return

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('SW registered', reg.scope))
        .catch(err => console.log('SW failed', err))
    }

    const handler = (e: any) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setShow(false))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

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
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(420px, 92vw)',
      backgroundColor: '#1a1a2e',
      border: '2px solid #F59E0B',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      zIndex: 9999,
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#F59E0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: '900',
        color: '#1a1a2e',
      }}>SR</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>
          Add SetReady to your home screen
        </div>
        <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
          Quick access on set — works offline
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={install} style={{
          backgroundColor: '#F59E0B',
          color: '#1a1a2e',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          fontWeight: '700',
          fontSize: '13px',
          cursor: 'pointer',
        }}>Install</button>
        <button onClick={dismiss} style={{
          backgroundColor: 'transparent',
          color: '#6b7280',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '8px 10px',
          cursor: 'pointer',
          fontSize: '13px',
        }}>✕</button>
      </div>
    </div>
  )
}
