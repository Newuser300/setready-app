'use client'

import { createClient } from '@/utils/supabase/client'

type Props = {
  label?: string
  /** When true, the button is inert and calls onBlocked instead (used to enforce the age/Terms gate on sign-up). */
  disabled?: boolean
  onBlocked?: () => void
  /** Optional referral code to carry through the OAuth redirect. */
  referralCode?: string
  next?: string
}

export default function GoogleSignInButton({
  label = 'Continue with Google',
  disabled = false,
  onBlocked,
  referralCode,
  next = '/dashboard',
}: Props) {
  const handleClick = async () => {
    if (disabled) {
      onBlocked?.()
      return
    }
    const supabase = createClient()
    const origin = window.location.origin
    const ref = referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ''
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}${ref}`,
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        width: '100%',
        padding: '12px',
        backgroundColor: '#fff',
        color: '#1a1a2e',
        border: '1.5px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.964 10.705a5.41 5.41 0 0 1-.282-1.705c0-.593.102-1.17.282-1.705V4.963H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.332z" />
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.963L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
      </svg>
      {label}
    </button>
  )
}
