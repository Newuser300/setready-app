'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
const supabase = createClient()

// ── Types ─────────────────────────────────────────────────────────────────────

interface InviteData {
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  gender: string | null
  date_of_birth: string | null
  height_cm: number | null
  hair_color: string | null
  eye_color: string | null
  union_status: string | null
  special_skills: string | null
  agency_name: string
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#1a1a2e',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#fafafa',
  fontFamily: 'inherit',
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#6b7280',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const UNION_OPTIONS = ['non-union', 'ubcp', 'actra', 'actra-apprentice']

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [invite, setInvite] = useState<InviteData | null>(null)

  // Editable fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [hairColor, setHairColor] = useState('')
  const [eyeColor, setEyeColor] = useState('')
  const [unionStatus, setUnionStatus] = useState('')
  const [skills, setSkills] = useState('')
  const [bio, setBio] = useState('')

  // Auth
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // ── Load invite ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return  // params not resolved yet — wait for next render
    fetch(`/api/claim/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error || !data.invite) {
          setNotFound(true)
        } else {
          const inv: InviteData = data.invite
          setInvite(inv)
          setFirstName(inv.first_name || '')
          setLastName(inv.last_name || '')
          setPhone(inv.phone || '')
          setGender(inv.gender || '')
          setDob(inv.date_of_birth || '')
          setHeightCm(inv.height_cm != null ? String(inv.height_cm) : '')
          setHairColor(inv.hair_color || '')
          setEyeColor(inv.eye_color || '')
          setUnionStatus(inv.union_status || '')
          setSkills(inv.special_skills || '')
        }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)

    const res = await fetch(`/api/claim/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        gender: gender || null,
        date_of_birth: dob.trim() || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        hair_color: hairColor.trim() || null,
        eye_color: eyeColor.trim() || null,
        union_status: unionStatus || null,
        special_skills: skills.trim()
          ? skills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        bio: bio.trim() || null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    // Account created — sign in immediately
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: invite!.email,
      password,
    })

    if (signInErr) {
      // Account exists but sign-in failed — send them to sign-in page
      setDone(true)
      setSubmitting(false)
      return
    }

    setDone(true)
    setSubmitting(false)

    // Brief delay so state shows, then navigate
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 2000)
  }

  // ── Loading / Error / Success states ────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: '15px' }}>Loading your invite…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔗</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#1a1a2e', margin: '0 0 10px' }}>
            Invite Not Found
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 24px', lineHeight: '1.6' }}>
            This invite link is invalid or has already been used. If you already claimed your profile, sign in below.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/sign-in" style={{ padding: '12px 24px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: 700, fontSize: '14px', borderRadius: '8px', textDecoration: 'none' }}>
              Sign In
            </Link>
            <Link href="/auth/sign-up" style={{ padding: '12px 24px', backgroundColor: 'transparent', color: '#6b7280', fontWeight: 600, fontSize: '14px', borderRadius: '8px', textDecoration: 'none', border: '1px solid #e5e7eb' }}>
              Create New Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', color: '#1a1a2e', margin: '0 0 10px' }}>
            Welcome to BGReady!
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 20px', lineHeight: '1.6' }}>
            Your profile has been created. Redirecting you to your dashboard…
          </p>
          <Link href="/dashboard" style={{ padding: '12px 24px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: 700, fontSize: '14px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}>
            Go to Dashboard →
          </Link>
        </div>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#F59E0B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px', color: '#1a1a2e' }}>SR</div>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, color: '#1a1a2e' }}>BGReady</span>
          </div>
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', textAlign: 'left', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.6' }}>
              <strong>{invite?.agency_name}</strong> has invited you to join BGReady and added some info to get you started.{' '}
              <strong>Review and correct anything below</strong>, then set your password to claim your profile.
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
            Your profile stays <strong>private</strong> until you confirm here.
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── SECTION: Your Info ──────────────────────────────────────────── */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Your Info</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>First Name</label>
                <input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div>
                <label style={lbl}>Last Name</label>
                <input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Email <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(set by invite — contact your agent to change)</span></label>
              <input style={{ ...inp, backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }} value={invite?.email || ''} readOnly />
            </div>

            <div>
              <label style={lbl}>Phone</label>
              <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="604-555-0100" type="tel" />
            </div>
          </div>

          {/* ── SECTION: Physical ──────────────────────────────────────────── */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Physical Details</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Gender</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Date of Birth</label>
                <input style={inp} value={dob} onChange={e => setDob(e.target.value)} placeholder="YYYY-MM-DD" type="date" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Height (cm)</label>
                <input style={inp} value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="168" type="number" min="100" max="250" />
              </div>
              <div>
                <label style={lbl}>Hair Color</label>
                <input style={inp} value={hairColor} onChange={e => setHairColor(e.target.value)} placeholder="Brown" />
              </div>
              <div>
                <label style={lbl}>Eye Color</label>
                <input style={inp} value={eyeColor} onChange={e => setEyeColor(e.target.value)} placeholder="Blue" />
              </div>
            </div>
          </div>

          {/* ── SECTION: Career ─────────────────────────────────────────────── */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Career</h2>

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Union Status</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={unionStatus} onChange={e => setUnionStatus(e.target.value)}>
                <option value="">Select…</option>
                {UNION_OPTIONS.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Special Skills <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></label>
              <input style={inp} value={skills} onChange={e => setSkills(e.target.value)} placeholder="Horseback riding, Piano, Spanish, Stunt driving…" />
            </div>

            <div>
              <label style={lbl}>Bio <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <textarea
                style={{ ...inp, resize: 'vertical', minHeight: '80px', lineHeight: '1.5' }}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A short professional bio…"
              />
            </div>
          </div>

          {/* ── SECTION: Set Password ──────────────────────────────────────── */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Create Your Password</h2>

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...inp, paddingRight: '44px' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, fontSize: '12px' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label style={lbl}>Confirm Password</label>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                style={inp}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Consent notice */}
          <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginBottom: '16px', lineHeight: '1.5' }}>
            By clicking Confirm, you agree to BGReady&apos;s{' '}
            <Link href="/terms" style={{ color: '#F59E0B' }}>Terms of Service</Link> and{' '}
            <Link href="/privacy" style={{ color: '#F59E0B' }}>Privacy Policy</Link>.
            Your profile will be visible to the inviting agency.
          </div>

          <button
            type="submit"
            disabled={submitting || !password || !confirmPassword}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: (submitting || !password || !confirmPassword) ? '#e5e7eb' : '#F59E0B',
              color: (submitting || !password || !confirmPassword) ? '#9ca3af' : '#1a1a2e',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: (submitting || !password || !confirmPassword) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {submitting ? 'Creating your profile…' : 'Confirm & Create My Profile'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#9ca3af' }}>
            Already have an account?{' '}
            <Link href="/auth/sign-in" style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
