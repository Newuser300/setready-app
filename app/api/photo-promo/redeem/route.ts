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

  // Fetch code (service role bypasses RLS)
  const { data: pc, error: fetchError } = await supabaseAdmin
    .from('photo_promo_codes')
    .select('id, is_used, use_count, max_uses, used_by, used_at')
    .eq('code', code)
    .maybeSingle()

  if (fetchError) {
    console.error('❌ photo-promo fetch error:', fetchError)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  if (!pc) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  const useCount = pc.use_count ?? 0
  const maxUses = pc.max_uses ?? 1

  // Legacy codes (created before use_count/max_uses columns) rely on is_used flag
  if (pc.use_count === null && pc.is_used) {
    return NextResponse.json({ error: 'This code has already been used' }, { status: 400 })
  }
  if (useCount >= maxUses) {
    return NextResponse.json({ error: 'This code has reached its usage limit' }, { status: 400 })
  }

  // Atomic increment: only updates if use_count is still below max (race-safe)
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('photo_promo_codes')
    .update({
      use_count: useCount + 1,
      is_used: useCount + 1 >= maxUses,
      used_by: pc.used_by ?? user.id,
      used_at: pc.used_at ?? new Date().toISOString(),
    })
    .eq('id', pc.id)
    .lt('use_count', maxUses)
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('❌ photo-promo update error:', updateError)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  if (!updated) {
    // Another concurrent request claimed the last slot
    return NextResponse.json({ error: 'This code has reached its usage limit' }, { status: 400 })
  }

  // Slot claimed — unlock photos for this user
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
