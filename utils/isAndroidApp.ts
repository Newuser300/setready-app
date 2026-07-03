/**
 * Median (formerly GoNative) native app detection.
 * Median automatically appends "median" (or "gonative" for older builds)
 * to the user agent on both iOS and Android. The android-app:// referrer
 * is kept as an extra fallback for TWA-style builds.
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('median') || ua.includes('gonative')) return true
  try {
    if (document.referrer.startsWith('android-app://')) return true
  } catch { /* ignore */ }
  return false
}

/**
 * Open a Stripe Checkout URL.
 * Inside the native app wrapper → external browser (store compliance).
 * Everywhere else               → same-tab redirect (existing behaviour).
 */
export function openCheckout(url: string): void {
  if (isNativeApp()) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    window.location.href = url
  }
}
