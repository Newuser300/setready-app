import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Option B (talent pays $9.99): starts a Stripe Checkout session for the module fee.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const key = String(body.partner || '');
  const email = String(body.email || '').trim().toLowerCase();

  const { data: partner } = await supabaseAdmin
    .from('partner_accounts')
    .select('id, name, price_cents')
    .eq('partner_key', key)
    .eq('active', true)
    .maybeSingle();

  if (!partner) {
    return NextResponse.json({ error: 'Invalid or inactive partner key' }, { status: 403 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'payments not configured' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const back = origin + '/widget/index.html?partner=' + encodeURIComponent(key) + '&api=' + encodeURIComponent(origin);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'cad',
          unit_amount: partner.price_cents ?? 999,
          product_data: { name: 'SetReady Training & Certification' },
        },
      },
    ],
    metadata: { partner_id: partner.id, email, kind: 'widget_training' },
    success_url: back + '&paid=1',
    cancel_url: back,
  });

  return NextResponse.json({ url: session.url });
}
