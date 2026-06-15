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

  const { data, error } = await supabaseAdmin
    .from('performer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || {})
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
  console.log('Profile save for user:', user.id)
  const body = await req.json()
  console.log('Fields received:', Object.keys(body))

  const cleanBody = Object.fromEntries(
    Object.entries(body).filter(([_, v]) => v !== undefined)
  )

  const { data, error } = await supabaseAdmin
    .from('performer_profiles')
    .upsert(
      { ...cleanBody, user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) {
    console.error('Profile save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('Profile saved:', data?.id)
  return NextResponse.json({ success: true, profile: data })
}
