'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Fires a lightweight page-view ping on every route change so the admin
// dashboard can show visit counts. Excludes /admin so your own dashboard
// browsing doesn't inflate the numbers. Fails silently.
export default function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/admin')) return
    try {
      fetch('/api/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* ignore */
    }
  }, [pathname])

  return null
}
