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
      
      // Section 2: One-time payment (unlock immediately)
      if (session.mode === 'payment') {
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
        } else {
          console.log(`✅ Section 2 unlocked for user ${userId}`);
        }
      } 
      // Section 1: Subscription - activate immediately on checkout completion
      else if (session.mode === 'subscription') {
        console.log(`📝 Activating subscription for user ${userId}...`);
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            stripe_customer_id: session.customer,
            subscription_status: 'active',
            stripe_subscription_id: session.subscription,
          })
          .eq('id', userId);

        if (error) {
          console.error('❌ Failed to activate subscription:', error);
        } else {
          console.log(`✅ Subscription activated for user ${userId}`);
        }
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      
      console.log(`💰 invoice.paid received - Subscription ID: ${subscriptionId}`);
      
      if (!subscriptionId) {
        console.error('❌ No subscription ID found on invoice.paid event');
        break;
      }

      const { data: userData, error: findError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', invoice.customer)
        .single();

      if (findError) {
        console.error('❌ Error finding user by customer ID:', findError);
        break;
      }

      if (userData) {
        console.log(`📝 Updating subscription for user ${userData.id}...`);
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'active',
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', userData.id);
          
        if (error) {
          console.error('❌ Database update failed:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        console.log(`✅ Subscription activated for user ${userData.id}`);
      }
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;

      console.log(`❌ Subscription deleted: ${subscription.id}`);

      const { data: userData, error: findError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (findError) {
        console.error('❌ Error finding user by subscription ID:', findError);
        break;
      }

      if (userData) {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ subscription_status: 'inactive' })
          .eq('id', userData.id);

        if (error) {
          console.error('❌ Failed to deactivate subscription:', error);
        } else {
          console.log(`✅ Subscription marked inactive for user ${userData.id}`);
        }
      }
      break;
    }

    default:
      console.log(`📋 Unhandled event type: ${event.type}`);
  }
  
  return NextResponse.json({ received: true });
}