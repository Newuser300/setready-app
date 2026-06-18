import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
});

export async function POST(request: Request) {
  try {
    // Primary: cookie-based auth (credentials: 'include')
    const supabase = await createClient();

    let user: any = null;

    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    if (cookieUser) {
      user = cookieUser;
    } else {
      // Fallback: Bearer token
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      if (token) {
        const { data: { user: tokenUser } } = await supabaseAdmin.auth.getUser(token);
        user = tokenUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }

    const priceId = process.env.STRIPE_SECTION_1_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.setready.site';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/payment-processing?session_id={CHECKOUT_SESSION_ID}&plan=section1`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        type: 'section1',
      },
      custom_text: {
        submit: {
          message: 'By subscribing, you agree to a 30-day minimum commitment. Cancellation is available after 30 days from your subscription start date. No refunds are issued.',
        },
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
