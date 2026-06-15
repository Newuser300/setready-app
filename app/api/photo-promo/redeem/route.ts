import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
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

  const body = await req.json().catch(() => ({}))
  const code: string = (body.code ?? '').toString().trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  // Fetch the code using service role (bypasses RLS — users have no SELECT access)
  const { data: promoCode, error: fetchError } = await supabaseAdmin
    .from('photo_promo_codes')
    .select('id, is_used, used_by')
    .eq('code', code)
    .maybeSingle()

  if (fetchError) {
    console.error('❌ photo-promo redeem fetch error:', fetchError)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  if (!promoCode) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  if (promoCode.is_used) {
    return NextResponse.json({ error: 'This code has already been used' }, { status: 400 })
  }

  // Mark code used and unlock slots in a single logical transaction
  const now = new Date().toISOString()

  const { error: markError } = await supabaseAdmin
    .from('photo_promo_codes')
    .update({ is_used: true, used_by: user.id, used_at: now })
    .eq('id', promoCode.id)
    .eq('is_used', false) // atomic guard: no-op if another request already flipped it

  if (markError) {
    console.error('❌ photo-promo mark-used error:', markError)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const { error: unlockError } = await supabaseAdmin
    .from('users')
    .update({ photos_unlocked: true })
    .eq('id', user.id)

  if (unlockError) {
    console.error('❌ photo-promo unlock error:', unlockError)
    return NextResponse.json({ error: 'Code accepted but unlock failed — contact support' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
