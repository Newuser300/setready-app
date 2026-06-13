'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const HAIR_COLORS = ['Black', 'Brown', 'Blonde', 'Red', 'Grey', 'White', 'Bald', 'Other']
const EYE_COLORS = ['Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Other']
const ETHNICITIES = [
  'Indigenous', 'Black', 'East Asian', 'South Asian',
  'Southeast Asian', 'Latin', 'Middle Eastern', 'White', 'Mixed', 'Other'
]
const UNION_STATUSES = [
  'Non-Union',
  'UBCP/ACTRA Permit',
  'UBCP/ACTRA Full Member',
  'IATSE',
  'Teamsters',
  'SAG-AFTRA',
  'Other',
]
const PRESET_SKILLS = [
  'Driving — Car', 'Driving — Truck', 'Driving — Motorcycle',
  'Swimming', 'Horse Riding', 'Martial Arts', 'Singing', 'Weapons Handling',
  'Dancing — Ballet', 'Dancing — Hip Hop', 'Dancing — Contemporary', 'Dancing — Latin',
  'Musical Instrument — Guitar', 'Musical Instrument — Piano', 'Musical Instrument — Drums',
  'Sports — Basketball', 'Sports — Baseball', 'Sports — Football',
  'Sports — Soccer', 'Sports — Ice Hockey', 'Sports — Tennis',
  'Sports — Golf', 'Sports — Boxing', 'Sports — Skiing / Snowboarding',
]

// ─── Shared sub-components ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: '16px', padding: '16px',
      marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', marginBottom: '12px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: '11px', fontWeight: '700',
      color: '#6b7280', marginBottom: '5px',
      textTransform: 'uppercase', letterSpacing: '0.06em'
    }}>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid #e5e7eb', borderRadius: '8px',
  fontSize: '14px', color: '#1a1a2e', outline: 'none',
  boxSizing: 'border-box', backgroundColor: 'white',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '32px',
}

