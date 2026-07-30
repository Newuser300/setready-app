import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const { amount } = await req.json()

    // amount is in cents, validate $1–$1000 CAD
    if (!amount || amount < 100 || amount > 100000) {
      return NextResponse.json({ error: 'Amount must be between $1 and $1,000 CAD' }, { status: 400 })
    }

    // Identify donor if logged in (not required — donations are open to the public)
    let donorUserId: string | null = null
    let donorEmail: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        donorUserId = user.id
        donorEmail = user.email ?? null
      }
    } catch {}

    const metadata: Record<string, string> = { type: 'donation' }
    if (donorUserId) metadata.donor_user_id = donorUserId

    // Fall back to the live domain: an unset env var would yield

    // "undefined/...", which Stripe rejects as an invalid URL.

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bgready.site'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            unit_amount: amount,
            product_data: {
              name: 'Support BGReady',
              description: 'One-time tip to keep BGReady free for background performers across Canada.',
            },
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${appUrl}/donate/thank-you`,
      cancel_url: `${appUrl}/donate`,
      // Stripe only accepts 'auto' | 'book' | 'donate' | 'pay' here, and renders
      // the checkout button from it — the wording cannot be customised. 'donate'
      // rendered a "Donate" button, so 'pay' is used to keep that word off the
      // page; it renders "Pay".
      submit_type: 'pay',
    }

    if (donorEmail) sessionParams.customer_email = donorEmail

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[donate checkout]', err)
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 })
  }
}
