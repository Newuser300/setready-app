import { NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('performer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data || null)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const profileJson = formData.get('data') as string
  const profile = JSON.parse(profileJson)

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
      const { data: urlData } = supabaseAdmin.storage
        .from('headshots')
        .getPublicUrl(path)
      headshotUrl = urlData.publicUrl
    }
  }

  const { error } = await supabaseAdmin
    .from('performer_profiles')
    .upsert(
      {
        user_id: user.id,
        ...profile,
        ...(headshotUrl ? { headshot_url: headshotUrl } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    ...(headshotUrl ? { headshot_url: headshotUrl } : {})
  })
}
