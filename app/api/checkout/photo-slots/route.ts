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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.setready.site'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'cad',
          unit_amount: 998, // $9.98 CAD
          product_data: {
            name: 'SetReady — 4 Extra Photo Slots',
            description: 'Unlock 4 additional named photo slots on your performer profile. One-time purchase, never expires.',
          },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/profile?photo_slots_unlocked=true`,
      cancel_url: `${appUrl}/profile`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        type: 'photo_slots',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Photo slots checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
