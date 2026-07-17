import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const quantity = body.quantity === 5 ? 5 : 1
  const unitAmountCents = 200 // $2.00 CAD per analysis

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bgready.site'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'cad',
          unit_amount: unitAmountCents,
          product_data: {
            name: quantity === 1
              ? 'Headshot Analyzer — 1 Analysis Credit'
              : 'Headshot Analyzer — 5 Analysis Credits',
            description: 'AI-powered casting director headshot critique. Credits never expire.',
          },
        },
        quantity,
      }],
      success_url: `${appUrl}/headshot-analyzer?purchased=true`,
      cancel_url: `${appUrl}/headshot-analyzer`,
      customer_email: user.email!,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      after_expiration: { recovery: { enabled: true, allow_promotion_codes: true } },
      metadata: {
        user_id: user.id,
        type: 'headshot_credits',
        credits: quantity.toString(),
        itemName: 'Headshot Analyzer credits',
        returnPath: '/headshot-analyzer',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Headshot checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
