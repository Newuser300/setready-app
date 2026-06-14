'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getUnionRules, calculateQualifyingDays, type UnionRequirement } from '@/lib/union-rules'

type Voucher = {
  id: string
  user_id: string
  voucher_number: string | null
  production_name: string
  production_type: string | null
  shoot_date: string
  role_type: string | null
  union_type: string | null
  is_qualifying: boolean
  days_worked: number
  photo_url: string | null
  photo_filename: string | null
  status: string
  notes: string | null
  created_at: string
}

type FilterTab = 'all' | 'qualifying' | 'non-qualifying' | 'in-window' | 'outside-window'

type MilestoneData = {
  title: string
  message: string
  type: string
  qualifyingDays: number
  unionName: string
  tierName: string
  website: string
}

const PRODUCTION_TYPES = ['film', 'tv', 'commercial', 'music-video', 'corporate', 'other']
const ROLE_TYPES = ['general-bg', 'stand-in', 'special-ability', 'photo-double', 'other']
const UNION_TYPES = ['ubcp', 'actra', 'non-union']

function CircleProgress({ percent, days, required }: { percent: number; days: number; required: number }) {
  const r = 68
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
      <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke="#F59E0B" strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '36px', fontWeight: '900', color: '#1a1a2e', lineHeight: 1 }}>{days}</span>
        <span style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>of {required} days</span>
      </div>
    </div>
  )
}

