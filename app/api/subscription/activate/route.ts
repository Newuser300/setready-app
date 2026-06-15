import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST() {
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

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 })

    if (customers.data.length === 0) {
      return NextResponse.json({ activated: false, reason: 'No Stripe customer found' })
    }

    const customer = customers.data[0]

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 5,
    })

    console.log(`[activate] Stripe subscriptions for ${user.email}:`, subscriptions.data.length)

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0]
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'active',
          stripe_customer_id: customer.id,
          stripe_subscription_id: sub.id,
          subscription_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        console.error('[activate] DB update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log(`[activate] ✅ Subscription activated for ${user.email}`)
      return NextResponse.json({ activated: true, customerId: customer.id, subscriptionId: sub.id })
    }

    // Fallback: check for completed checkout sessions
    const sessions = await stripe.checkout.sessions.list({ customer: customer.id, limit: 10 })
    const completed = sessions.data.find(
      s => s.payment_status === 'paid' && s.status === 'complete'
    )

    if (completed) {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'active',
          stripe_customer_id: customer.id,
          subscription_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (!error) {
        console.log(`[activate] ✅ Activated via checkout session for ${user.email}`)
        return NextResponse.json({ activated: true, source: 'checkout_session' })
      }
    }

    return NextResponse.json({ activated: false, reason: 'No active subscription found in Stripe' })
  } catch (err: any) {
    console.error('[activate] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
