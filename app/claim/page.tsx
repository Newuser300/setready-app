'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface ClaimData {
  invited_email: string
  agency_name: string
  prefilled_data: Record<string, unknown>
}

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '14px', color: '#1a1a2e', outline: 'none',
  boxSizing: 'border-box', backgroundColor: '#fafafa', fontFamily: 'inherit',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280',
  marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em',
}
const card: React.CSSProperties = {
  backgroundColor: 'white', borderRadius: '12px', padding: '24px',
  marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6',
}
const secTitle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 700, color: '#F59E0B',
  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px',
}

const UNION_OPTIONS = ['non-union', 'ubcp', 'actra', 'actra-apprentice']
const PROVINCES = [
  { code: 'BC', name: 'British Columbia' }, { code: 'AB', name: 'Alberta' },
  { code: 'SK', name: 'Saskatchewan' },    { code: 'MB', name: 'Manitoba' },
  { code: 'ON', name: 'Ontario' },         { code: 'QC', name: 'Quebec' },
  { code: 'NS', name: 'Nova Scotia' },     { code: 'NB', name: 'New Brunswick' },
  { code: 'PE', name: 'Prince Edward Island' }, { code: 'NL', name: 'Newfoundland & Labrador' },
  { code: 'YT', name: 'Yukon' },           { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
]

function ClaimContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? ''

  // Initialise synchronously so the "no token" error never requires a
  // setState-in-effect cycle: if token is absent on first render we already
  // have the right state without triggering a cascading re-render.
  const [loading,   setLoading]   = useState(() => !!token)
  const [apiError,  setApiError]  = useState(() => token ? '' : 'No invite token found in this URL.')
  const [claim,     setClaim]     = useState<ClaimData | null>(null)

  const [firstName,        setFirstName]        = useState('')
  const [lastName,         setLastName]         = useState('')
  const [phone,            setPhone]            = useState('')
  const [province,         setProvince]         = useState('')
  const [gender,           setGender]           = useState('')
  const [dob,              setDob]              = useState('')
  const [heightCm,         setHeightCm]         = useState('')
  const [hairColor,        setHairColor]        = useState('')
  const [eyeColor,         setEyeColor]         = useState('')
  const [bodyType,         setBodyType]         = useState('')
  const [ethnicity,        setEthnicity]        = useState('')
  const [unionStatus,      setUnionStatus]      = useState('')
  const [skills,           setSkills]           = useState('')
  const [languages,        setLanguages]        = useState('')
  const [accents,          setAccents]          = useState('')
  const [actingExperience, setActingExperience] = useState('')
  const [bio,              setBio]              = useState('')

  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [formError,       setFormError]       = useState('')
  const [done,            setDone]            = useState(false)

  useEffect(() => {
    if (!token) return  // no-token error is set by the useState initialiser above
    fetch(`/api/claim?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setApiError(data.error)
        } else {
          setClaim(data)
          const pf = data.prefilled_data || {}
          setFirstName(String(pf.first_name  || ''))
          setLastName( String(pf.last_name   || ''))
          setPhone(    String(pf.phone        || ''))
          setGender(   String(pf.gender       || ''))
          setDob(      String(pf.date_of_birth || ''))
          setHeightCm( pf.height_cm != null ? String(pf.height_cm) : '')
          setHairColor(String(pf.hair_color   || ''))
          setEyeColor( String(pf.eye_color    || ''))
          setUnionStatus(String(pf.union_status || ''))
          if (pf.special_skills) {
            const s = Array.isArray(pf.special_skills)
              ? (pf.special_skills as string[]).join(', ')
              : String(pf.special_skills)
            setSkills(s)
          }
        }
        setLoading(false)
      })
      .catch(() => {
        setApiError('Failed to load your invite. Please try again.')
        setLoading(false)
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (password !== confirmPassword) { setFormError('Passwords do not match.'); return }
    if (password.length < 6) { setFormError('Password must be at least 6 characters.'); return }
    setSubmitting(true)

    const toArr = (s: string) =>
      s.trim() ? s.split(',').map(x => x.trim()).filter(Boolean) : []

    const res = await fetch('/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password,
        first_name:         firstName.trim()        || null,
        last_name:          lastName.trim()          || null,
        phone:              phone.trim()             || null,
        province:           province                 || null,
        gender:             gender                   || null,
        date_of_birth:      dob.trim()               || null,
        height_cm:          heightCm ? parseFloat(heightCm) : null,
        hair_color:         hairColor.trim()         || null,
        eye_color:          eyeColor.trim()          || null,
        body_type:          bodyType.trim()          || null,
        ethnicity:          ethnicity.trim()         || null,
        union_status:       unionStatus              || null,
        bio:                bio.trim()               || null,
        acting_experience:  actingExperience.trim()  || null,
        special_skills:     toArr(skills),
        languages:          toArr(languages),
        accents:            toArr(accents),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    await supabase.auth.signInWithPassword({ email: claim!.invited_email, password })
    setSubmitting(false)
    setDone(true)
    setTimeout(() => { window.location.href = '/dashboard' }, 1800)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6b7280', fontSize: '15px' }}>Loading your invite…</div>
    </div>
  )

  if (apiError) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔗</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#1a1a2e', margin: '0 0 10px' }}>Invite Not Found</h1>
        <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 24px', lineHeight: '1.6' }}>{apiError}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/sign-in" style={{ padding: '12px 24px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: 700, fontSize: '14px', borderRadius: '8px', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/auth/sign-up" style={{ padding: '12px 24px', backgroundColor: 'transparent', color: '#6b7280', fontWeight: 600, fontSize: '14px', borderRadius: '8px', textDecoration: 'none', border: '1px solid #e5e7eb' }}>Create New Account</Link>
        </div>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', color: '#1a1a2e', margin: '0 0 10px' }}>Welcome to SetReady!</h1>
        <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 20px', lineHeight: '1.6' }}>
          Your profile is live and linked to <strong>{claim?.agency_name}</strong>. Taking you to your dashboard…
        </p>
        <Link href="/dashboard" style={{ padding: '12px 24px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: 700, fontSize: '14px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}>
          Go to Dashboard →
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#F59E0B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px', color: '#1a1a2e' }}>SR</div>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, color: '#1a1a2e' }}>SetReady</span>
          </div>
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', textAlign: 'left', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.6' }}>
              <strong>{claim?.agency_name}</strong> has invited you to join SetReady and added some info to get you started.{' '}
              <strong>Review and correct anything below</strong>, then set your password to claim your profile.
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
            Your profile stays <strong>private</strong> until you confirm here.
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── YOUR INFO ────────────────────────────────────────────────── */}
          <div style={card}>
            <h2 style={secTitle}>Your Info</h2>
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
              <label style={lbl}>Email <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(set by invite)</span></label>
              <input style={{ ...inp, backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }} value={claim?.invited_email || ''} readOnly />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Phone</label>
                <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="604-555-0100" type="tel" />
              </div>
              <div>
                <label style={lbl}>Province</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={province} onChange={e => setProvince(e.target.value)}>
                  <option value="">Select…</option>
                  {PROVINCES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── PHYSICAL ─────────────────────────────────────────────────── */}
          <div style={card}>
            <h2 style={secTitle}>Physical Details</h2>
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
                <input style={inp} value={dob} onChange={e => setDob(e.target.value)} type="date" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Body Type <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input style={inp} value={bodyType} onChange={e => setBodyType(e.target.value)} placeholder="Athletic, slim, average…" />
              </div>
              <div>
                <label style={lbl}>Ethnicity <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input style={inp} value={ethnicity} onChange={e => setEthnicity(e.target.value)} placeholder="Self-describe" />
              </div>
            </div>
          </div>

          {/* ── CAREER ────────────────────────────────────────────────────── */}
          <div style={card}>
            <h2 style={secTitle}>Career &amp; Skills</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Union Status</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={unionStatus} onChange={e => setUnionStatus(e.target.value)}>
                <option value="">Select…</option>
                {UNION_OPTIONS.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Special Skills <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></label>
              <input style={inp} value={skills} onChange={e => setSkills(e.target.value)} placeholder="Horseback riding, Piano, Stage combat…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Languages <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></label>
                <input style={inp} value={languages} onChange={e => setLanguages(e.target.value)} placeholder="English, French…" />
              </div>
              <div>
                <label style={lbl}>Accents <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></label>
                <input style={inp} value={accents} onChange={e => setAccents(e.target.value)} placeholder="British RP, Southern…" />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Acting Experience <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input style={inp} value={actingExperience} onChange={e => setActingExperience(e.target.value)} placeholder="e.g. 5 years background, beginner, 10+ years film/TV" />
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

          {/* ── PASSWORD ──────────────────────────────────────────────────── */}
          <div style={card}>
            <h2 style={secTitle}>Create Your Password</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...inp, paddingRight: '52px' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '12px', fontFamily: 'inherit', padding: 0 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label style={lbl}>Confirm Password</label>
              <input required type={showPassword ? 'text' : 'password'} style={inp} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
            </div>
          </div>

          {formError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
              {formError}
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginBottom: '16px', lineHeight: '1.5' }}>
            By clicking Confirm, you agree to SetReady&apos;s{' '}
            <Link href="/terms" style={{ color: '#F59E0B' }}>Terms of Service</Link> and{' '}
            <Link href="/privacy" style={{ color: '#F59E0B' }}>Privacy Policy</Link>.
            Your profile will be visible to <strong>{claim?.agency_name}</strong>.
          </div>

          <button
            type="submit"
            disabled={submitting || !password || !confirmPassword}
            style={{
              width: '100%', padding: '14px',
              backgroundColor: (submitting || !password || !confirmPassword) ? '#e5e7eb' : '#F59E0B',
              color: (submitting || !password || !confirmPassword) ? '#9ca3af' : '#1a1a2e',
              border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
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

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: '15px' }}>Loading…</div>
      </div>
    }>
      <ClaimContent />
    </Suspense>
  )
}
