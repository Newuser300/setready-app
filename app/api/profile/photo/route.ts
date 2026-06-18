import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

const TYPE_TO_COLUMN: Record<string, string> = {
  full_body_front: 'photo_full_body_front',
  full_body_side: 'photo_full_body_side',
  additional: 'photo_additional',
  additional_2: 'photo_additional_2',
  headshot_alt: 'headshot_alt',
  wardrobe_formal: 'wardrobe_formal',
  wardrobe_casual: 'wardrobe_casual',
}

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
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
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const photo = formData.get('photo') as File | null
  const type = formData.get('type') as string | null

  if (!photo || photo.size === 0) {
    return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
  }

  const column = type ? TYPE_TO_COLUMN[type] : null
  if (!column) {
    return NextResponse.json({ error: `Unknown photo type: ${type}` }, { status: 400 })
  }

  if (photo.size > 1 * 1024 * 1024) {
    return NextResponse.json({ error: 'Compressed photo must be under 1 MB' }, { status: 400 })
  }

  const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.id}/${type}.${ext}`
  const bytes = await photo.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('headshots')
    .upload(path, buffer, { contentType: photo.type, upsert: true })

  if (uploadError) {
    console.error('Photo upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('headshots').getPublicUrl(path)
  const url = urlData.publicUrl

  const { error: dbError } = await supabaseAdmin
    .from('performer_profiles')
    .upsert(
      { user_id: user.id, [column]: url, updated_at: new Date().toISOString() },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )

  if (dbError) {
    console.error('DB update error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ url })
}
