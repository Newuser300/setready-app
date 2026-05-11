import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
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
    
    console.log('Checkout Section 1 - User:', user.id);
    
    // HARDCODED PRICE ID FOR TESTING (Test Mode - CAD $9.99/month)
    const priceId = 'price_1TR1hpLMmgde5ZjKyU4wcttB';
    
    console.log('Using Price ID:', priceId);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-processing?session_id={CHECKOUT_SESSION_ID}&plan=section1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      client_reference_id: user.id,  // This must be set
      metadata: {
        userId: user.id,              // Also set in metadata as backup
        type: 'section1',
      },
    });
    
    console.log('Checkout session created:', session.id);
    console.log('Session metadata:', session.metadata);
    console.log('Client reference ID:', session.client_reference_id);
    
    return NextResponse.json({ url: session.url });
    
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}