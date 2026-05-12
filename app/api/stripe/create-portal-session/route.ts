import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the Stripe customer ID from your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .single();
    
    if (userError || !userData?.stripe_customer_id) {
      console.error('No Stripe customer ID found for user:', session.user.id);
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });
    
    return NextResponse.json({ url: portalSession.url });
    
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}