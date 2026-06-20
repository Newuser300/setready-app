import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export async function POST() {
  // A user may only delete themselves — authenticate via their own session.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const userId = user.id

  try {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle()

    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const log: string[] = []

    // 1. Cancel Stripe subscription (no refund — 30-day minimum commitment policy)
    if (userData.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(userData.stripe_subscription_id)
        if (sub.status !== 'canceled') {
          await stripe.subscriptions.cancel(userData.stripe_subscription_id)
          log.push('Stripe subscription cancelled (no refund per 30-day minimum commitment policy)')
        } else {
          log.push('Subscription already cancelled')
        }
      } catch (err: unknown) {
        log.push(`Stripe error (continuing): ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // 2. Nullify referred_by for anyone this user referred
    const { error: nullifyErr } = await supabaseAdmin
      .from('users')
      .update({ referred_by: null })
      .eq('referred_by', userId)
    if (nullifyErr) log.push(`Warning: could not clear referral links: ${nullifyErr.message}`)
    else log.push('Cleared referral links')

    // 3. Delete referral commissions
    const { error: commErr } = await supabaseAdmin
      .from('referral_commissions')
      .delete()
      .or(`referrer_id.eq.${userId},referred_user_id.eq.${userId}`)
    if (commErr) log.push(`Warning: referral_commissions: ${commErr.message}`)
    else log.push('Deleted referral commissions')

    // 4. Delete certificates
    const { error: certErr } = await supabaseAdmin
      .from('certificates')
      .delete()
      .eq('user_id', userId)
    if (certErr) log.push(`Warning: certificates: ${certErr.message}`)
    else log.push('Deleted certificates')

    // 5. Delete user progress
    const { error: progErr } = await supabaseAdmin
      .from('user_progress')
      .delete()
      .eq('user_id', userId)
    if (progErr) log.push(`Warning: user_progress: ${progErr.message}`)
    else log.push('Deleted user progress')

    // 6. Delete work logs (best-effort; warn-and-continue if the table name differs)
    const { error: workErr } = await supabaseAdmin
      .from('work_logs')
      .delete()
      .eq('user_id', userId)
    if (workErr) log.push(`Warning: work_logs: ${workErr.message}`)
    else log.push('Deleted work logs')

    // 7. Delete from users table
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
    if (userErr) log.push(`Warning: users table: ${userErr.message}`)
    else log.push('Deleted user profile')

    // 8. Delete Supabase auth account
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authErr) log.push(`Warning: auth deletion: ${authErr.message}`)
    else log.push('Deleted auth account')

    return NextResponse.json({ success: true, log })
  } catch (err: unknown) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
