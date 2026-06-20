import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
});

const BOOST_TIERS: Record<string, { priceEnv: string; months: number }> = {
  '1':  { priceEnv: 'STRIPE_BOOST_1MO_PRICE_ID',  months: 1 },
  '3':  { priceEnv: 'STRIPE_BOOST_3MO_PRICE_ID',  months: 3 },
  '6':  { priceEnv: 'STRIPE_BOOST_6MO_PRICE_ID',  months: 6 },
  '12': { priceEnv: 'STRIPE_BOOST_12MO_PRICE_ID', months: 12 },
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    let user: any = null;
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    if (cookieUser) {
      user = cookieUser;
    } else {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      if (token) {
        const { data: { user: tokenUser } } = await supabaseAdmin.auth.getUser(token);
        user = tokenUser;
      }
    }
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const tier = String((body as any)?.tier ?? '');
    const config = BOOST_TIERS[tier];
    if (!config) return NextResponse.json({ error: 'Invalid boost option' }, { status: 400 });

    const priceId = process.env[config.priceEnv];
    if (!priceId) return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.setready.site';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/profile?boost=success`,
      cancel_url: `${appUrl}/profile?boost=cancelled`,
      client_reference_id: user.id,
      metadata: { userId: user.id, type: 'boost', months: String(config.months) },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Boost checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