const unitBtnStyle: React.CSSProperties = {
  padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '8px',
  background: '#f3f4f6', cursor: 'pointer', fontSize: '12px',
  fontWeight: '700', whiteSpace: 'nowrap', color: '#374151',
  flexShrink: 0,
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Headshot
  const [headshotUrl, setHeadshotUrl] = useState('')
  const [headshotFile, setHeadshotFile] = useState<File | null>(null)

  // Basic
  const [bio, setBio] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')

  // Physical — stored in cm / lbs internally
  const [heightCm, setHeightCm] = useState('')
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')
  const [weightLbs, setWeightLbs] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')

  // Appearance
  const [hairColor, setHairColor] = useState('')
  const [eyeColor, setEyeColor] = useState('')
  const [ethnicities, setEthnicities] = useState<string[]>([])

  // Industry
  const [unionStatus, setUnionStatus] = useState('')
  const [agencyId, setAgencyId] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  // Skills & Languages
  const [skills, setSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')
  const [languages, setLanguages] = useState<string[]>(['English'])
  const [langInput, setLangInput] = useState('')

  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([])
  const [videoReelUrl, setVideoReelUrl] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth/sign-in'); return }
      loadProfile()
      loadAgencies()
    })
  }, [router])

  async function loadProfile() {
    const res = await fetch('/api/profile')
    if (res.ok) {
      const p = await res.json()
      if (p) {
        setBio(p.bio || '')
        setGender(p.gender || '')
        setDob(p.date_of_birth || '')
        setHeightCm(p.height_cm?.toString() || '')
        setWeightLbs(p.weight_lbs?.toString() || '')
        setHairColor(p.hair_color || '')
        setEyeColor(p.eye_color || '')
        setEthnicities(p.ethnicity || [])
        setUnionStatus(p.union_status || '')
        setSkills(p.special_skills || [])
        setLanguages(p.languages?.length ? p.languages : ['English'])
        setAgencyId(p.agency_id || '')
        setIsPublic(p.is_public ?? true)
        setHeadshotUrl(p.headshot_url || '')
        setVideoReelUrl(p.video_reel_url || '')
      }
    }
    setLoading(false)
  }

  async function loadAgencies() {
    const { data } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('is_approved', true)
      .order('name')
    setAgencies(data || [])
  }

  // ── Height helpers ──────────────────────────────────────────────────────

  function heightDisplayVal() {
    if (!heightCm) return ''
    if (heightUnit === 'cm') return heightCm
    // Show total inches when in ft mode
    return String(Math.round(parseFloat(heightCm) / 2.54))
  }

  function onHeightChange(val: string) {
    if (heightUnit === 'cm') {
      setHeightCm(val)
    } else {
      const inches = parseFloat(val)
      setHeightCm(isNaN(inches) ? '' : String(Math.round(inches * 2.54)))
    }
  }

  function toggleHeightUnit() {
    setHeightUnit(u => (u === 'cm' ? 'ft' : 'cm'))
  }

  function heightHint() {
    if (!heightCm) return ''
    const cm = parseFloat(heightCm)
    if (heightUnit === 'cm') {
      const totalIn = Math.round(cm / 2.54)
      return `${Math.floor(totalIn / 12)}'${totalIn % 12}" (${cm} cm)`
    }
    return `${cm} cm`
  }

  // ── Weight helpers ──────────────────────────────────────────────────────

  function weightDisplayVal() {
    if (!weightLbs) return ''
    if (weightUnit === 'lbs') return weightLbs
    return String(Math.round(parseFloat(weightLbs) * 0.453592))
  }

  function onWeightChange(val: string) {
    if (weightUnit === 'lbs') {
      setWeightLbs(val)
    } else {
      const kg = parseFloat(val)
      setWeightLbs(isNaN(kg) ? '' : String(Math.round(kg / 0.453592)))
    }
  }

  function toggleWeightUnit() {
    setWeightUnit(u => (u === 'lbs' ? 'kg' : 'lbs'))
  }

  // ── Toggles ─────────────────────────────────────────────────────────────

  function toggleEthnicity(e: string) {
    setEthnicities(p => p.includes(e) ? p.filter(x => x !== e) : [...p, e])
  }

  function toggleSkill(s: string) {
    setSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  }

  function addCustomSkill() {
    const s = customSkill.trim()
    if (s && !skills.includes(s)) { setSkills(p => [...p, s]); setCustomSkill('') }
  }

  function addLanguage() {
    const l = langInput.trim()
    if (l && !languages.includes(l)) { setLanguages(p => [...p, l]); setLangInput('') }
  }

  function handleHeadshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMessage('Image must be under 5 MB.'); return }
    setHeadshotFile(file)
    setHeadshotUrl(URL.createObjectURL(file))
  }

  // ── Save ────────────────────────────────────────────────────────────────

  async function save() {
    setSaving(true)
    setMessage('')

    const formData = new FormData()
    if (headshotFile) formData.append('headshot', headshotFile)

    // Validate video URL if provided
    if (videoReelUrl && !/^https?:\/\/.+/.test(videoReelUrl)) {
      setMessage('❌ Video reel URL must start with https://')
      setSaving(false)
      return
    }

    formData.append('data', JSON.stringify({
      bio,
      gender,
      date_of_birth: dob || null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
      hair_color: hairColor,
      eye_color: eyeColor,
      ethnicity: ethnicities,
      union_status: unionStatus,
      special_skills: skills,
      languages,
      agency_id: agencyId || null,
      is_public: isPublic,
      video_reel_url: videoReelUrl || null,
    }))

    const res = await fetch('/api/profile', { method: 'POST', body: formData })

    if (res.ok) {
      const result = await res.json()
      if (result.headshot_url) setHeadshotUrl(result.headshot_url)
      setHeadshotFile(null)
      setMessage('')
      setToast('✅ Profile saved successfully!')
      setTimeout(() => setToast(''), 3000)
    } else {
      setMessage('❌ Failed to save. Please try again.')
    }
    setSaving(false)
  }

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280' }}>Loading profile...</p>
      </div>
    )
  }

  // ── Profile completion ───────────────────────────────────────────────────

  const completionScore = [
    headshotUrl ? 20 : 0,
    bio.trim().length > 20 ? 10 : 0,
    (heightCm && hairColor && eyeColor) ? 20 : 0,
    unionStatus ? 10 : 0,
    skills.length > 0 ? 10 : 0,
    languages.length > 0 ? 5 : 0,
    agencyId ? 20 : 0,
  ].reduce((a, b) => a + b, 0)

  const completionColor = completionScore < 40 ? '#ef4444' : completionScore < 80 ? '#f59e0b' : '#22c55e'

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '80px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1a1a2e', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', color: 'white', padding: '20px 24px' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '8px', fontSize: '14px' }}
        >
          ← Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>🎭 My Profile</h1>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>
              Your casting profile — visible to approved agents and casting directors
            </p>
          </div>
          {/* Completion ring */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ position: 'relative', width: '52px', height: '52px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '52px', height: '52px', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={completionColor} strokeWidth="3"
                  strokeDasharray={`${completionScore} ${100 - completionScore}`} strokeLinecap="round" />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: completionColor }}>
                {completionScore}%
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>Profile</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>

        {/* ── Headshot ── */}
        <Section title="📸 Headshot">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              overflow: 'hidden', border: '3px solid #e5e7eb',
              backgroundColor: '#f3f4f6', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {headshotUrl
                ? <img src={headshotUrl} alt="Headshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '36px' }}>👤</span>
              }
            </div>
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  padding: '8px 16px', backgroundColor: '#F59E0B',
                  color: '#1a1a2e', fontWeight: '700', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
                }}
              >
                {headshotUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0' }}>
                JPG or PNG, max 5 MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleHeadshotChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </Section>

        {/* ── Visibility ── */}
        <Section title="🔍 Profile Visibility">
          <div
            onClick={() => setIsPublic(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <div style={{
              width: '48px', height: '28px', borderRadius: '14px',
              backgroundColor: isPublic ? '#22c55e' : '#d1d5db',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0
            }}>
              <div style={{
                position: 'absolute', top: '4px',
                left: isPublic ? '24px' : '4px',
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: 'white', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ fontSize: '14px', color: '#374151' }}>
              {isPublic
                ? '✅ Visible to approved agents and casting directors'
                : '🔒 Profile hidden — not discoverable'}
            </span>
          </div>
        </Section>

        {/* ── Basic info ── */}
        <Section title="👤 Basic Info">
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <Label>Gender</Label>
              <select value={gender} onChange={e => setGender(e.target.value)} style={selectStyle}>
                <option value="">Select gender</option>
                {['Male', 'Female', 'Non-binary', 'Other'].map(g => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Date of Birth</Label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Height */}
              <div>
                <Label>Height</Label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    value={heightDisplayVal()}
                    onChange={e => onHeightChange(e.target.value)}
                    placeholder={heightUnit === 'cm' ? 'e.g. 175' : 'inches'}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={toggleHeightUnit} style={unitBtnStyle}>{heightUnit}</button>
                </div>
                {heightHint() && (
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '3px 0 0' }}>{heightHint()}</p>
                )}
              </div>

              {/* Weight */}
              <div>
                <Label>Weight</Label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    value={weightDisplayVal()}
                    onChange={e => onWeightChange(e.target.value)}
                    placeholder={weightUnit}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={toggleWeightUnit} style={unitBtnStyle}>{weightUnit}</button>
                </div>
                {weightLbs && (
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '3px 0 0' }}>
                    {weightUnit === 'lbs'
                      ? `≈ ${Math.round(parseFloat(weightLbs) * 0.453592)} kg`
                      : `${weightLbs} lbs`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Appearance ── */}
        <Section title="👁 Appearance">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Label>Hair Color</Label>
              <select value={hairColor} onChange={e => setHairColor(e.target.value)} style={selectStyle}>
                <option value="">Select</option>
                {HAIR_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Eye Color</Label>
              <select value={eyeColor} onChange={e => setEyeColor(e.target.value)} style={selectStyle}>
                <option value="">Select</option>
                {EYE_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* ── Ethnicity ── */}
        <Section title="🌍 Ethnicity">
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 10px' }}>Select all that apply</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ETHNICITIES.map(e => {
              const on = ethnicities.includes(e)
              return (
                <button
                  key={e}
                  onClick={() => toggleEthnicity(e)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px',
                    border: `1px solid ${on ? '#3b82f6' : '#e5e7eb'}`,
                    backgroundColor: on ? '#eff6ff' : 'white',
                    color: on ? '#1d4ed8' : '#374151',
                    fontSize: '13px', fontWeight: on ? '600' : '400',
                    cursor: 'pointer', transition: 'all 0.1s'
                  }}
                >
                  {on ? '✓ ' : ''}{e}
                </button>
              )
            })}
          </div>
        </Section>

        {/* ── Union status ── */}
        <Section title="🎬 Union Status">
          <select value={unionStatus} onChange={e => setUnionStatus(e.target.value)} style={selectStyle}>
            <option value="">Select status</option>
            {UNION_STATUSES.map(u => <option key={u}>{u}</option>)}
          </select>
        </Section>

        {/* ── Agency ── */}
        <Section title="🏢 Agency Representation">
          <select value={agencyId} onChange={e => setAgencyId(e.target.value)} style={selectStyle}>
            <option value="">Seeking Representation</option>
            {agencies.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0' }}>
            Only approved agencies appear here
          </p>
        </Section>

        {/* ── Bio ── */}
        <Section title="📝 Bio">
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 500))}
            placeholder="Tell casting directors about yourself — your experience, look, and personality..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0', textAlign: 'right' }}>
            {bio.length}/500
          </p>
        </Section>

        {/* ── Special Skills ── */}
        <Section title="⭐ Special Skills">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {PRESET_SKILLS.map(s => {
              const on = skills.includes(s)
              return (
                <button
                  key={s}
                  onClick={() => toggleSkill(s)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px',
                    border: `1px solid ${on ? '#F59E0B' : '#e5e7eb'}`,
                    backgroundColor: on ? '#fffbeb' : 'white',
                    color: on ? '#92400e' : '#374151',
                    fontSize: '12px', fontWeight: on ? '600' : '400', cursor: 'pointer'
                  }}
                >
                  {on ? '✓ ' : ''}{s}
                </button>
              )
            })}
          </div>

          {/* Custom skill input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={customSkill}
              onChange={e => setCustomSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
              placeholder="Add custom skill..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={addCustomSkill}
              style={{ padding: '0 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>

          {/* Custom skill chips */}
          {skills.filter(s => !PRESET_SKILLS.includes(s)).length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {skills.filter(s => !PRESET_SKILLS.includes(s)).map(s => (
                <span key={s} style={{
                  padding: '4px 10px', backgroundColor: '#fffbeb',
                  border: '1px solid #F59E0B', borderRadius: '20px',
                  fontSize: '12px', color: '#92400e',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  {s}
                  <button
                    onClick={() => setSkills(p => p.filter(x => x !== s))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', padding: '0', lineHeight: 1, fontSize: '14px' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* ── Languages ── */}
        <Section title="🗣 Languages">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {languages.map(l => (
              <span key={l} style={{
                padding: '4px 10px', backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe', borderRadius: '20px',
                fontSize: '13px', color: '#1d4ed8',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                {l}
                {l !== 'English' && (
                  <button
                    onClick={() => setLanguages(p => p.filter(x => x !== l))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', padding: '0', lineHeight: 1, fontSize: '14px' }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={langInput}
              onChange={e => setLangInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
              placeholder="Add language..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={addLanguage}
              style={{ padding: '0 16px', backgroundColor: '#3b82f6', color: 'white', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        </Section>

        {/* ── Video Reel ── */}
        <Section title="🎬 Video Reel">
          <div>
            <Label>YouTube or Vimeo URL</Label>
            <input
              value={videoReelUrl}
              onChange={e => setVideoReelUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              type="url"
              style={inputStyle}
            />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '5px 0 0' }}>
              Your showreel — visible to casting directors on your profile
            </p>
            {videoReelUrl && /youtube\.com|youtu\.be/.test(videoReelUrl) && (
              <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${videoReelUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]}`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </Section>

        {/* ── Save ── */}
        {message && (
          <div style={{
            padding: '12px 16px', borderRadius: '10px', marginBottom: '12px',
            textAlign: 'center', fontSize: '14px', fontWeight: '600',
            backgroundColor: message.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.startsWith('✅') ? '#86efac' : '#fca5a5'}`,
            color: message.startsWith('✅') ? '#15803d' : '#dc2626',
          }}>
            {message}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          style={{
            width: '100%', padding: '16px',
            backgroundColor: saving ? '#9ca3af' : '#F59E0B',
            color: saving ? 'white' : '#1a1a2e',
            fontWeight: '700', fontSize: '16px',
            border: 'none', borderRadius: '12px',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : '💾 Save Profile'}
        </button>

      </div>
    </div>
  )
}
