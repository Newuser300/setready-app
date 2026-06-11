import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      console.error('No authorization token');
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }
    
    console.log('Checkout Section 2 - User:', user.id);
    
    // Get the Price ID from environment variables
    const priceId = process.env.NEXT_PUBLIC_STRIPE_SECTION_2_PRICE_ID;
    
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