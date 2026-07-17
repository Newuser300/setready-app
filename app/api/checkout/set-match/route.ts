import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { abandonedCartOptions } from '@/lib/checkout-recovery';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' as any });

const ITEMS: Record<string, { priceEnv: string }> = {
  unlimited_lives: { priceEnv: 'STRIPE_SETMATCH_LIVES_PRICE_ID' },
  extra_moves:     { priceEnv: 'STRIPE_SETMATCH_MOVES_PRICE_ID' },
  pro_player:      { priceEnv: 'STRIPE_SETMATCH_PRO_PRICE_ID' },
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
      if (token) { const { data: { user: tokenUser } } = await supabaseAdmin.auth.getUser(token); user = tokenUser; }
    }
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const item = String((body as any)?.item ?? '');
    const config = ITEMS[item];
    if (!config) return NextResponse.json({ error: 'Invalid item' }, { status: 400 });

    const priceId = process.env[config.priceEnv];
    if (!priceId) return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bgready.site';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/games/set-match?purchase=success`,
      cancel_url: `${appUrl}/games/set-match?purchase=cancelled`,
      client_reference_id: user.id,
      ...abandonedCartOptions({ email: user.email, mode: 'payment' }),
      metadata: { userId: user.id, type: 'game_purchase', game: 'set-match', item, itemName: 'Set Match item', returnPath: '/games/set-match' },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Set Match checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
