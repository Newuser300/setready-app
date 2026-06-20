import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(request: Request) {
  try {
    // Cookie-first auth, Bearer-token fallback — mirrors the section1 route.
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

    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }

    // Get the Price ID from environment variables
    const priceId = process.env.STRIPE_SECTION_2_PRICE_ID;
    
    if (!priceId) {
      console.error('Missing Stripe Price ID for Section 2');
      return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 });
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?section2_unlocked=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        type: 'section2',
      },
    });
    
    return NextResponse.json({ url: session.url });
    
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}