import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
  apiVersion: '2026-04-22.dahlia',
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

    // ─── STEP 2: Store stripe_customer_id when checkout completes ────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log('📋 checkout.session.completed received');
      console.log(`   session.id:                ${session.id}`);
      console.log(`   session.mode:              ${session.mode}`);
      console.log(`   session.client_reference_id: ${session.client_reference_id}`);
      console.log(`   session.metadata:          ${JSON.stringify(session.metadata)}`);
      console.log(`   session.customer:          ${session.customer}`);

      const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
      const stripeCustomerId = session.customer as string | null;

      console.log(`👤 Resolved userId: ${userId}`);
      console.log(`💳 Resolved stripeCustomerId: ${stripeCustomerId}`);

      if (!userId) {
        console.error('❌ No userId — client_reference_id and metadata.userId are both missing. Skipping.');
        break;
      }

      if (!stripeCustomerId) {
        console.error('❌ No stripeCustomerId on session. Skipping.');
        break;
      }

      // For section 2 (one-time payment) also unlock section 2 immediately.
      // For section 1 (subscription) only store the customer id here —
      // subscription_status is set in invoice.paid once payment is confirmed.
      const updatePayload: Record<string, unknown> = {
        stripe_customer_id: stripeCustomerId,
      };

      if (session.mode === 'payment') {
        console.log('🎓 One-time payment — also setting section2_unlocked = true');
        updatePayload.section2_unlocked = true;
      } else {
        console.log('🔄 Subscription checkout — storing stripe_customer_id only (invoice.paid will activate)');
      }

      console.log(`📝 Updating users WHERE id = '${userId}' with:`, updatePayload);
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error('❌ Failed to update user in checkout.session.completed:', updateError);
      } else {
        console.log(`✅ User updated. Rows affected:`, updatedRows);
      }
      break;
    }

    // ─── STEP 3: Activate subscription when invoice is paid ──────────────────
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceAny = invoice as any;
      const stripeCustomerId = invoice.customer as string | null;
      // In API version 2026-04-22.dahlia the subscription moved to parent.subscription_details.subscription
      const stripeSubscriptionId = (
        invoiceAny.parent?.subscription_details?.subscription ??
        invoiceAny.subscription ??
        null
      ) as string | null;

      console.log('💰 invoice.paid received');
      console.log(`   invoice.id:              ${invoice.id}`);
      console.log(`   invoice.customer:        ${stripeCustomerId}`);
      console.log(`   invoice.subscription:    ${stripeSubscriptionId}`);

      if (!stripeCustomerId) {
        console.error('❌ No stripeCustomerId on invoice.paid event. Skipping.');
        break;
      }

      if (!stripeSubscriptionId) {
        console.log('ℹ️  invoice.paid has no subscription id — likely a one-time payment, skipping subscription activation.');
        break;
      }

      console.log(`🔍 Looking up user WHERE stripe_customer_id = '${stripeCustomerId}'...`);
      const { data: userData, error: findError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .maybeSingle();

      if (findError) {
        console.error('❌ Error querying user by stripe_customer_id:', findError);
        break;
      }

      if (!userData) {
        console.error(`❌ No user found with stripe_customer_id = '${stripeCustomerId}'. Was checkout.session.completed processed first?`);
        break;
      }

      console.log(`👤 Found user: ${userData.id}`);

      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);
      console.log(`📅 subscription_ends_at set to: ${subscriptionEndsAt.toISOString()}`);

      const updatePayload = {
        subscription_status: 'active',
        stripe_subscription_id: stripeSubscriptionId,
        subscription_ends_at: subscriptionEndsAt.toISOString(),
      };

      console.log(`📝 Updating users WHERE id = '${userData.id}' with:`, updatePayload);
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', userData.id)
        .select();

      if (updateError) {
        console.error('❌ Failed to activate subscription in invoice.paid:', updateError);
      } else {
        console.log(`✅ Subscription activated for user ${userData.id}. Rows affected:`, updatedRows);
      }
      break;
    }

    // ─── STEP 4: Deactivate subscription when it is cancelled ────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string | null;

      console.log('🗑️  customer.subscription.deleted received');
      console.log(`   subscription.id:      ${subscription.id}`);
      console.log(`   subscription.customer: ${stripeCustomerId}`);

      if (!stripeCustomerId) {
        console.error('❌ No stripeCustomerId on subscription.deleted event. Skipping.');
        break;
      }

      console.log(`🔍 Looking up user WHERE stripe_customer_id = '${stripeCustomerId}'...`);
      const { data: userData, error: findError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .maybeSingle();

      if (findError) {
        console.error('❌ Error querying user by stripe_customer_id:', findError);
        break;
      }

      if (!userData) {
        console.error(`❌ No user found with stripe_customer_id = '${stripeCustomerId}'. Skipping.`);
        break;
      }

      console.log(`👤 Found user: ${userData.id} — setting subscription_status = 'inactive'`);
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ subscription_status: 'inactive' })
        .eq('id', userData.id)
        .select();

      if (updateError) {
        console.error('❌ Failed to deactivate subscription:', updateError);
      } else {
        console.log(`✅ Subscription deactivated for user ${userData.id}. Rows affected:`, updatedRows);
      }
      break;
    }

    default:
      console.log(`📋 Unhandled event type: ${event.type} — ignoring`);
  }

  console.log('✅ Webhook handler complete — returning 200');
  return NextResponse.json({ received: true });
}
