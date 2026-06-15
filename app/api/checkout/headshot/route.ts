import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

export async function POST(request: Request) {
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const quantity = body.quantity === 5 ? 5 : 1
  const unitAmountCents = 200 // $2.00 CAD per analysis

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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/headshot-analyzer?purchased=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/headshot-analyzer`,
      customer_email: user.email!,
      metadata: {
        user_id: user.id,
        type: 'headshot_credits',
        credits: quantity.toString(),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Headshot checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
