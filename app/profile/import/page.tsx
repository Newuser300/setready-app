'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Field definitions for progress tracking ──────────────────────────────────

const SCORED_FIELDS = [
  'first_name', 'last_name', 'phone', 'gender', 'date_of_birth',
  'height_cm', 'hair_color', 'eye_color', 'body_type', 'ethnicity',
  'union_status', 'skills', 'bio', 'headshot',
]

const UNION_OPTIONS = [
  { value: 'non-union', label: 'Non-Union' },
  { value: 'ubcp', label: 'UBCP' },
  { value: 'actra', label: 'ACTRA' },
  { value: 'actra-apprentice', label: 'ACTRA Apprentice' },
]

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

const card: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid #f3f4f6',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#F59E0B',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 16px',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // Auth gate
  const [authChecked, setAuthChecked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // AI
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiDraft, setAiDraft] = useState(false)

  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [hairColor, setHairColor] = useState('')
  const [eyeColor, setEyeColor] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [ethnicity, setEthnicity] = useState('')
  const [unionStatus, setUnionStatus] = useState('')
  const [skills, setSkills] = useState('')
  const [bio, setBio] = useState('')

  // Headshot
  const [headshotFile, setHeadshotFile] = useState<File | null>(null)
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null)
  const [draggingHeadshot, setDraggingHeadshot] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [done, setDone] = useState(false)

  // ── Auth check ─────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (!data.user) {
        router.replace('/auth/sign-in?next=/profile/import')
      } else {
        setUserId(data.user.id)
        setAuthChecked(true)
      }
    })
  }, [router])

  // ── Check AI availability ──────────────────────────────────────────────────

  useEffect(() => {
    if (!authChecked) return
    fetch('/api/profile/ai-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    }).then(r => {
      // 503 = not configured; 400 = configured but bad input (good)
      setAiEnabled(r.status !== 503)
    }).catch(() => setAiEnabled(false))
  }, [authChecked])

  // ── Progress calculation ────────────────────────────────────────────────────

  const progress = Math.round(
    ([
      firstName, lastName, phone, gender, dob,
      heightCm, hairColor, eyeColor, bodyType, ethnicity,
      unionStatus, skills, bio,
      headshotFile ? 'yes' : '',
    ].filter(Boolean).length / SCORED_FIELDS.length) * 100
  )

  // ── AI parse ───────────────────────────────────────────────────────────────

  const handleAiParse = useCallback(async () => {
    if (!aiText.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/profile/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'Parse failed — fill in manually below.')
        setAiLoading(false)
        return
      }
      const p = data.parsed || {}
      if (p.gender)        setGender(p.gender)
      if (p.date_of_birth) setDob(p.date_of_birth)
      if (p.height_cm)     setHeightCm(String(p.height_cm))
      if (p.hair_color)    setHairColor(p.hair_color)
      if (p.eye_color)     setEyeColor(p.eye_color)
      if (p.body_type)     setBodyType(p.body_type)
      if (p.ethnicity)     setEthnicity(p.ethnicity)
      if (p.union_status)  setUnionStatus(p.union_status)
      if (p.special_skills?.length) setSkills(p.special_skills.join(', '))
      if (p.bio)           setBio(p.bio)
      setAiDraft(true)
    } catch {
      setAiError('Network error — fill in manually below.')
    }
    setAiLoading(false)
  }, [aiText])

  // ── Headshot handling ──────────────────────────────────────────────────────

  function handleHeadshotFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setHeadshotFile(file)
    const reader = new FileReader()
    reader.onload = e => setHeadshotPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')

    try {
      // Upload headshot if provided
      let headshotUrl: string | undefined
      if (headshotFile && userId) {
        const fd = new FormData()
        fd.append('photo', headshotFile)
        fd.append('type', 'full_body_front')
        const uploadRes = await fetch('/api/profile/photo', { method: 'POST', body: fd })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          headshotUrl = uploadData.url
        }
        // Non-blocking — if upload fails we still save the rest
      }

      const profilePayload: Record<string, unknown> = {
        phone: phone.trim() || null,
        gender: gender || null,
        date_of_birth: dob.trim() || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        hair_color: hairColor.trim() || null,
        eye_color: eyeColor.trim() || null,
        body_type: bodyType.trim() || null,
        ethnicity: ethnicity.trim() || null,
        union_status: unionStatus || null,
        special_skills: skills.trim()
          ? skills.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        bio: bio.trim() || null,
        is_public: false,
        ...(headshotUrl ? { headshot_url: headshotUrl } : {}),
      }

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      })

      if (!res.ok) {
        const d = await res.json()
        setSaveError(d.error || 'Save failed — please try again.')
        setSaving(false)
        return
      }

      // Update name in users table via name update — uses sign-up pattern
      if (firstName || lastName) {
        const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
        await supabase.auth.updateUser({ data: { name: fullName } })
      }

      setDone(true)
    } catch {
      setSaveError('Network error — please try again.')
    }
    setSaving(false)
  }

  // ── Loading / Done states ──────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280' }}>Loading…</div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', color: '#1a1a2e', margin: '0 0 10px' }}>Profile Saved!</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Your profile is saved privately. Go to <strong>Profile Settings</strong> when you're ready to make it visible to casting directors.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Link href="/profile" style={{ padding: '12px 20px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: 700, fontSize: '14px', borderRadius: '8px', textDecoration: 'none' }}>
              View My Profile
            </Link>
            <Link href="/dashboard" style={{ padding: '12px 20px', backgroundColor: 'transparent', color: '#6b7280', fontWeight: 600, fontSize: '14px', borderRadius: '8px', textDecoration: 'none', border: '1px solid #e5e7eb' }}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Main wizard ────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', backgroundColor: '#F59E0B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '11px', color: '#1a1a2e' }}>SR</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>Build Your Profile</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>About 5 minutes</div>
              </div>
            </div>
            <Link href="/dashboard" style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}>Skip for now →</Link>
          </div>

          {/* Progress bar */}
          <div style={{ height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#F59E0B', borderRadius: '3px', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', textAlign: 'right' }}>{progress}% complete</div>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* ── AI PASTE-TO-FILL ────────────────────────────────────────────── */}
        {aiEnabled && (
          <div style={{ ...card, backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <h2 style={{ ...sectionTitle, color: '#92400e', margin: '0 0 6px' }}>✨ AI Fill-In (Optional)</h2>
            <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 12px', lineHeight: '1.5' }}>
              Paste your existing bio, resume blurb, or describe yourself in plain English. AI will extract what it finds and pre-fill the form below — <strong>you review before saving</strong>.
            </p>
            <textarea
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              placeholder={'Example:\n"I\'m a 28-year-old female actor, 5\'6", non-union. Brown hair, green eyes. Skilled in horseback riding, piano, and fluent Spanish. Based in Vancouver."'}
              style={{
                ...inp,
                minHeight: '100px',
                resize: 'vertical',
                lineHeight: '1.5',
                marginBottom: '10px',
                backgroundColor: 'white',
                border: '1px solid #fde68a',
              }}
            />
            {aiError && (
              <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>{aiError}</div>
            )}
            {aiDraft && (
              <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, marginBottom: '8px' }}>
                ✓ Fields pre-filled from your text — review and edit below before saving.
              </div>
            )}
            <button
              type="button"
              onClick={handleAiParse}
              disabled={aiLoading || !aiText.trim()}
              style={{
                padding: '9px 18px',
                backgroundColor: (!aiLoading && aiText.trim()) ? '#F59E0B' : '#e5e7eb',
                color: (!aiLoading && aiText.trim()) ? '#1a1a2e' : '#9ca3af',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: (!aiLoading && aiText.trim()) ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              {aiLoading ? 'Parsing…' : '✨ Fill From Text'}
            </button>
          </div>
        )}

        {aiEnabled === false && (
          <div style={{ ...card, border: '1px dashed #e5e7eb', textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
              Fill in your details below — it only takes a few minutes.
            </div>
          </div>
        )}

        <form onSubmit={handleSave}>

          {/* ── ABOUT ME ──────────────────────────────────────────────────── */}
          <div style={card}>
            <h2 style={sectionTitle}>About You</h2>
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
            <div>
              <label style={lbl}>Phone <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="604-555-0100" type="tel" />
            </div>
          </div>

          {/* ── PHYSICAL ──────────────────────────────────────────────────── */}
          <div style={card}>
            <h2 style={sectionTitle}>Physical Details</h2>

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
            <h2 style={sectionTitle}>Career & Skills</h2>

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Union Status</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={unionStatus} onChange={e => setUnionStatus(e.target.value)}>
                <option value="">Select…</option>
                {UNION_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Special Skills <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></label>
              <input
                style={inp}
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="Horseback riding, Piano, Spanish, Stunt driving, Stage combat…"
              />
            </div>

            <div>
              <label style={lbl}>Bio <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(1–3 sentences)</span></label>
              <textarea
                style={{ ...inp, resize: 'vertical', minHeight: '90px', lineHeight: '1.55' }}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A short professional bio that casting directors will see…"
              />
            </div>
          </div>

          {/* ── HEADSHOT ──────────────────────────────────────────────────── */}
          <div style={card}>
            <h2 style={sectionTitle}>Headshot / Photo</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 14px', lineHeight: '1.5' }}>
              Upload a clear, well-lit photo. You can update this anytime from your profile page.
            </p>

            {headshotPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <img src={headshotPreview} alt="Preview" style={{ width: '100px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #F59E0B' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600, marginBottom: '6px' }}>✓ {headshotFile?.name}</div>
                  <button
                    type="button"
                    onClick={() => { setHeadshotFile(null); setHeadshotPreview(null) }}
                    style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDraggingHeadshot(true) }}
                onDragLeave={() => setDraggingHeadshot(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDraggingHeadshot(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleHeadshotFile(file)
                }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${draggingHeadshot ? '#F59E0B' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  padding: '32px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: draggingHeadshot ? '#fffbeb' : '#fafafa',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📷</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                  Drop photo here or click to browse
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>JPG, PNG — max 5 MB</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleHeadshotFile(f); e.target.value = '' }} style={{ display: 'none' }} />
          </div>

          {/* AI draft notice */}
          {aiDraft && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span>
                <strong>AI Draft:</strong> The fields above were pre-filled from your text. Please review everything carefully before saving — AI can make mistakes.
              </span>
            </div>
          )}

          {/* Privacy note */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#15803d' }}>
            🔒 Your profile is saved as <strong>private</strong>. Go to Profile Settings to make it visible to casting directors when you're ready.
          </div>

          {saveError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
              {saveError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: saving ? '#e5e7eb' : '#F59E0B',
              color: saving ? '#9ca3af' : '#1a1a2e',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving…' : 'Save My Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
