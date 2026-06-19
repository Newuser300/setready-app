'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { compressImage } from '@/lib/compress-image'

// ─── Constants ────────────────────────────────────────────────────────────────

const HAIR_COLORS = ['Black','Dark Brown','Medium Brown','Light Brown','Dirty Blonde','Blonde','Strawberry Blonde','Auburn','Red','Grey','White','Bald','Other']
const HAIR_LENGTHS = ['Bald / Shaved','Very Short (< 1 inch)','Short (1–3 inches)','Medium Short (3–5 inches)','Medium (chin length)','Medium Long (shoulder length)','Long (below shoulder)','Very Long (past mid-back)']
const HAIR_TEXTURES = ['Straight','Wavy','Curly','Coily / Kinky','Locs / Dreadlocks']
const EYE_COLORS = ['Brown','Dark Brown','Light Brown / Hazel','Blue','Light Blue','Green','Grey','Amber','Two different colors']
const BODY_TYPES = ['Slim / Lean','Athletic / Fit','Average / Medium','Stocky / Muscular','Heavyset / Large','Plus Size','Petite']
const SKIN_TONES = ['Very Fair','Fair','Light','Light Medium','Medium','Medium Dark (olive)','Dark','Very Dark']
const FACIAL_HAIR_OPTS = ['None / Clean Shaven','Stubble (1–3 days)','Short Beard','Full Beard','Long Beard','Moustache','Goatee','Sideburns','Not applicable']
const ETHNICITY_OPTS = ['Indigenous / First Nations','Black / African Canadian','East Asian','South Asian','Southeast Asian','Middle Eastern','Latin / Hispanic','White / Caucasian','Mixed / Multiracial','Other']
const UNION_STATUSES = [
  { value: 'non-union', label: 'Non-Union' },
  { value: 'ubcp-permit', label: 'UBCP Permit Member' },
  { value: 'ubcp-apprentice', label: 'UBCP Apprentice Member' },
  { value: 'ubcp-full', label: 'UBCP Full Member' },
  { value: 'actra-apprentice', label: 'ACTRA Apprentice Member' },
  { value: 'actra-full', label: 'ACTRA Full Member' },
]
const SHIRT_SIZES = ['XS','S','M','L','XL','XXL','XXXL','4XL']
const JACKET_SIZES = ['XS','S','M','L','XL','XXL','XXXL','4XL']
const DRESS_SIZES = ['0','2','4','6','8','10','12','14','16','18','20','22','24']
const HAT_SIZES = ['XS','S','M','L','XL']
const EXPERIENCE_LEVELS = ['No experience (first time)','Beginner (1–5 background bookings)','Some experience (6–20 bookings)','Experienced (20–50 bookings)','Very experienced (50–100 bookings)','Veteran (100+ bookings)']
const TRAINING_OPTS = ['No formal training','On-set experience only','Acting classes (ongoing)','Acting school / conservatory','University / college theatre program','SetReady training modules','Commercial acting classes','Voice training','Improv classes','Stunt training','Dance training','Singing lessons']
const ACCENT_PRESETS = ['Canadian (neutral)','British (RP)','British (regional)','American (neutral)','American (Southern)','American (New York)','Australian','Irish','Scottish','French','French Canadian','Spanish','Italian','German','Russian','Indian','Jamaican / Caribbean']
const SPORTS_OPTS = ['Hockey','Football (Canadian)','Basketball','Baseball','Soccer / Football','Tennis','Golf','Swimming','Skiing / Snowboarding','Skateboarding','Surfing','Martial Arts','Boxing / Wrestling','Cycling','Running / Track','Gymnastics','Cheerleading','Volleyball','Rugby','Lacrosse','Rock Climbing','Equestrian / Horse Riding']
const DANCE_OPTS = ['Ballet','Jazz','Contemporary / Modern','Hip Hop','Ballroom','Latin (Salsa, Tango, etc.)','Tap','Swing / Lindy Hop','Pole Dancing','Aerial / Acrobatics','Belly Dancing','Folk / Cultural']
const INSTRUMENT_PRESETS = ['Guitar (acoustic)','Guitar (electric)','Bass Guitar','Piano / Keyboard','Violin / Fiddle','Cello','Drums / Percussion','Trumpet','Saxophone','Flute','Ukulele','Banjo','Harp']
const DRIVING_OPTS = ["Standard BC Driver's Licence",'Motorcycle Licence (Class 6)','Commercial Vehicle (Class 1–5)','ATV / Off-Road Vehicle','Boat / Watercraft','Forklift','Farm Equipment']
const SWIMMING_LEVELS = ['Non-swimmer','Basic (can float, basic strokes)','Intermediate (comfortable in water)','Strong swimmer','Competitive swimmer / Lifeguard']
const LANG_PRESETS = ['English','French','Mandarin','Cantonese','Punjabi','Hindi','Spanish','Portuguese','German','Italian','Japanese','Korean','Arabic','Ukrainian','Tagalog / Filipino','Vietnamese']
const OTHER_SKILL_PRESETS = ['Stage combat','Juggling','Magic','Puppetry','Stilt walking','Fire performance','Parkour','Archery','Sword fighting','CPR certified','First aid','Security / bouncer','Military / police background','Medical background','Legal background','Cooking / chef','Bartending','Modeling','Yoga / Pilates instructor']

