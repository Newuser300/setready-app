import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { notifyAdmin, adminAlertHtml } from '@/lib/email'

async function getUser() {
  const supabase = await createClient()
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
    .select('id, is_used, use_count, max_uses, used_by, used_at, type')
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

  // Slot claimed — apply the unlock based on the code's type
  const codeType = pc.type ?? 'photo'
  let unlockError: { message?: string } | null = null

  if (codeType === 'insights') {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ insights_unlocked: true })
      .eq('id', user.id)
    unlockError = error
  } else if (codeType === 'verified_badge') {
    const { error } = await supabaseAdmin
      .from('performer_profiles')
      .update({ verified_badge_pending: true })
      .eq('user_id', user.id)
    unlockError = error
  } else {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ photos_unlocked: true })
      .eq('id', user.id)
    unlockError = error
  }

  if (unlockError) {
    console.error('❌ promo unlock error:', unlockError)
    return NextResponse.json({ error: 'Code accepted but unlock failed — contact support' }, { status: 500 })
  }

  // A verified badge redeemed by promo still needs admin approval, and no
  // Stripe webhook fires for it — so alert the admin here. Non-blocking.
  if (codeType === 'verified_badge') {
    ;(async () => {
      try {
        const { data: buyer } = await supabaseAdmin
          .from('users').select('name, email').eq('id', user.id).maybeSingle()
        const who = buyer?.name ? `${buyer.name} (${buyer.email})` : (buyer?.email || user.id)
        await notifyAdmin({
          subject: `Action needed: Verified Badge redeemed by ${buyer?.name || buyer?.email || 'a member'}`,
          html: adminAlertHtml({
            title: 'Verified Badge — approval needed',
            lines: [
              `<b>Verified Badge</b> — redeemed with promo code (no payment)`,
              `Redeemed by ${who}`,
              '<b>This needs your approval</b> before the badge appears on their profile.',
            ],
            actionLabel: 'Review in Admin',
            actionUrl: 'https://www.bgready.site/admin?section=verified_badges',
          }),
        })
      } catch (err) {
        console.error('[promo] admin notification failed:', err)
      }
    })()
  }

  return NextResponse.json({ success: true, type: codeType })
}
