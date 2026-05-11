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
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      
      console.log(`[Webhook] Mode: ${session.mode}, UserId: ${userId}`);
      
      if (!userId) {
        console.error('[Webhook] No user_id found');
        break;
      }
      
      // Section 1: Subscription
      if (session.mode === 'subscription' && session.subscription) {
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'active',
            stripe_subscription_id: session.subscription,
          })
          .eq('id', userId);
        
        if (error) {
          console.error('[Webhook] Subscription error:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        console.log(`[Webhook] Activated subscription for ${userId}`);
      }
      
      // Section 2: One-time payment
      else if (session.mode === 'payment') {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ section2_unlocked: true })
          .eq('id', userId);
        
        if (error) {
          console.error('[Webhook] Section 2 error:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        console.log(`[Webhook] Unlocked Section 2 for ${userId}`);
      }
      break;
    }
    
    default:
      console.log(`[Webhook] Unhandled: ${event.type}`);
  }
  
  return NextResponse.json({ received: true });
}