import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Use admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: Request) {
  console.log('🔥 Webhook POST received - Starting processing');
  
  // Get the raw body as text - this is CRITICAL for Stripe signature verification
  const body = await request.text();
  console.log(`📦 Raw body length: ${body.length} characters`);
  
  const sig = request.headers.get('stripe-signature');
  console.log(`🔑 Signature header present: ${sig ? 'Yes' : 'No'}`);
  
  if (!sig) {
    console.error('❌ No stripe-signature header found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }
  
  let event: Stripe.Event;
  
  try {
    console.log('🔐 Attempting to verify webhook signature...');
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log(`✅ Webhook verified! Event type: ${event.type}`);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      
      console.log(`💰 Checkout completed - Mode: ${session.mode}, UserId: ${userId}`);
      
      if (!userId) {
        console.error('❌ No user_id found in checkout session');
        break;
      }
      
      // Section 1: Subscription
      if (session.mode === 'subscription' && session.subscription) {
        console.log(`📝 Updating subscription for user ${userId}...`);
        
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
          })
          .eq('id', userId);
        
        if (error) {
          console.error('❌ Database update failed:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        console.log(`✅ Subscription activated for user ${userId}`);
      }
      
      // Section 2: One-time payment
      else if (session.mode === 'payment') {
        console.log(`📝 Unlocking Section 2 for user ${userId}...`);
        
        const { error } = await supabaseAdmin
          .from('users')
          .update({ 
            section2_unlocked: true,
            stripe_customer_id: session.customer,
          })
          .eq('id', userId);
        
        if (error) {
          console.error('❌ Section 2 update failed:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        console.log(`✅ Section 2 unlocked for user ${userId}`);
      }
      break;
    }
    
    default:
      console.log(`📋 Unhandled event type: ${event.type}`);
  }
  
  return NextResponse.json({ received: true });
}