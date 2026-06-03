import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: Request) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      console.error('No authorization token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the Stripe customer ID from your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData?.stripe_customer_id) {
      console.error('No Stripe customer ID found for user:', user.id);
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