// ─── Styles ───────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px',
  fontSize: '15px', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
  backgroundColor: 'white', height: '44px', fontFamily: 'inherit',
}
const sel: React.CSSProperties = {
  ...inp, appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
}
const unitBtn: React.CSSProperties = {
  padding: '0 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px',
  background: '#f3f4f6', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
  whiteSpace: 'nowrap', color: '#374151', flexShrink: 0, height: '44px',
}
const ta: React.CSSProperties = { ...inp, height: 'auto', resize: 'vertical', paddingTop: '11px' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function CS({ title, children, open: defaultOpen = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '12px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>{title}</span>
        <span style={{ fontSize: '10px', color: '#9ca3af', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && <div style={{ padding: '0 20px 20px' }}>{children}</div>}
    </div>
  )
}

function FL({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</label>
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${on ? '#F59E0B' : '#e5e7eb'}`, backgroundColor: on ? '#F59E0B' : 'white', color: on ? '#1a1a2e' : '#374151', fontSize: '13px', fontWeight: on ? '700' : '400', cursor: 'pointer', transition: 'all 0.1s', whiteSpace: 'nowrap' }}>
      {on ? '✓ ' : ''}{label}
    </button>
  )
}

function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>{label}</span>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => onChange(true)} style={{ padding: '4px 14px', borderRadius: '6px', border: `1.5px solid ${value ? '#F59E0B' : '#e5e7eb'}`, backgroundColor: value ? '#F59E0B' : 'white', color: value ? '#1a1a2e' : '#6b7280', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Yes</button>
        <button onClick={() => onChange(false)} style={{ padding: '4px 14px', borderRadius: '6px', border: `1.5px solid ${!value ? '#1a1a2e' : '#e5e7eb'}`, backgroundColor: !value ? '#1a1a2e' : 'white', color: !value ? 'white' : '#6b7280', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>No</button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const fileFrontRef = useRef<HTMLInputElement>(null)
  const fileExtraRef = useRef<HTMLInputElement>(null)
  const filePaid1Ref = useRef<HTMLInputElement>(null)
  const filePaid2Ref = useRef<HTMLInputElement>(null)
  const filePaid3Ref = useRef<HTMLInputElement>(null)
  const filePaid4Ref = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  // Headshot + photos
  const [headshotUrl, setHeadshotUrl] = useState('')
  const [headshotBroken, setHeadshotBroken] = useState(false)
  const [headshotFile, setHeadshotFile] = useState<File | null>(null)
  const [photoFront, setPhotoFront] = useState('')
  const [photoExtra, setPhotoExtra] = useState('')
  // Paid photo slots (photo_additional_2, photo_full_body_side, headshot_alt, wardrobe_formal)
  const [photosUnlocked, setPhotosUnlocked] = useState(false)
  const [photoPaid1, setPhotoPaid1] = useState('') // photo_additional_2
  const [photoPaid2, setPhotoPaid2] = useState('') // photo_full_body_side
  const [photoPaid3, setPhotoPaid3] = useState('') // headshot_alt
  const [photoPaid4, setPhotoPaid4] = useState('') // wardrobe_formal
  const [photoSlotLabels, setPhotoSlotLabels] = useState<Record<string, string>>({})
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [showPromoInput, setShowPromoInput] = useState(false)

  // Basics
  const [isPublic, setIsPublic] = useState(true)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [bio, setBio] = useState('')
  const [videoReelUrl, setVideoReelUrl] = useState('')
  const [unionStatus, setUnionStatus] = useState('')
  const [memberNumber, setMemberNumber] = useState('')
  const [agencyId, setAgencyId] = useState('')
  const [agencyLinks, setAgencyLinks] = useState<Array<{ id: string; agency_id: string; agency_name: string; status: string }>>([])

  // Physical
  const [heightCm, setHeightCm] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm'>('ft')
  const [weightLbs, setWeightLbs] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')

  // Appearance
  const [hairColor, setHairColor] = useState('')
  const [hairLength, setHairLength] = useState('')
  const [hairTexture, setHairTexture] = useState('')
  const [eyeColor, setEyeColor] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [skinTone, setSkinTone] = useState('')
  const [ethnicities, setEthnicities] = useState<string[]>([])
  const [facialHair, setFacialHair] = useState('')

  // Distinguishing features
  const [hasTattoos, setHasTattoos] = useState(false)
  const [tattooDesc, setTattooDesc] = useState('')
  const [hasPiercings, setHasPiercings] = useState(false)
  const [piercingDesc, setPiercingDesc] = useState('')
  const [hasScars, setHasScars] = useState(false)
  const [scarDesc, setScarDesc] = useState('')

  // Clothing
  const [shirtSize, setShirtSize] = useState('')
  const [jacketSize, setJacketSize] = useState('')
  const [pantsWaist, setPantsWaist] = useState('')
  const [pantsInseam, setPantsInseam] = useState('')
  const [dressSize, setDressSize] = useState('')
  const [shoeSize, setShoeSize] = useState('')
  const [shoeSizeGender, setShoeSizeGender] = useState('unisex')
  const [neckSize, setNeckSize] = useState('')
  const [sleeveLength, setSleeveLength] = useState('')
  const [chest, setChest] = useState('')
  const [hips, setHips] = useState('')
  const [hatSize, setHatSize] = useState('')
  const [wardrobeNotes, setWardrobeNotes] = useState('')

  // Skills
  const [accents, setAccents] = useState<string[]>([])
  const [accentInput, setAccentInput] = useState('')
  const [sports, setSports] = useState<string[]>([])
  const [danceStyles, setDanceStyles] = useState<string[]>([])
  const [instruments, setInstruments] = useState<string[]>([])
  const [instrumentInput, setInstrumentInput] = useState('')
  const [driving, setDriving] = useState<string[]>([])
  const [swimmingLevel, setSwimmingLevel] = useState('')
  const [languages, setLanguages] = useState<string[]>(['English'])
  const [langInput, setLangInput] = useState('')
  const [otherSkills, setOtherSkills] = useState<string[]>([])
  const [otherSkillInput, setOtherSkillInput] = useState('')

  // Experience
  const [actingExperience, setActingExperience] = useState('')
  const [training, setTraining] = useState<string[]>([])
  const [credits, setCredits] = useState('')

  // Contact
  const [userEmail, setUserEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredContact, setPreferredContact] = useState('email')
  const [instagram, setInstagram] = useState('')
  const [imdbUrl, setImdbUrl] = useState('')

  // ── Auth + load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    ;(async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) { router.push('/auth/sign-in'); return }
      setUserEmail(user.email || '')
      loadProfile()
      loadAgencyLinks()
    })()
  }, [router])

  async function loadProfile() {
    const res = await fetch('/api/profile', { credentials: 'include' })
    if (res.ok) {
      const p = await res.json()
      if (p) {
        setName(p.name || '')
        setBio(p.bio || '')
        setGender(p.gender || '')
        setDob(p.date_of_birth || '')
        setIsPublic(p.is_public ?? true)
        setUnionStatus(p.union_status || '')
        setMemberNumber(p.member_number || '')
        setAgencyId(p.agency_id || '')
        setHeadshotBroken(false)
        setHeadshotUrl(p.headshot_url || '')
        setVideoReelUrl(p.video_reel_url || '')
        setPhotoFront(p.photo_full_body_front || '')
        setPhotoExtra(p.photo_additional || '')
        setPhotosUnlocked(p.photos_unlocked ?? false)
        setPhotoPaid1(p.photo_additional_2 || '')
        setPhotoPaid2(p.photo_full_body_side || '')
        setPhotoPaid3(p.headshot_alt || '')
        setPhotoPaid4(p.wardrobe_formal || '')
        setPhotoSlotLabels(p.photo_slot_labels || {})
        if (p.height_cm) {
          setHeightCm(p.height_cm.toString())
          const totalIn = Math.round(p.height_cm / 2.54)
          setHeightFt(Math.floor(totalIn / 12).toString())
          setHeightIn((totalIn % 12).toString())
        }
        if (p.weight_lbs) setWeightLbs(p.weight_lbs.toString())
        setHairColor(p.hair_color || '')
        setHairLength(p.hair_length || '')
        setHairTexture(p.hair_texture || '')
        setEyeColor(p.eye_color || '')
        setBodyType(p.body_type || '')
        setSkinTone(p.skin_tone || '')
        setEthnicities(p.ethnicity || [])
        setFacialHair(p.facial_hair || '')
        setHasTattoos(p.has_tattoos || false)
        setTattooDesc(p.tattoo_description || '')
        setHasPiercings(p.has_piercings || false)
        setPiercingDesc(p.piercing_description || '')
        setHasScars(p.has_scars || false)
        setScarDesc(p.scar_description || '')
        setShirtSize(p.shirt_size || '')
        setJacketSize(p.jacket_size || '')
        setPantsWaist(p.waist_inches?.toString() || '')
        setPantsInseam(p.inseam_inches?.toString() || '')
        setDressSize(p.dress_size || '')
        setShoeSize(p.shoe_size || '')
        setShoeSizeGender(p.shoe_gender || 'unisex')
        setNeckSize(p.neck_inches?.toString() || '')
        setSleeveLength(p.sleeve_inches?.toString() || '')
        setChest(p.chest_inches?.toString() || '')
        setHips(p.hips_inches?.toString() || '')
        setHatSize(p.hat_size || '')
        setWardrobeNotes(p.wardrobe_notes || '')
        setAccents(p.accents || [])
        setSports(p.sports || [])
        setDanceStyles(p.dance_styles || [])
        setInstruments(p.instruments || [])
        setDriving(p.driving_licence || [])
        setSwimmingLevel(p.swimming_level || '')
        setLanguages(p.languages?.length ? p.languages : ['English'])
        setOtherSkills(p.special_skills || [])
        setActingExperience(p.acting_experience || '')
        setTraining(p.training || [])
        setCredits(p.credits || '')
        setPhone(p.phone || '')
        setPreferredContact(p.preferred_contact || 'email')
        setInstagram(p.instagram || '')
        setImdbUrl(p.imdb_url || '')

      }
    }
    setLoading(false)
  }

  async function loadAgencyLinks() {
    const res = await fetch('/api/profile/agency')
    if (res.ok) setAgencyLinks((await res.json()) || [])
  }

  async function uploadAdditionalPhoto(
    file: File,
    type: 'full_body_front' | 'additional' | 'additional_2' | 'full_body_side' | 'headshot_alt' | 'wardrobe_formal'
  ) {
    if (file.size > 25 * 1024 * 1024) { setMessage('Image is too large (max 25 MB before compression).'); return }
    let compressed: File
    try {
      compressed = await compressImage(file)
    } catch {
      setMessage('❌ Could not process image. Try a different file.')
      return
    }
    const fd = new FormData()
    fd.append('photo', compressed)
    fd.append('type', type)
    const res = await fetch('/api/profile/photo', { method: 'POST', body: fd, credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      if (type === 'full_body_front') setPhotoFront(d.url)
      if (type === 'additional') setPhotoExtra(d.url)
      if (type === 'additional_2') setPhotoPaid1(d.url)
      if (type === 'full_body_side') setPhotoPaid2(d.url)
      if (type === 'headshot_alt') setPhotoPaid3(d.url)
      if (type === 'wardrobe_formal') setPhotoPaid4(d.url)
    } else {
      setMessage('❌ Failed to upload photo.')
    }
  }

  // ── Height helpers ──────────────────────────────────────────────────────────

  function onFtChange(v: string) {
    setHeightFt(v)
    const cm = Math.round(((parseInt(v) || 0) * 12 + (parseInt(heightIn) || 0)) * 2.54)
    setHeightCm(cm > 0 ? cm.toString() : '')
  }
  function onInChange(v: string) {
    setHeightIn(v)
    const cm = Math.round(((parseInt(heightFt) || 0) * 12 + (parseInt(v) || 0)) * 2.54)
    setHeightCm(cm > 0 ? cm.toString() : '')
  }
  function onCmChange(v: string) {
    setHeightCm(v)
    if (v) {
      const totalIn = Math.round(parseFloat(v) / 2.54)
      setHeightFt(Math.floor(totalIn / 12).toString())
      setHeightIn((totalIn % 12).toString())
    } else { setHeightFt(''); setHeightIn('') }
  }
  function heightHint() {
    if (!heightCm) return ''
    const cm = parseFloat(heightCm)
    const totalIn = Math.round(cm / 2.54)
    return heightUnit === 'ft' ? `${cm} cm` : `${Math.floor(totalIn / 12)}'${totalIn % 12}"`
  }

  // ── Weight helpers ──────────────────────────────────────────────────────────

  function weightDisplay() {
    if (!weightLbs) return ''
    return weightUnit === 'lbs' ? weightLbs : Math.round(parseFloat(weightLbs) * 0.453592).toString()
  }
  function onWeightChange(v: string) {
    if (weightUnit === 'lbs') { setWeightLbs(v) }
    else { setWeightLbs(v ? Math.round(parseFloat(v) / 0.453592).toString() : '') }
  }

  // ── Array toggles ───────────────────────────────────────────────────────────

  const tog = (arr: string[], item: string, set: (v: string[]) => void) =>
    set(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])

  function addToArr(val: string, arr: string[], set: (v: string[]) => void, clearInput: () => void) {
    const s = val.trim()
    if (s && !arr.includes(s)) set([...arr, s])
    clearInput()
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveMessage('')
    setSaveError('')

    try {
      // Upload new headshot file first if one was selected
      if (headshotFile) {
        let compressedHeadshot: File
        try {
          compressedHeadshot = await compressImage(headshotFile)
        } catch {
          setSaveError('Could not process headshot image. Try a different file.')
          setSaving(false)
          return
        }
        const hfd = new FormData()
        hfd.append('headshot', compressedHeadshot)
        hfd.append('data', JSON.stringify({}))
        const hRes = await fetch('/api/profile', {
          method: 'POST',
          body: hfd,
          credentials: 'include',
        })
        if (hRes.ok) {
          const hData = await hRes.json()
          if (hData.headshot_url) {
            setHeadshotBroken(false)
            setHeadshotUrl(hData.headshot_url)
            setHeadshotFile(null)
          }
        }
      }

      const profileData = {
        name,
        bio,
        gender,
        date_of_birth: dob || null,
        is_public: isPublic,
        union_status: unionStatus || null,
        member_number: memberNumber || null,
        agency_id: agencyId || null,
        video_reel_url: videoReelUrl || null,
        height_feet: heightFt ? parseInt(heightFt) : null,
        height_inches: heightIn ? parseInt(heightIn) : null,
        height_cm: heightCm ? parseInt(heightCm) : null,
        weight_lbs: weightLbs ? parseInt(weightLbs) : null,
        weight_kg: weightLbs ? Math.round(parseFloat(weightLbs) * 0.453592) : null,
        hair_color: hairColor || null,
        hair_length: hairLength || null,
        hair_texture: hairTexture || null,
        eye_color: eyeColor || null,
        body_type: bodyType || null,
        skin_tone: skinTone || null,
        ethnicity: ethnicities,
        facial_hair: facialHair || null,
        has_tattoos: hasTattoos,
        tattoo_description: hasTattoos ? tattooDesc || null : null,
        has_piercings: hasPiercings,
        piercing_description: hasPiercings ? piercingDesc || null : null,
        has_scars: hasScars,
        scar_description: hasScars ? scarDesc || null : null,
        shirt_size: shirtSize || null,
        jacket_size: jacketSize || null,
        waist_inches: pantsWaist ? parseInt(pantsWaist) : null,
        inseam_inches: pantsInseam ? parseInt(pantsInseam) : null,
        dress_size: dressSize || null,
        shoe_size: shoeSize || null,
        shoe_gender: shoeSizeGender,
        chest_inches: chest ? parseInt(chest) : null,
        hips_inches: hips ? parseInt(hips) : null,
        neck_inches: neckSize ? parseFloat(neckSize) : null,
        sleeve_inches: sleeveLength ? parseFloat(sleeveLength) : null,
        hat_size: hatSize || null,
        wardrobe_notes: wardrobeNotes || null,
        accents,
        sports,
        dance_styles: danceStyles,
        instruments,
        driving_licence: driving,
        swimming_level: swimmingLevel || null,
        languages,
        special_skills: otherSkills,
        acting_experience: actingExperience || null,
        training,
        credits: credits || null,
        phone: phone || null,
        preferred_contact: preferredContact,
        instagram: instagram || null,
        imdb_url: imdbUrl || null,

        headshot_url: headshotUrl?.startsWith('https://') ? headshotUrl : null,
        photo_full_body_front: photoFront?.startsWith('https://') ? photoFront : null,
        photo_additional: photoExtra?.startsWith('https://') ? photoExtra : null,
        photo_additional_2: photoPaid1?.startsWith('https://') ? photoPaid1 : null,
        photo_full_body_side: photoPaid2?.startsWith('https://') ? photoPaid2 : null,
        headshot_alt: photoPaid3?.startsWith('https://') ? photoPaid3 : null,
        wardrobe_formal: photoPaid4?.startsWith('https://') ? photoPaid4 : null,
        photo_slot_labels: photoSlotLabels,
      }

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      })

      const data = await res.json()

      if (!res.ok) {
        setSaveError(data.error || 'Failed to save')
        return
      }

      setSaveMessage('✅ Profile saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)

    } catch (err: any) {
      console.error('Save error:', err)
      setSaveError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280' }}>Loading profile...</p>
      </div>
    )
  }

  // ── Completion score ─────────────────────────────────────────────────────────

  const rawScore =
    (headshotUrl ? 20 : 0) +
    (bio.trim().length > 20 ? 5 : 0) +
    (heightCm ? 5 : 0) +
    (weightLbs ? 3 : 0) +
    (hairColor ? 3 : 0) +
    (eyeColor ? 3 : 0) +
    (bodyType ? 3 : 0) +
    (ethnicities.length > 0 ? 3 : 0) +
    (hairLength ? 2 : 0) +
    (skinTone ? 2 : 0) +
    (shirtSize ? 3 : 0) +
    (shoeSize ? 3 : 0) +
    (unionStatus ? 5 : 0) +
    (gender ? 3 : 0) +
    (dob ? 3 : 0) +
    (languages.length > 0 ? 3 : 0) +
    ((phone || instagram) ? 3 : 0) +
    ((otherSkills.length > 0 || sports.length > 0 || accents.length > 0) ? 5 : 0) +
    (actingExperience ? 3 : 0)

  const completionScore = Math.min(100, Math.round(rawScore / 80 * 100))
  const completionColor = completionScore < 50 ? '#ef4444' : completionScore < 80 ? '#f59e0b' : '#22c55e'
  const isProfileLive = !!(headshotUrl && heightCm && hairColor && eyeColor && isPublic)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '80px' }}>

      {toast && (
        <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1a1a2e', color: 'white', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', color: 'white', padding: '20px 24px' }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '8px', fontSize: '14px' }}>
          ← Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>🎭 My Profile</h1>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>Your casting profile — visible to approved agents and casting directors</p>
          </div>
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

        {/* Status */}
        {isProfileLive ? (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#15803d', fontSize: '14px', margin: '0 0 2px' }}>✅ Your profile is LIVE</p>
              <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>Visible to agents and casting directors</p>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontWeight: '700', color: '#92400e', fontSize: '14px', margin: 0 }}>⚠️ Complete your profile</p>
              <span style={{ fontSize: '13px', fontWeight: '700', color: completionColor }}>{completionScore}%</span>
            </div>
            <p style={{ fontSize: '12px', color: '#78350f', margin: '0 0 8px' }}>Add a headshot and your physical stats to appear in casting searches</p>
            <div style={{ height: '6px', backgroundColor: '#fde68a', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${completionScore}%`, height: '100%', backgroundColor: completionColor, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* ── HEADSHOT ── */}
        <CS title="📸 Headshot">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #e5e7eb', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {(headshotUrl && !headshotBroken)
                ? <img src={headshotUrl} alt="Headshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setHeadshotBroken(true)} />
                : <span style={{ fontSize: '36px' }}>👤</span>}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} style={{ padding: '8px 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                {(headshotUrl && !headshotBroken) ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0' }}>JPG, PNG or WebP. Compressed automatically. Square crop works best.</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 25*1024*1024) { setMessage('Image is too large (max 25 MB).'); return }; setHeadshotBroken(false); setHeadshotFile(f); setHeadshotUrl(URL.createObjectURL(f)) }} style={{ display: 'none' }} />
            </div>
          </div>
        </CS>

        {/* ── VISIBILITY ── */}
        <CS title="🔍 Profile Visibility">
          <div onClick={() => setIsPublic(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <div style={{ width: '48px', height: '28px', borderRadius: '14px', backgroundColor: isPublic ? '#22c55e' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '4px', left: isPublic ? '24px' : '4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: '14px', color: '#374151' }}>
              {isPublic ? '✅ Visible to approved agents and casting directors' : '🔒 Profile hidden — not discoverable'}
            </span>
          </div>
        </CS>

        {/* ── SECTION 1: BASICS ── */}
        <CS title="👤 Basics">
          <div style={{ marginBottom: '12px' }}>
            <FL>Full Name</FL>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <FL>Gender</FL>
              <select value={gender} onChange={e => setGender(e.target.value)} style={sel}>
                <option value="">Select gender</option>
                {['Male','Female','Non-binary','Other'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <FL>Date of Birth</FL>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <FL>Union Status</FL>
            <select value={unionStatus} onChange={e => setUnionStatus(e.target.value)} style={sel}>
              <option value="">Select status</option>
              {UNION_STATUSES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            {unionStatus && unionStatus !== 'non-union' && (
              <div style={{ marginTop: '10px' }}>
                <FL>Member Number</FL>
                <input type="text" value={memberNumber} onChange={e => setMemberNumber(e.target.value)} placeholder="Your UBCP/ACTRA member number" style={inp} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <FL>Bio</FL>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 500))} placeholder="Tell casting directors about yourself — your experience, look, and personality..." rows={4} style={{ ...ta, fontFamily: 'inherit' }} />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0', textAlign: 'right' }}>{bio.length}/500</p>
          </div>
          <div>
            <FL>Video Reel URL (YouTube or Vimeo)</FL>
            <input value={videoReelUrl} onChange={e => setVideoReelUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." type="url" style={inp} />
            {videoReelUrl && /youtube\.com|youtu\.be/.test(videoReelUrl) && (
              <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9' }}>
                <iframe src={`https://www.youtube.com/embed/${videoReelUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]}`} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay" allowFullScreen />
              </div>
            )}
          </div>
        </CS>

        {/* ── SECTION 2: PHYSICAL MEASUREMENTS ── */}
        <CS title="📏 Physical Measurements">
          {/* Height */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <FL>Height</FL>
              <button onClick={() => setHeightUnit(u => u === 'ft' ? 'cm' : 'ft')} style={{ ...unitBtn, height: '28px', fontSize: '11px', padding: '0 10px' }}>
                {heightUnit === 'ft' ? 'switch to cm' : 'switch to ft/in'}
              </button>
            </div>
            {heightUnit === 'ft' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input type="number" min="3" max="7" value={heightFt} onChange={e => onFtChange(e.target.value)} placeholder="5" style={inp} />
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '3px 0 0', textAlign: 'center' }}>feet</p>
                </div>
                <span style={{ color: '#9ca3af', fontWeight: '700', paddingBottom: '16px' }}>+</span>
                <div style={{ flex: 1 }}>
                  <input type="number" min="0" max="11" value={heightIn} onChange={e => onInChange(e.target.value)} placeholder="9" style={inp} />
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '3px 0 0', textAlign: 'center' }}>inches</p>
                </div>
              </div>
            ) : (
              <input type="number" min="100" max="250" value={heightCm} onChange={e => onCmChange(e.target.value)} placeholder="e.g. 175" style={inp} />
            )}
            {heightHint() && <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0' }}>≈ {heightHint()}</p>}
          </div>

          {/* Weight */}
          <div>
            <FL>Weight</FL>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" value={weightDisplay()} onChange={e => onWeightChange(e.target.value)} placeholder={weightUnit === 'lbs' ? 'e.g. 160' : 'e.g. 73'} style={{ ...inp, flex: 1 }} />
              <button onClick={() => setWeightUnit(u => u === 'lbs' ? 'kg' : 'lbs')} style={unitBtn}>{weightUnit}</button>
            </div>
            {weightLbs && (
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0' }}>
                {weightUnit === 'lbs' ? `≈ ${Math.round(parseFloat(weightLbs) * 0.453592)} kg` : `${weightLbs} lbs`}
              </p>
            )}
          </div>
        </CS>

        {/* ── SECTION 3: APPEARANCE ── */}
        <CS title="💄 Appearance">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <FL>Hair Color</FL>
              <select value={hairColor} onChange={e => setHairColor(e.target.value)} style={sel}>
                <option value="">Select</option>
                {HAIR_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FL>Eye Color</FL>
              <select value={eyeColor} onChange={e => setEyeColor(e.target.value)} style={sel}>
                <option value="">Select</option>
                {EYE_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FL>Hair Length</FL>
              <select value={hairLength} onChange={e => setHairLength(e.target.value)} style={sel}>
                <option value="">Select</option>
                {HAIR_LENGTHS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FL>Hair Texture</FL>
              <select value={hairTexture} onChange={e => setHairTexture(e.target.value)} style={sel}>
                <option value="">Select</option>
                {HAIR_TEXTURES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FL>Body Type</FL>
              <select value={bodyType} onChange={e => setBodyType(e.target.value)} style={sel}>
                <option value="">Select</option>
                {BODY_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FL>Skin Tone</FL>
              <select value={skinTone} onChange={e => setSkinTone(e.target.value)} style={sel}>
                <option value="">Select</option>
                {SKIN_TONES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <FL>Facial Hair</FL>
            <select value={facialHair} onChange={e => setFacialHair(e.target.value)} style={sel}>
              <option value="">Select</option>
              {FACIAL_HAIR_OPTS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <FL>Ethnicity — select all that apply</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {ETHNICITY_OPTS.map(e => (
                <Chip key={e} label={e} on={ethnicities.includes(e)} onClick={() => tog(ethnicities, e, setEthnicities)} />
              ))}
            </div>
          </div>
        </CS>

        {/* ── SECTION 4: DISTINGUISHING FEATURES ── */}
        <CS title="✨ Distinguishing Features">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <YesNo label="Visible tattoos?" value={hasTattoos} onChange={setHasTattoos} />
              {hasTattoos && (
                <div style={{ marginTop: '8px' }}>
                  <FL>Describe location and visibility</FL>
                  <textarea value={tattooDesc} onChange={e => setTattooDesc(e.target.value)} placeholder="e.g. Full sleeve left arm, neck tattoo, hand tattoos" rows={2} style={{ ...ta, fontFamily: 'inherit' }} />
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>Wardrobe may need to cover these.</p>
                </div>
              )}
            </div>
            <div>
              <YesNo label="Visible piercings?" value={hasPiercings} onChange={setHasPiercings} />
              {hasPiercings && (
                <div style={{ marginTop: '8px' }}>
                  <FL>Describe</FL>
                  <textarea value={piercingDesc} onChange={e => setPiercingDesc(e.target.value)} placeholder="e.g. Ears, nose stud, eyebrow" rows={2} style={{ ...ta, fontFamily: 'inherit' }} />
                </div>
              )}
            </div>
            <div>
              <YesNo label="Visible scars or birthmarks?" value={hasScars} onChange={setHasScars} />
              {hasScars && (
                <div style={{ marginTop: '8px' }}>
                  <FL>Describe</FL>
                  <textarea value={scarDesc} onChange={e => setScarDesc(e.target.value)} placeholder="e.g. Scar on left cheek, birthmark on right forearm" rows={2} style={{ ...ta, fontFamily: 'inherit' }} />
                </div>
              )}
            </div>
          </div>
        </CS>

        {/* ── SECTION 5: CLOTHING SIZES ── */}
        <CS title="👔 Clothing Sizes">
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 14px' }}>Wardrobe needs accurate sizes. Measure — do not estimate.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <FL>Shirt / Top Size</FL>
              <select value={shirtSize} onChange={e => setShirtSize(e.target.value)} style={sel}>
                <option value="">Select</option>
                {SHIRT_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <FL>Jacket / Blazer Size</FL>
              <select value={jacketSize} onChange={e => setJacketSize(e.target.value)} style={sel}>
                <option value="">Select</option>
                {JACKET_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <FL>Dress Size (if applicable)</FL>
              <select value={dressSize} onChange={e => setDressSize(e.target.value)} style={sel}>
                <option value="">Select</option>
                {DRESS_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <FL>Hat Size</FL>
              <select value={hatSize} onChange={e => setHatSize(e.target.value)} style={sel}>
                <option value="">Select</option>
                {HAT_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <FL>Pants Waist (inches)</FL>
              <input type="number" value={pantsWaist} onChange={e => setPantsWaist(e.target.value)} placeholder="32" style={inp} />
            </div>
            <div>
              <FL>Pants Inseam (inches)</FL>
              <input type="number" value={pantsInseam} onChange={e => setPantsInseam(e.target.value)} placeholder="30" style={inp} />
            </div>
            <div>
              <FL>Shoe Size</FL>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" value={shoeSize} onChange={e => setShoeSize(e.target.value)} placeholder="10" style={{ ...inp, flex: 1 }} />
                <button onClick={() => setShoeSizeGender(g => g === "Men's" ? "Women's" : g === "Women's" ? 'unisex' : "Men's")} style={unitBtn}>{shoeSizeGender}</button>
              </div>
            </div>
            <div>
              <FL>Neck Size (inches)</FL>
              <input type="number" value={neckSize} onChange={e => setNeckSize(e.target.value)} placeholder="15.5" step="0.5" style={inp} />
            </div>
            <div>
              <FL>Sleeve Length (inches)</FL>
              <input type="number" value={sleeveLength} onChange={e => setSleeveLength(e.target.value)} placeholder="33" style={inp} />
            </div>
            <div>
              <FL>Chest (inches)</FL>
              <input type="number" value={chest} onChange={e => setChest(e.target.value)} placeholder="40" style={inp} />
            </div>
            <div>
              <FL>Hips (inches)</FL>
              <input type="number" value={hips} onChange={e => setHips(e.target.value)} placeholder="38" style={inp} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <FL>Wardrobe Notes</FL>
            <textarea value={wardrobeNotes} onChange={e => setWardrobeNotes(e.target.value)} placeholder="e.g. I have tattoos on both arms that may need covering. I cannot wear high heels. I have a prosthetic leg." rows={3} style={{ ...ta, fontFamily: 'inherit' }} />
          </div>
        </CS>

        {/* ── SECTION 6: SPECIAL SKILLS ── */}
        <CS title="🎯 Special Skills and Abilities">
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>These appear in casting searches for specific roles.</p>

          {/* Accents */}
          <div style={{ marginBottom: '18px' }}>
            <FL>Accents</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '8px' }}>
              {ACCENT_PRESETS.map(a => <Chip key={a} label={a} on={accents.includes(a)} onClick={() => tog(accents, a, setAccents)} />)}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={accentInput} onChange={e => setAccentInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addToArr(accentInput, accents, setAccents, () => setAccentInput('')))} placeholder="Add other accent..." style={{ ...inp, flex: 1 }} />
              <button onClick={() => addToArr(accentInput, accents, setAccents, () => setAccentInput(''))} style={{ padding: '0 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', height: '44px' }}>Add</button>
            </div>
            {accents.filter(a => !ACCENT_PRESETS.includes(a)).map(a => (
              <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '6px 6px 0 0', padding: '4px 10px', backgroundColor: '#F59E0B', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#1a1a2e' }}>
                {a}<button onClick={() => setAccents(p => p.filter(x => x !== a))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a2e', padding: 0, lineHeight: 1, fontSize: '14px' }}>×</button>
              </span>
            ))}
          </div>

          {/* Sports */}
          <div style={{ marginBottom: '18px' }}>
            <FL>Sports</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {SPORTS_OPTS.map(s => <Chip key={s} label={s} on={sports.includes(s)} onClick={() => tog(sports, s, setSports)} />)}
            </div>
          </div>

          {/* Dance */}
          <div style={{ marginBottom: '18px' }}>
            <FL>Dance Styles</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {DANCE_OPTS.map(d => <Chip key={d} label={d} on={danceStyles.includes(d)} onClick={() => tog(danceStyles, d, setDanceStyles)} />)}
            </div>
          </div>

          {/* Instruments */}
          <div style={{ marginBottom: '18px' }}>
            <FL>Musical Instruments</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '8px' }}>
              {INSTRUMENT_PRESETS.map(i => <Chip key={i} label={i} on={instruments.includes(i)} onClick={() => tog(instruments, i, setInstruments)} />)}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={instrumentInput} onChange={e => setInstrumentInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addToArr(instrumentInput, instruments, setInstruments, () => setInstrumentInput('')))} placeholder="Add other instrument..." style={{ ...inp, flex: 1 }} />
              <button onClick={() => addToArr(instrumentInput, instruments, setInstruments, () => setInstrumentInput(''))} style={{ padding: '0 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', height: '44px' }}>Add</button>
            </div>
            {instruments.filter(i => !INSTRUMENT_PRESETS.includes(i)).map(i => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '6px 6px 0 0', padding: '4px 10px', backgroundColor: '#F59E0B', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#1a1a2e' }}>
                {i}<button onClick={() => setInstruments(p => p.filter(x => x !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a2e', padding: 0, lineHeight: 1, fontSize: '14px' }}>×</button>
              </span>
            ))}
          </div>

          {/* Driving */}
          <div style={{ marginBottom: '18px' }}>
            <FL>Driving</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {DRIVING_OPTS.map(d => <Chip key={d} label={d} on={driving.includes(d)} onClick={() => tog(driving, d, setDriving)} />)}
            </div>
          </div>

          {/* Swimming */}
          <div style={{ marginBottom: '18px' }}>
            <FL>Swimming Level</FL>
            <select value={swimmingLevel} onChange={e => setSwimmingLevel(e.target.value)} style={sel}>
              <option value="">Select</option>
              {SWIMMING_LEVELS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Languages */}
          <div style={{ marginBottom: '18px' }}>
            <FL>Languages</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '8px' }}>
              {LANG_PRESETS.map(l => <Chip key={l} label={l} on={languages.includes(l)} onClick={() => { if (l === 'English') return; tog(languages, l, setLanguages) }} />)}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addToArr(langInput, languages, setLanguages, () => setLangInput('')))} placeholder="Add other language..." style={{ ...inp, flex: 1 }} />
              <button onClick={() => addToArr(langInput, languages, setLanguages, () => setLangInput(''))} style={{ padding: '0 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', height: '44px' }}>Add</button>
            </div>
            {languages.filter(l => !LANG_PRESETS.includes(l)).map(l => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '6px 6px 0 0', padding: '4px 10px', backgroundColor: '#F59E0B', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#1a1a2e' }}>
                {l}<button onClick={() => setLanguages(p => p.filter(x => x !== l))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a2e', padding: 0, lineHeight: 1, fontSize: '14px' }}>×</button>
              </span>
            ))}
          </div>

          {/* Other skills */}
          <div>
            <FL>Other Special Skills</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '8px' }}>
              {OTHER_SKILL_PRESETS.map(s => <Chip key={s} label={s} on={otherSkills.includes(s)} onClick={() => tog(otherSkills, s, setOtherSkills)} />)}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={otherSkillInput} onChange={e => setOtherSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addToArr(otherSkillInput, otherSkills, setOtherSkills, () => setOtherSkillInput('')))} placeholder="e.g. Juggling, Archery, Stage combat..." style={{ ...inp, flex: 1 }} />
              <button onClick={() => addToArr(otherSkillInput, otherSkills, setOtherSkills, () => setOtherSkillInput(''))} style={{ padding: '0 16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer', height: '44px' }}>Add</button>
            </div>
            {otherSkills.filter(s => !OTHER_SKILL_PRESETS.includes(s)).map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: '6px 6px 0 0', padding: '4px 10px', backgroundColor: '#F59E0B', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#1a1a2e' }}>
                {s}<button onClick={() => setOtherSkills(p => p.filter(x => x !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a2e', padding: 0, lineHeight: 1, fontSize: '14px' }}>×</button>
              </span>
            ))}
          </div>
        </CS>

        {/* ── SECTION 7: EXPERIENCE AND TRAINING ── */}
        <CS title="🎬 Experience and Training">
          <div style={{ marginBottom: '14px' }}>
            <FL>Experience Level</FL>
            <select value={actingExperience} onChange={e => setActingExperience(e.target.value)} style={sel}>
              <option value="">Select your level</option>
              {EXPERIENCE_LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <FL>Formal Training — select all that apply</FL>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '6px' }}>
              {TRAINING_OPTS.map(t => <Chip key={t} label={t} on={training.includes(t)} onClick={() => tog(training, t, setTraining)} />)}
            </div>
          </div>
          <div>
            <FL>Notable Credits (optional)</FL>
            <textarea value={credits} onChange={e => setCredits(e.target.value)} placeholder={'List any notable productions you have worked on.\ne.g. The Last of Us Season 2 (HBO), XYZ Commercial for Air Canada'} rows={4} style={{ ...ta, fontFamily: 'inherit' }} />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>Not required, but helps casting directors understand your experience.</p>
          </div>
        </CS>

        {/* ── AGENCY ── */}
        <CS title="🏢 My Agency">
          {agencyLinks.filter(l => l.status !== 'inactive').length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {agencyLinks.filter(l => l.status !== 'inactive').map(link => (
                <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: link.status === 'approved' ? '#f0fdf4' : '#f9fafb', border: `1px solid ${link.status === 'approved' ? '#86efac' : '#e5e7eb'}`, borderRadius: '8px' }}>
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a2e', margin: '0 0 2px' }}>{link.agency_name}</p>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: link.status === 'approved' ? '#16a34a' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {link.status === 'approved' ? '✅ On Roster' : '⏳ Pending Approval'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: '0 0 4px' }}>Self-Represented</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>You are not currently on any agency roster. To join an agency, contact them directly.</p>
            </div>
          )}
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '8px 0 0' }}>Agency membership is managed directly through the agency.</p>
        </CS>

        {/* ── CONTACT AND LINKS ── */}
        <CS title="📞 Contact and Links">
          <div style={{ marginBottom: '12px' }}>
            <FL>Email Address</FL>
            <input type="email" value={userEmail} disabled style={{ ...inp, backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }} />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>Your sign-in email — change it in account settings.</p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <FL>Phone Number (optional)</FL>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (604) 555-0100" style={inp} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <FL>Preferred Contact Method</FL>
            <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
              {(['email','phone','either'] as const).map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                  <input type="radio" name="preferredContact" value={opt} checked={preferredContact === opt} onChange={() => setPreferredContact(opt)} style={{ accentColor: '#F59E0B' }} />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <FL>Instagram (optional)</FL>
            <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@yourusername" style={inp} />
          </div>
          <div>
            <FL>IMDb URL (optional)</FL>
            <input type="url" value={imdbUrl} onChange={e => setImdbUrl(e.target.value)} placeholder="https://www.imdb.com/name/nm..." style={inp} />
          </div>
        </CS>

        {/* ── ADDITIONAL PHOTOS ── */}
        <CS title="📷 Additional Photos">
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 14px' }}>Visible to agents and casting directors.</p>

          {/* Free slots — 2 slots */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {([
              { label: 'Full Body', url: photoFront, setUrl: setPhotoFront, ref: fileFrontRef, type: 'full_body_front' as const },
              { label: 'Misc', url: photoExtra, setUrl: setPhotoExtra, ref: fileExtraRef, type: 'additional' as const },
            ]).map((slot, i) => (
              <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                {slot.url ? (
                  <>
                    <img src={slot.url} alt={slot.label} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '6px 10px', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#374151', fontWeight: '600' }}>{slot.label}</span>
                      <button onClick={() => slot.setUrl('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => slot.ref.current?.click()} style={{ width: '100%', aspectRatio: '3/4', border: 'none', backgroundColor: '#f9fafb', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '28px' }}>📷</span>
                    <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', padding: '0 8px' }}>{slot.label}</span>
                  </button>
                )}
                <input ref={slot.ref} type="file" accept="image/jpeg,image/png,image/webp,image/heic" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAdditionalPhoto(f, slot.type) }} />
              </div>
            ))}
          </div>

          {/* Paid slots — 4 slots */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>Extra Photo Slots</span>
              {!photosUnlocked && (
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '20px', padding: '2px 8px' }}>UPGRADE</span>
              )}
            </div>

            {photosUnlocked ? (
              /* ── UNLOCKED: 4 uploadable slots with editable names ── */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                  {([
                    { key: 'photo_additional_2', defaultLabel: 'Photo 4', url: photoPaid1, setUrl: setPhotoPaid1, ref: filePaid1Ref, type: 'additional_2' as const },
                    { key: 'photo_full_body_side', defaultLabel: 'Photo 5', url: photoPaid2, setUrl: setPhotoPaid2, ref: filePaid2Ref, type: 'full_body_side' as const },
                    { key: 'headshot_alt', defaultLabel: 'Photo 6', url: photoPaid3, setUrl: setPhotoPaid3, ref: filePaid3Ref, type: 'headshot_alt' as const },
                    { key: 'wardrobe_formal', defaultLabel: 'Photo 7', url: photoPaid4, setUrl: setPhotoPaid4, ref: filePaid4Ref, type: 'wardrobe_formal' as const },
                  ]).map((slot) => {
                    const customName = photoSlotLabels[slot.key] || ''
                    const displayLabel = customName || slot.defaultLabel
                    return (
                      <div key={slot.key} style={{ border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fffbeb' }}>
                        {slot.url ? (
                          <>
                            <img src={slot.url} alt={displayLabel} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                            <div style={{ padding: '6px 10px', backgroundColor: '#fffbeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', color: '#92400e', fontWeight: '600' }}>{displayLabel}</span>
                              <button onClick={() => slot.setUrl('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                            </div>
                          </>
                        ) : (
                          <button onClick={() => slot.ref.current?.click()} style={{ width: '100%', aspectRatio: '3/4', border: 'none', backgroundColor: '#fffbeb', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '28px' }}>📷</span>
                            <span style={{ fontSize: '11px', color: '#92400e', textAlign: 'center', padding: '0 8px' }}>{displayLabel}</span>
                          </button>
                        )}
                        <div style={{ padding: '6px 8px', backgroundColor: '#fef3c7', borderTop: '1px solid #fde68a' }}>
                          <input
                            type="text"
                            placeholder={slot.defaultLabel}
                            value={customName}
                            maxLength={32}
                            onChange={e => setPhotoSlotLabels(prev => ({ ...prev, [slot.key]: e.target.value }))}
                            style={{ width: '100%', fontSize: '11px', border: '1px solid #fde68a', borderRadius: '5px', padding: '4px 6px', backgroundColor: 'white', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                          />
                        </div>
                        <input ref={slot.ref} type="file" accept="image/jpeg,image/png,image/webp,image/heic" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAdditionalPhoto(f, slot.type) }} />
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0' }}>Name each slot — visible to agents and casting.</p>
              </>
            ) : (
              /* ── LOCKED: 4 greyed locked tiles + upgrade button ── */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {(['Photo 4', 'Photo 5', 'Photo 6', 'Photo 7']).map((label) => (
                    <div key={label} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', opacity: 0.5 }}>
                      <div style={{ width: '100%', aspectRatio: '3/4', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '28px' }}>🔒</span>
                        <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', padding: '0 8px' }}>{label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/checkout/photo-slots', { method: 'POST', credentials: 'include' })
                    if (res.ok) {
                      const { url } = await res.json()
                      if (url) window.location.href = url
                    } else {
                      setMessage('❌ Could not start checkout. Please try again.')
                    }
                  }}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a2e', color: '#F59E0B', border: '2px solid #F59E0B', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                >
                  🔓 Unlock 4 more photo slots — $9.98
                </button>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '6px 0 0', textAlign: 'center' }}>One-time purchase. Name each slot. Never expires.</p>

                {/* Promo code bypass */}
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  {!showPromoInput ? (
                    <button
                      onClick={() => { setShowPromoInput(true); setPromoError('') }}
                      style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Have a photo promo code?
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Enter code"
                          value={promoCode}
                          onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError('') }}
                          maxLength={24}
                          style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #F59E0B', borderRadius: '7px', fontSize: '13px', fontFamily: 'monospace', color: '#1a1a2e', outline: 'none', backgroundColor: 'white' }}
                        />
                        <button
                          disabled={promoLoading || !promoCode.trim()}
                          onClick={async () => {
                            setPromoLoading(true)
                            setPromoError('')
                            const res = await fetch('/api/photo-promo/redeem', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ code: promoCode.trim() }),
                            })
                            const data = await res.json()
                            setPromoLoading(false)
                            if (res.ok) {
                              setPhotosUnlocked(true)
                              setShowPromoInput(false)
                              setPromoCode('')
                            } else {
                              setPromoError(data.error || 'Invalid code')
                            }
                          }}
                          style={{ padding: '8px 14px', backgroundColor: promoLoading ? '#9ca3af' : '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '13px', cursor: promoLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                        >
                          {promoLoading ? '…' : 'Apply'}
                        </button>
                      </div>
                      {promoError && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0, textAlign: 'left' }}>{promoError}</p>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <p style={{ fontSize: '11px', color: '#6b7280', margin: '12px 0 0' }}>JPG, PNG, WebP or HEIC. Compressed to WebP automatically.</p>
        </CS>

        {/* ── SAVE ── */}
        {saveMessage && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>
            {saveMessage}
          </div>
        )}

        {saveError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#DC2626', fontSize: '14px' }}>
            {saveError}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? '#9ca3af' : '#F59E0B',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '10px',
            padding: '14px 32px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            width: '100%',
            marginTop: '8px',
          }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

      </div>
    </div>
  )
}
