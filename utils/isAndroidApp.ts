/**
 * Android wrapper detection
 *
 * The Android app wrapper must append the token below to its WebView user-agent,
 * e.g. via WebSettings.setUserAgentString(existing + " SetReadyApp/1.0").
 * TWA-style wrappers are also detected via the android-app:// referrer that
 * Chrome injects on the very first navigation.
 */
const ANDROID_UA_TOKEN = 'SetReadyApp'

export function isAndroidApp(): boolean {
  if (typeof window === 'undefined') return false
  if (navigator.userAgent.includes(ANDROID_UA_TOKEN)) return true
  try {
    if (document.referrer.startsWith('android-app://')) return true
  } catch { /* ignore */ }
  return false
}

/**
 * Open a Stripe Checkout URL.
 * Inside the Android wrapper → external browser (Google Play compliance).
 * Everywhere else          → same-tab redirect (existing behaviour).
 */
export function openCheckout(url: string): void {
  if (isAndroidApp()) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    window.location.href = url
  }
}
