import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/utils/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ isActive: false }, { status: 401 })
  }

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('subscription_status, stripe_customer_id')
    .eq('id', user.id)
    .single()

  // Already active in DB — return immediately, no Stripe call needed
  if (userData?.subscription_status === 'active') {
    return NextResponse.json({
      isActive: true,
      status: 'active',
      customerId: userData.stripe_customer_id,
      source: 'database',
    })
  }

  // DB says inactive — fall back to checking Stripe directly.
  // This handles the case where the webhook failed or hasn't fired yet
  // (e.g. wrong webhook secret during local dev, or Stripe CLI not running).
  console.log(`🔍 verify: DB shows inactive for ${user.email} — checking Stripe directly`)
  try {
    const customerIds: string[] = []

    if (userData?.stripe_customer_id) {
      // We already know the Stripe customer ID — check it directly
      customerIds.push(userData.stripe_customer_id)
    } else if (user.email) {
      // No customer ID stored yet — search by email
      const customers = await stripe.customers.list({ email: user.email, limit: 3 })
      customerIds.push(...customers.data.map(c => c.id))
    }

    for (const customerId of customerIds) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 5,
      })

      if (subs.data.length > 0) {
        const sub = subs.data[0]
        console.log(`✅ verify: active subscription found in Stripe for ${user.email} — activating in DB`)

        await supabaseAdmin.from('users').update({
          subscription_status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          subscription_updated_at: new Date().toISOString(),
        }).eq('id', user.id)

        return NextResponse.json({
          isActive: true,
          status: 'active',
          customerId,
          source: 'stripe_direct',
        })
      }
    }

    console.log(`ℹ️  verify: no active subscription found in Stripe for ${user.email}`)
  } catch (err) {
    console.error('❌ verify: Stripe direct check failed:', err)
  }

  return NextResponse.json({
    isActive: false,
    status: userData?.subscription_status || 'inactive',
    customerId: userData?.stripe_customer_id ?? null,
    source: 'not_found',
  })
}