function Confetti() {
  const colors = ['#F59E0B', '#1a1a2e', '#ffffff', '#ef4444', '#22c55e']
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: '-10px',
            animation: `confettiFall ${1.5 + Math.random() * 2}s linear ${Math.random() * 1}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default function VoucherWallet() {
  const router = useRouter()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [province, setProvince] = useState('ON')
  const [rules, setRules] = useState<UnionRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [showForm, setShowForm] = useState(false)
  const [showInfoSection, setShowInfoSection] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null)
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [milestoneData, setMilestoneData] = useState<MilestoneData | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    productionName: '',
    productionType: 'film',
    shootDate: '',
    roleType: 'general-bg',
    unionType: 'ubcp',
    isQualifying: true,
    daysWorked: 1,
    voucherNumber: '',
    notes: '',
  })

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function load() {
    const token = await getToken()
    if (!token) { router.push('/auth/sign-in'); return }
    const res = await fetch('/api/voucher-wallet', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setVouchers(data.vouchers || [])
    setProvince(data.province || 'ON')
    setRules(data.rules || [])
    setLoading(false)
    fetchSignedUrls(data.vouchers || [])
  }

  async function fetchSignedUrls(vList: Voucher[]) {
    const token = await getToken()
    if (!token) return
    const withPhotos = vList.filter(v => v.photo_url)
    const urls: Record<string, string> = {}
    await Promise.all(withPhotos.map(async v => {
      const res = await fetch(`/api/voucher-wallet/signed-url?path=${encodeURIComponent(v.photo_url!)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        urls[v.id] = d.url
      }
    }))
    setSignedUrls(urls)
  }

  useEffect(() => { load() }, [])

  const rule = rules[0]
  const calc = rule ? calculateQualifyingDays(vouchers, rule) : null

  const windowStart = calc?.windowStart
  const isOutsideWindow = (date: string) => {
    if (!windowStart) return false
    return new Date(date) < windowStart
  }

  function getStatusMessage() {
    if (!calc || !rule) return ''
    const d = calc.qualifyingDays
    if (d >= rule.qualifyingDaysRequired) return `🎉 YOU QUALIFY! You have enough qualifying days to apply for ${rule.unionName} membership.`
    if (d >= 14) return `⚡ One more day! You're SO close to qualifying.`
    if (d >= 10) return `🔥 Almost there! Just ${calc.daysRemaining} more qualifying days needed.`
    if (d >= 5) return `📈 Good progress! You're ${calc.percentComplete}% of the way to ${rule?.unionName} membership.`
    return `🌱 You're just getting started. Keep booking!`
  }

  const outsideCount = vouchers.filter(v => isOutsideWindow(v.shoot_date)).length

  function filteredVouchers() {
    return vouchers.filter(v => {
      if (filterTab === 'qualifying') return v.is_qualifying
      if (filterTab === 'non-qualifying') return !v.is_qualifying
      if (filterTab === 'in-window') return !isOutsideWindow(v.shoot_date)
      if (filterTab === 'outside-window') return isOutsideWindow(v.shoot_date)
      return true
    })
  }

  const totalQualifying = vouchers.filter(v => v.is_qualifying).length
  const inWindow = vouchers.filter(v => !isOutsideWindow(v.shoot_date)).length
  const daysCounted = calc?.qualifyingDays || 0

  function resetForm() {
    setForm({ productionName: '', productionType: 'film', shootDate: '', roleType: 'general-bg', unionType: 'ubcp', isQualifying: true, daysWorked: 1, voucherNumber: '', notes: '' })
    setPhotoFile(null)
    setPhotoPreview(null)
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(v: Voucher) {
    setForm({
      productionName: v.production_name,
      productionType: v.production_type || 'film',
      shootDate: v.shoot_date,
      roleType: v.role_type || 'general-bg',
      unionType: v.union_type || 'ubcp',
      isQualifying: v.is_qualifying,
      daysWorked: v.days_worked,
      voucherNumber: v.voucher_number || '',
      notes: v.notes || '',
    })
    setEditingId(v.id)
    setPhotoFile(null)
    setPhotoPreview(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveVoucher() {
    if (!form.productionName || !form.shootDate) return
    setSaving(true)
    const token = await getToken()

    const qualifying = form.unionType !== 'non-union' && form.isQualifying

    try {
      let voucher: Voucher | null = null
      if (editingId) {
        const res = await fetch('/api/voucher-wallet', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: editingId, ...form, isQualifying: qualifying }),
        })
        const d = await res.json()
        voucher = d.voucher
      } else {
        const res = await fetch('/api/voucher-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...form, isQualifying: qualifying }),
        })
        const d = await res.json()
        voucher = d.voucher
        if (d.milestone && !editingId) {
          const currentRule = rules[0]
          setMilestoneData({
            title: d.milestone.title,
            message: d.milestone.message,
            type: d.milestone.type,
            qualifyingDays: calc?.qualifyingDays || 0,
            unionName: currentRule?.unionName || '',
            tierName: currentRule?.targetTier || '',
            website: currentRule?.website || '',
          })
          setShowMilestoneModal(true)
        }
      }

      if (voucher && photoFile) {
        setUploadingPhoto(true)
        const fd = new FormData()
        fd.append('file', photoFile)
        fd.append('voucherId', voucher.id)
        await fetch('/api/voucher-wallet/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        setUploadingPhoto(false)
      }

      await load()
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  async function deleteVoucher(id: string) {
    if (!confirm('Delete this voucher?')) return
    const token = await getToken()
    await fetch(`/api/voucher-wallet?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await load()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    const url = URL.createObjectURL(f)
    setPhotoPreview(url)
  }

  const isDateOutsideWindow = form.shootDate && windowStart && new Date(form.shootDate) < windowStart

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎫</div>
        <p style={{ color: '#6b7280' }}>Loading your voucher wallet...</p>
      </div>
    </div>
  )

  return (
    <>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#1a1a2e', color: 'white', padding: '20px 20px 24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px' }}>← Dashboard</Link>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px' }}>🎫 Voucher Wallet</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Track your union vouchers and your path to membership</p>
          </div>
        </div>

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px 16px 80px' }}>
          {/* ── SECTION 1: PROGRESS TRACKER ── */}
          {rule && calc && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', borderTop: '4px solid #F59E0B', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{ backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '700', fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}>🍁 {province}</span>
                <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: '700', fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}>{rule.unionName}</span>
                <span style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: '600', fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}>{rule.targetTier}</span>
              </div>

              <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
                <CircleProgress percent={calc.percentComplete} days={calc.qualifyingDays} required={rule.qualifyingDaysRequired} />
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e' }}>{calc.qualifyingDays} <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>qualifying days</span></div>
                    {calc.daysRemaining > 0 && (
                      <div style={{ fontSize: '14px', color: '#F59E0B', fontWeight: '600', marginTop: '4px' }}>{calc.daysRemaining} days still needed</div>
                    )}
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: `${calc.percentComplete}%`, backgroundColor: '#F59E0B', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{calc.percentComplete}% complete</div>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '14px', backgroundColor: calc.isQualified ? '#f0fdf4' : '#fafafa', borderRadius: '10px', border: `1px solid ${calc.isQualified ? '#bbf7d0' : '#f3f4f6'}` }}>
                <p style={{ margin: 0, fontSize: '14px', color: calc.isQualified ? '#166534' : '#374151', fontWeight: calc.isQualified ? '700' : '500', lineHeight: '1.5' }}>
                  {getStatusMessage()}
                </p>
                {calc.isQualified && (
                  <a href={rule.website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                    Apply for Membership →
                  </a>
                )}
              </div>

              <div style={{ marginTop: '16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontWeight: '700', fontSize: '13px', color: '#92400e', margin: '0 0 8px' }}>⚠️ Important — Read Before You Count</p>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#78350f', lineHeight: '1.8' }}>
                  <li>Only vouchers from {rule.unionName}-signatory productions count as qualifying days.</li>
                  <li>Days must be within the last {rule.timeWindowLabel} to count.</li>
                  <li>Each voucher = 1 qualifying day unless you worked multiple days.</li>
                  <li>{rule.notes}</li>
                </ul>
                <a href={rule.website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: '#92400e', fontWeight: '700' }}>
                  Verify Requirements →
                </a>
              </div>
            </div>
          )}

          {/* ── SECTION 2: TIME WINDOW ── */}
          {rule && calc && (
            <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 14px' }}>Your {rule.timeWindowLabel} Qualifying Window</h3>
              <div style={{ position: 'relative', height: '32px', backgroundColor: '#f3f4f6', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', backgroundColor: '#fef3c7', borderRadius: '8px' }} />
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, (calc.vouchersInWindow.length / Math.max(1, vouchers.length)) * 100)}%`, backgroundColor: '#F59E0B', borderRadius: '8px' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#1a1a2e' }}>
                  {calc.vouchersInWindow.length} voucher{calc.vouchersInWindow.length !== 1 ? 's' : ''} in window
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                <span>{calc.windowStart.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })}</span>
                <span>Today</span>
              </div>
              {outsideCount > 0 && (
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '10px 0 0' }}>
                  {outsideCount} older voucher{outsideCount !== 1 ? 's are' : ' is'} outside your {rule.timeWindowLabel} window and do not count toward membership.
                </p>
              )}
            </div>
          )}

          {/* ── SECTION 3: ADD VOUCHER FORM ── */}
          <div style={{ marginBottom: '16px' }}>
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                style={{ width: '100%', padding: '14px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span style={{ fontSize: '18px' }}>＋</span> Add Voucher
              </button>
            ) : (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 20px' }}>
                  {editingId ? 'Edit Voucher' : 'Add Voucher'}
                </h3>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Production Name */}
                  <div>
                    <label style={labelStyle}>Production Name *</label>
                    <input
                      value={form.productionName}
                      onChange={e => setForm(f => ({ ...f, productionName: e.target.value }))}
                      placeholder="e.g. Supernatural Season 15"
                      style={inputStyle}
                    />
                  </div>

                  {/* Shoot Date */}
                  <div>
                    <label style={labelStyle}>Shoot Date *</label>
                    <input
                      type="date"
                      value={form.shootDate}
                      onChange={e => setForm(f => ({ ...f, shootDate: e.target.value }))}
                      style={inputStyle}
                    />
                    {isDateOutsideWindow && (
                      <p style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: '600' }}>
                        ⚠️ This date is outside your qualifying window and won't count toward membership.
                      </p>
                    )}
                  </div>

                  {/* Production Type + Role Type */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Production Type</label>
                      <select value={form.productionType} onChange={e => setForm(f => ({ ...f, productionType: e.target.value }))} style={inputStyle}>
                        {PRODUCTION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Role Type</label>
                      <select value={form.roleType} onChange={e => setForm(f => ({ ...f, roleType: e.target.value }))} style={inputStyle}>
                        {ROLE_TYPES.map(t => <option key={t} value={t}>{t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Union Type */}
                  <div>
                    <label style={labelStyle}>Union / Non-Union</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {UNION_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, unionType: t, isQualifying: t !== 'non-union' }))}
                          style={{
                            padding: '12px 8px', border: `2px solid ${form.unionType === t ? '#1a1a2e' : '#e5e7eb'}`,
                            borderRadius: '10px', backgroundColor: form.unionType === t ? '#1a1a2e' : 'white',
                            color: form.unionType === t ? 'white' : '#374151', fontWeight: '700', fontSize: '13px',
                            cursor: 'pointer', textTransform: 'uppercase',
                          }}
                        >
                          {t === 'non-union' ? 'Non-Union' : t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {form.unionType === 'non-union' && (
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', backgroundColor: '#f9fafb', padding: '8px 10px', borderRadius: '8px' }}>
                        Non-union days do not count toward union membership. This will be saved but marked as non-qualifying.
                      </p>
                    )}
                  </div>

                  {/* Days Worked + Voucher Number */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Days Worked</label>
                      <input
                        type="number" min={1} max={30}
                        value={form.daysWorked}
                        onChange={e => setForm(f => ({ ...f, daysWorked: parseInt(e.target.value) || 1 }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Voucher Number (optional)</label>
                      <input
                        value={form.voucherNumber}
                        onChange={e => setForm(f => ({ ...f, voucherNumber: e.target.value }))}
                        placeholder="e.g. V-2024-001"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={labelStyle}>Notes (optional)</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any extra details..."
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label style={labelStyle}>📷 Voucher Photo (optional)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        style={{ flex: 1, padding: '10px', border: '1px dashed #d1d5db', borderRadius: '8px', backgroundColor: '#fafafa', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151' }}
                      >
                        📷 Take Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        style={{ flex: 1, padding: '10px', border: '1px dashed #d1d5db', borderRadius: '8px', backgroundColor: '#fafafa', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151' }}
                      >
                        📁 Upload Photo
                      </button>
                    </div>
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />
                    <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    {photoPreview && (
                      <div style={{ marginTop: '10px' }}>
                        <img src={photoPreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Photo will upload when you save.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button onClick={resetForm} style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', backgroundColor: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer', color: '#374151' }}>
                    Cancel
                  </button>
                  <button
                    onClick={saveVoucher}
                    disabled={saving || !form.productionName || !form.shootDate}
                    style={{ flex: 2, padding: '12px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', opacity: (saving || !form.productionName || !form.shootDate) ? 0.5 : 1 }}
                  >
                    {saving ? (uploadingPhoto ? 'Uploading photo...' : 'Saving...') : (editingId ? 'Update Voucher' : 'Save Voucher')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 4: VOUCHER LIST ── */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 16px' }}>Your Vouchers</h3>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {(['all', 'qualifying', 'non-qualifying', 'in-window', 'outside-window'] as FilterTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    backgroundColor: filterTab === tab ? '#1a1a2e' : '#f3f4f6',
                    color: filterTab === tab ? 'white' : '#6b7280',
                  }}
                >
                  {tab === 'all' ? 'All' : tab === 'qualifying' ? 'Qualifying' : tab === 'non-qualifying' ? 'Non-Qualifying' : tab === 'in-window' ? 'In Window' : 'Outside Window'}
                </button>
              ))}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { label: 'Total', val: vouchers.length },
                { label: 'Qualifying', val: totalQualifying },
                { label: 'In Window', val: inWindow },
                { label: 'Days Counted', val: daysCounted },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e' }}>{s.val}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {filteredVouchers().length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎫</div>
                <p style={{ fontSize: '14px' }}>No vouchers yet. Add your first one above!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredVouchers().map(v => {
                  const outside = isOutsideWindow(v.shoot_date)
                  const countable = v.is_qualifying && !outside
                  return (
                    <div key={v.id} style={{ border: '1px solid #f3f4f6', borderRadius: '12px', padding: '14px', backgroundColor: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e', marginBottom: '4px', wordBreak: 'break-word' }}>{v.production_name}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                            {new Date(v.shoot_date + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {v.role_type && <span style={badgeStyle('#eff6ff', '#1d4ed8')}>{v.role_type.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>}
                            {v.union_type && <span style={badgeStyle(v.union_type !== 'non-union' ? '#f0fdf4' : '#f9fafb', v.union_type !== 'non-union' ? '#16a34a' : '#6b7280')}>{v.union_type.toUpperCase()}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: countable ? '#16a34a' : '#9ca3af' }}>+{v.days_worked}</div>
                          <div style={{ fontSize: '11px', color: countable ? '#16a34a' : '#9ca3af', fontWeight: '600' }}>{countable ? 'day' : 'not counted'}</div>
                          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                            {v.is_qualifying && !outside && <span style={badgeStyle('#f0fdf4', '#16a34a')}>✅ Qualifying</span>}
                            {outside && <span style={badgeStyle('#fffbeb', '#d97706')}>⏰ Outside Window</span>}
                            {!v.is_qualifying && <span style={badgeStyle('#f9fafb', '#6b7280')}>❌ Non-Qualifying</span>}
                          </div>
                        </div>
                      </div>

                      {(v.voucher_number || v.photo_url || v.notes) && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {v.voucher_number && <span style={{ fontSize: '12px', color: '#6b7280' }}>#{v.voucher_number}</span>}
                          {v.notes && <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{v.notes}</span>}
                          {v.photo_url && (
                            signedUrls[v.id] ? (
                              <button
                                onClick={() => setViewPhotoUrl(signedUrls[v.id])}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}
                              >
                                <img src={signedUrls[v.id]} alt="Voucher" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
                                View
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>📎 Photo attached</span>
                            )
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button onClick={() => startEdit(v)} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>Edit</button>
                        <button onClick={() => deleteVoucher(v.id)} style={{ padding: '6px 14px', border: '1px solid #fee2e2', borderRadius: '8px', backgroundColor: '#fff5f5', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#dc2626' }}>Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── SECTION 5: PROVINCIAL INFO ── */}
          {rule && (
            <div style={{ backgroundColor: 'white', borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <button
                onClick={() => setShowInfoSection(s => !s)}
                style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e' }}>📋 {province} Union Membership Rules</span>
                <span style={{ color: '#9ca3af', fontSize: '18px' }}>{showInfoSection ? '▲' : '▼'}</span>
              </button>
              {showInfoSection && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ paddingTop: '16px', display: 'grid', gap: '12px' }}>
                    <div><span style={{ fontWeight: '700', fontSize: '13px', color: '#374151' }}>Union:</span> <span style={{ fontSize: '13px', color: '#6b7280' }}>{rule.unionName}</span></div>
                    <div><span style={{ fontWeight: '700', fontSize: '13px', color: '#374151' }}>Target Tier:</span> <span style={{ fontSize: '13px', color: '#6b7280' }}>{rule.targetTier}</span></div>
                    <div><span style={{ fontWeight: '700', fontSize: '13px', color: '#374151' }}>Days Required:</span> <span style={{ fontSize: '13px', color: '#6b7280' }}>{rule.qualifyingDaysRequired} qualifying days within {rule.timeWindowLabel}</span></div>
                    <div><span style={{ fontWeight: '700', fontSize: '13px', color: '#374151' }}>Notes:</span> <span style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6', display: 'block', marginTop: '4px' }}>{rule.notes}</span></div>
                    {rule.nextTier && (
                      <div><span style={{ fontWeight: '700', fontSize: '13px', color: '#374151' }}>Next Tier:</span> <span style={{ fontSize: '13px', color: '#6b7280' }}>{rule.nextTier} — {rule.nextTierRequirement}</span></div>
                    )}
                    <a href={rule.website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1d4ed8', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                      Visit {rule.unionName} →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PHOTO VIEWER MODAL ── */}
      {viewPhotoUrl && (
        <div onClick={() => setViewPhotoUrl(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
            <img src={viewPhotoUrl} alt="Voucher" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }} />
            <button onClick={() => setViewPhotoUrl(null)} style={{ position: 'absolute', top: '-16px', right: '-16px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'white', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>×</button>
          </div>
        </div>
      )}

      {/* ── MILESTONE MODAL ── */}
      {showMilestoneModal && milestoneData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px 28px', maxWidth: '380px', width: '100%', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {milestoneData.type === 'qualified' && <Confetti />}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '52px', marginBottom: '12px' }}>{milestoneData.type === 'qualified' ? '🎉' : milestoneData.type === 'milestone_14' ? '⚡' : milestoneData.type === 'milestone_10' ? '🔥' : '🌟'}</div>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1a1a2e', margin: '0 0 12px', lineHeight: '1.2' }}>{milestoneData.title}</h2>
              <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 20px' }}>{milestoneData.message}</p>

              {milestoneData.type === 'qualified' && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  <p style={{ fontWeight: '700', fontSize: '13px', color: '#166534', margin: '0 0 10px' }}>What to do next:</p>
                  {[
                    'Gather your vouchers (you have photos right here!)',
                    `Contact ${milestoneData.unionName} to begin your application`,
                    'Pay your initiation fee (if applicable)',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px', color: '#374151' }}>
                      <span style={{ fontWeight: '700', color: '#16a34a', flexShrink: 0 }}>{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {milestoneData.type === 'qualified' && (
                  <a
                    href={milestoneData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', padding: '13px', backgroundColor: '#16a34a', color: 'white', fontWeight: '700', fontSize: '15px', borderRadius: '12px', textDecoration: 'none' }}
                  >
                    Apply for Membership →
                  </a>
                )}
                <button
                  onClick={() => setShowMilestoneModal(false)}
                  style={{ padding: '12px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '14px', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
                >
                  {milestoneData.type === 'qualified' ? 'View My Wallet' : milestoneData.type === 'milestone_14' ? "Let's Go!" : milestoneData.type === 'milestone_10' ? 'Almost There!' : 'Keep Going!'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '700',
  color: '#374151',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#1a1a2e',
  backgroundColor: 'white',
  boxSizing: 'border-box',
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: bg,
    color,
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
  }
}
