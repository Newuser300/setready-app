import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) console.error('Auth error:', error)
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data, error }, { data: userData }, { count: residencyCount }] = await Promise.all([
    supabaseAdmin.from('performer_profiles').select('*').eq('user_id', user.id).single(),
    supabaseAdmin.from('users').select('home_city,home_region_code,home_lat,home_lng,photos_unlocked,section1_completed,subscription_status,promo_training_expires_at,section2_unlocked,referral_code,referred_by,subscription_started_at').eq('id', user.id).single(),
    supabaseAdmin.from('residency_documents').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ...(data || {}),
    home_city: userData?.home_city ?? null,
    home_region_code: userData?.home_region_code ?? null,
    home_lat: userData?.home_lat ?? null,
    home_lng: userData?.home_lng ?? null,
    photos_unlocked: userData?.photos_unlocked ?? false,
    has_residency_docs: (residencyCount ?? 0) > 0,
    section1_completed: userData?.section1_completed ?? false,
    subscription_status: userData?.subscription_status ?? null,
    promo_training_expires_at: userData?.promo_training_expires_at ?? null,
    section2_unlocked: userData?.section2_unlocked ?? false,
    referral_code: userData?.referral_code ?? null,
    referred_by: userData?.referred_by ?? null,
    subscription_started_at: userData?.subscription_started_at ?? null,
  })
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    // FormData path — handles headshot file upload
    const formData = await req.formData()
    const profileJson = formData.get('data') as string
    const extraData = profileJson ? JSON.parse(profileJson) : {}

    let headshotUrl: string | undefined
    const headshot = formData.get('headshot') as File | null
    if (headshot && headshot.size > 1 * 1024 * 1024) {
      return NextResponse.json({ error: 'Compressed headshot must be under 1 MB' }, { status: 400 })
    }
    if (headshot && headshot.size > 0) {
      const ext = headshot.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/headshot.${ext}`
      const bytes = await headshot.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const { error: uploadError } = await supabaseAdmin.storage
        .from('headshots')
        .upload(path, buffer, { contentType: headshot.type, upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from('headshots').getPublicUrl(path)
        headshotUrl = urlData.publicUrl
      }
    }

    await supabaseAdmin.from('performer_profiles').upsert(
      {
        user_id: user.id,
        ...(headshotUrl ? { headshot_url: headshotUrl } : {}),
        ...extraData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )

    return NextResponse.json({
      success: true,
      ...(headshotUrl ? { headshot_url: headshotUrl } : {}),
    })
  }

  // JSON path — full profile data save
  const body = await req.json()

  // Separate home location fields (stored in users table) from performer_profiles fields
  const { home_city, home_region_code, home_lat, home_lng, ...rest } = body

  const cleanBody = Object.fromEntries(
    Object.entries(rest).filter(([_, v]) => v !== undefined)
  )

  const [{ data, error }, { error: userError }] = await Promise.all([
    supabaseAdmin
      .from('performer_profiles')
      .upsert(
        { ...cleanBody, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )
      .select()
      .single(),
    supabaseAdmin
      .from('users')
      .update({ home_city: home_city ?? null, home_region_code: home_region_code ?? null, home_lat: home_lat ?? null, home_lng: home_lng ?? null })
      .eq('id', user.id),
  ])

  if (error) {
    console.error('Profile save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (userError) console.error('Home location save error:', userError)

  return NextResponse.json({ success: true, profile: data })
}
