import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

export async function POST(req: Request) {
  try {
    const { amount } = await req.json()

    // amount is in cents, validate $1–$1000 CAD
    if (!amount || amount < 100 || amount > 100000) {
      return NextResponse.json({ error: 'Amount must be between $1 and $1,000 CAD' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            unit_amount: amount,
            product_data: {
              name: 'Support SetReady',
              description: 'One-time donation to keep SetReady free for background performers across Canada.',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate/thank-you`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate`,
      submit_type: 'donate',
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[donate checkout]', err)
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 })
  }
}
