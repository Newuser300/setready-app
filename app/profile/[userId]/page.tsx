'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  user_id: string
  headshot_url: string | null
  bio: string | null
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  hair_color: string | null
  eye_color: string | null
  ethnicity: string | null
  union_status: string | null
  special_skills: string[] | null
  languages: string[] | null
  video_reel_url: string | null
  agency_id: string | null
  phone: string | null
  preferred_contact: string | null
  instagram: string | null
  imdb_url: string | null
  verified_badge?: boolean | null
}

type Agency = {
  id: string
  name: string
  city: string | null
}

type UserMeta = {
  full_name?: string
  name?: string
}

function fmtHeight(cm: number | null) {
  if (!cm) return null
  const totalIn = Math.round(cm / 2.54)
  return `${Math.floor(totalIn / 12)}'${totalIn % 12}" (${cm} cm)`
}

function getYouTubeEmbed(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

export default function PublicProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = (params?.userId as string) ?? ''

  const [profile, setProfile] = useState<Profile | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [viewerIsAgent, setViewerIsAgent] = useState(false)

  useEffect(() => {
    if (!userId) return
    loadProfile()
    checkViewerIsAgent()
    fetch('/api/profile/log-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performerUserId: userId }),
    }).catch(() => {})
  }, [userId])

  async function loadProfile() {
    setLoading(true)
    const supabase = createClient()

    // Check if this profile is public (performer_profiles has is_public field or just check existence)
    const { data: prof, error } = await supabase
      .from('performer_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !prof) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setProfile(prof)

    // Load display name from users view
    const { data: userRow } = await supabase
      .from('users')
      .select('raw_user_meta_data, email')
      .eq('id', userId)
      .single()

    if (userRow) {
      const meta = userRow.raw_user_meta_data as UserMeta | null
      setDisplayName(meta?.full_name || meta?.name || userRow.email?.split('@')[0] || 'Performer')
    }

    // Load agency
    if (prof.agency_id) {
      const { data: ag } = await supabase
        .from('agencies')
        .select('id, name, city')
        .eq('id', prof.agency_id)
        .single()
      if (ag) setAgency(ag)
    }

    setLoading(false)
  }

  async function checkViewerIsAgent() {
    const res = await fetch('/api/agent/auth', { method: 'GET' })
    setViewerIsAgent(res.ok)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <p style={{ color: '#9ca3af', fontSize: '16px' }}>Loading profile...</p>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>👤</div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e' }}>Profile not found</h2>
        <p style={{ color: '#6b7280' }}>This performer profile doesn't exist or hasn't been set up yet.</p>
        <button onClick={() => router.back()} style={{ padding: '10px 20px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    )
  }

  const embedUrl = profile.video_reel_url ? getYouTubeEmbed(profile.video_reel_url) : null

  const stats: [string, string | null][] = [
    ['Gender', profile.gender],
    ['Height', fmtHeight(profile.height_cm)],
    ['Hair', profile.hair_color],
    ['Eyes', profile.eye_color],
    ['Ethnicity', profile.ethnicity],
    ['Union', profile.union_status],
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => router.back()}
          style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
        >
          ←
        </button>
        <span style={{ color: '#e5e7eb', fontWeight: '600', fontSize: '15px' }}>Performer Profile</span>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Hero card */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
          {/* Headshot */}
          <div style={{ position: 'relative', backgroundColor: '#e5e7eb', height: profile.headshot_url ? '420px' : undefined }}>
            {profile.headshot_url ? (
              <Image
                src={profile.headshot_url}
                alt={displayName}
                fill
                sizes="(max-width: 680px) 100vw, 680px"
                style={{ objectFit: 'cover' }}
                priority
              />
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '72px' }}>
                👤
              </div>
            )}
            {profile.union_status && (
              <div style={{ position: 'absolute', top: '14px', right: '14px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.75)', color: 'white' }}>
                {profile.union_status}
              </div>
            )}
          </div>

          {/* Name + agency */}
          <div style={{ padding: '20px 20px 16px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {displayName}
              {profile.verified_badge && (
                <span title="Verified Pro" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#22c55e', color: '#06281a', fontSize: '13px', fontWeight: 700, padding: '4px 12px 4px 10px', borderRadius: '999px', verticalAlign: 'middle' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#06281a', color: '#22c55e', fontSize: '11px', fontWeight: 900 }}>✓</span>
                  Verified Pro
                </span>
              )}
            </h1>
            {agency ? (
              <div>
                <p style={{ fontSize: '14px', color: '#F59E0B', fontWeight: '700', margin: '0 0 6px' }}>
                  {agency.name}{agency.city ? ` · ${agency.city}` : ''}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  Contact {agency.name} to book this performer.
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: '0 0 8px' }}>Self-Represented</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {profile.phone && (
                    <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                      📞 <a href={`tel:${profile.phone}`} style={{ color: '#374151', textDecoration: 'none' }}>{profile.phone}</a>
                    </p>
                  )}
                  {profile.instagram && (
                    <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                      📷 <span style={{ color: '#374151' }}>{profile.instagram}</span>
                    </p>
                  )}
                  {profile.imdb_url && (
                    <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                      🎬 <a href={profile.imdb_url} target="_blank" rel="noopener noreferrer" style={{ color: '#F59E0B', textDecoration: 'none' }}>IMDb Profile</a>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Physical stats */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>Stats</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {stats.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>About</h2>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: 0 }}>{profile.bio}</p>
          </div>
        )}

        {/* Special skills */}
        {profile.special_skills && profile.special_skills.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Special Skills</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.special_skills.map(skill => (
                <span key={skill} style={{ padding: '4px 12px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '20px', fontSize: '13px', fontWeight: '500' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {profile.languages && profile.languages.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Languages</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.languages.map(lang => (
                <span key={lang} style={{ padding: '4px 12px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '20px', fontSize: '13px', fontWeight: '500' }}>
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Video reel */}
        {embedUrl && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Demo Reel</h2>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '10px' }}>
              <iframe
                src={embedUrl}
                title="Demo Reel"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Agent CTA */}
        {viewerIsAgent && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '18px 20px' }}>
            <p style={{ fontSize: '14px', color: '#92400e', fontWeight: '600', margin: '0 0 12px' }}>
              You're viewing this profile as an agent.
            </p>
            <button
              onClick={() => router.push('/agent/dashboard')}
              style={{ padding: '10px 20px', backgroundColor: '#F59E0B', color: '#1a1a2e', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
              Go to Agent Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
