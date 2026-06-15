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
  console.log('🔥 Webhook POST received', {
    url: request.url,
    method: request.method,
    contentType: request.headers.get('content-type'),
  });

  const body = await request.text();
  console.log(`📦 Raw body length: ${body.length} characters`);

  const sig = request.headers.get('stripe-signature');
  console.log(`🔑 Signature header present: ${sig ? 'Yes' : 'No'}`);

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log('🔐 Webhook secret exists:', !!webhookSecret);
  console.log('🔐 Webhook secret prefix:', webhookSecret?.slice(0, 10));

  if (!sig) {
    console.error('❌ No stripe-signature header found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET env var is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    console.log('🔐 Attempting to verify webhook signature...');
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
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

      // One-time Section 2 payment: session.customer is null, use userId directly
      if (session.mode === 'payment' && session.metadata?.type === 'section2') {
        console.log(`📝 One-time section2 payment — updating users WHERE id = '${userId}', setting section2_unlocked = true`);
        const { data: updatedRows, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ section2_unlocked: true })
          .eq('id', userId)
          .select();

        if (updateError) {
          console.error('❌ Failed to unlock section2:', updateError);
        } else {
          console.log(`✅ section2_unlocked = true set for user ${userId}. Rows affected:`, updatedRows);
        }
        break;
      }

      // One-time headshot credits payment
      if (session.mode === 'payment' && session.metadata?.type === 'headshot_credits') {
        const creditsToAdd = parseInt(session.metadata?.credits || '1', 10);
        console.log(`🤳 Headshot credits payment — adding ${creditsToAdd} credit(s) to user ${userId}`);
        const { data: currentUser } = await supabaseAdmin
          .from('users').select('headshot_credits').eq('id', userId).maybeSingle();
        const newCredits = (currentUser?.headshot_credits || 0) + creditsToAdd;
        const { error: creditsError } = await supabaseAdmin
          .from('users').update({ headshot_credits: newCredits }).eq('id', userId);
        if (creditsError) console.error('❌ Failed to add headshot credits:', creditsError);
        else console.log(`✅ Headshot credits updated to ${newCredits} for user ${userId}`);
        break;
      }

      // Subscription checkout: stripeCustomerId is required
      if (!stripeCustomerId) {
        console.error('❌ No stripeCustomerId on session. Skipping.');
        break;
      }

      // Upsert: DB trigger guarantees the row exists, but upsert is safe if it doesn't.
      const upsertPayload: Record<string, unknown> = {
        id: userId,
        stripe_customer_id: stripeCustomerId,
      };

      // For subscription sessions, activate immediately — don't rely solely on invoice.paid
      if (session.mode === 'subscription') {
        upsertPayload.subscription_status = 'active';
        upsertPayload.subscription_updated_at = new Date().toISOString();
        if (session.subscription) {
          upsertPayload.stripe_subscription_id = session.subscription as string;
        }
        console.log(`🔓 Subscription checkout — also setting subscription_status = active for user ${userId}`);
      }

      console.log(`📝 Upserting users WHERE id = '${userId}' with:`, upsertPayload);
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('users')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select();

      if (updateError) {
        console.error('❌ Failed to upsert user in checkout.session.completed:', updateError);
      } else {
        console.log(`✅ User upserted. Rows affected:`, updatedRows);
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

      // FIX B: Retry lookup once after a delay to handle the race where
      // invoice.paid arrives before checkout.session.completed has written
      // stripe_customer_id to public.users.
      console.log(`🔍 Looking up user WHERE stripe_customer_id = '${stripeCustomerId}'...`);
      let findError: unknown = null;
      let userData: { id: string; referred_by: string | null; subscription_started_at: string | null } | null = null;

      const { data: firstAttempt, error: firstError } = await supabaseAdmin
        .from('users')
        .select('id, referred_by, subscription_started_at')
        .eq('stripe_customer_id', stripeCustomerId)
        .maybeSingle();

      if (firstError) {
        console.error('❌ Error querying user by stripe_customer_id:', firstError);
        break;
      }

      if (!firstAttempt) {
        console.log('⏳ User not found on first attempt — waiting 3 seconds and retrying...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const { data: secondAttempt, error: secondError } = await supabaseAdmin
          .from('users')
          .select('id, referred_by, subscription_started_at')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();

        findError = secondError;
        userData = secondAttempt;
      } else {
        userData = firstAttempt;
      }

      if (findError) {
        console.error('❌ Error on retry querying user by stripe_customer_id:', findError);
        break;
      }

      if (!userData) {
        console.error(`❌ User still not found after retry with stripe_customer_id = '${stripeCustomerId}'. Giving up.`);
        break;
      }

      console.log(`👤 Found user: ${userData.id}`);

      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);
      console.log(`📅 subscription_ends_at set to: ${subscriptionEndsAt.toISOString()}`);

      const updatePayload: Record<string, unknown> = {
        subscription_status: 'active',
        stripe_subscription_id: stripeSubscriptionId,
        subscription_ends_at: subscriptionEndsAt.toISOString(),
      };
      if (!userData.subscription_started_at) {
        updatePayload.subscription_started_at = new Date().toISOString();
        console.log('📅 Setting subscription_started_at (first subscription)');
      }

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

      // ── Commission tracking ──────────────────────────────────────────────────
      if (userData.referred_by) {
        console.log(`🤝 User referred_by UUID: ${userData.referred_by} — calculating commission...`);

        // referred_by stores the referrer's user UUID directly
        const { data: referrer } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', userData.referred_by)
          .maybeSingle();

        if (referrer) {
          const invoiceAmount = ((invoice as any).amount_paid ?? 0) / 100;
          const commissionAmount = parseFloat((invoiceAmount * 0.20).toFixed(2));

          const commissionPayableAfter = new Date();
          commissionPayableAfter.setDate(commissionPayableAfter.getDate() + 30);

          const { error: commissionError } = await supabaseAdmin
            .from('referral_commissions')
            .insert({
              referrer_id: referrer.id,
              referred_user_id: userData.id,
              sale_amount: invoiceAmount,
              commission_amount: commissionAmount,
              commission_rate: 20.00,
              status: 'pending_30_days',
              payment_method: 'etransfer',
              commission_payable_after: commissionPayableAfter.toISOString(),
            });

          if (commissionError) {
            console.error('❌ Failed to insert referral commission:', commissionError);
          } else {
            console.log(`✅ Commission $${commissionAmount} (20% of $${invoiceAmount}) queued for referrer ${referrer.id}`);
          }
        } else {
          console.log(`ℹ️  Referral code '${userData.referred_by}' not found — no commission recorded`);
        }
      }
      break;
    }

    // ─── STEP 4a: Handle subscription status changes ─────────────────────────
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string | null;

      console.log('🔄 customer.subscription.updated received');
      console.log(`   subscription.id:      ${subscription.id}`);
      console.log(`   subscription.status:  ${subscription.status}`);
      console.log(`   subscription.customer: ${stripeCustomerId}`);

      if (!stripeCustomerId) { break; }

      const { data: userData, error: findError } = await supabaseAdmin
        .from('users').select('id').eq('stripe_customer_id', stripeCustomerId).maybeSingle();

      if (findError) { console.error('❌ Error finding user on subscription.updated:', findError); break; }
      if (!userData) { console.error(`❌ No user found for stripe_customer_id ${stripeCustomerId}`); break; }

      const newStatus = subscription.status === 'active' ? 'active' : 'inactive';
      await supabaseAdmin.from('users').update({
        subscription_status: newStatus,
        subscription_updated_at: new Date().toISOString(),
      }).eq('id', userData.id);

      console.log(`✅ subscription_status updated to '${newStatus}' for user ${userData.id}`);
      break;
    }

    // ─── STEP 4b: Deactivate subscription when it is cancelled ───────────────
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
