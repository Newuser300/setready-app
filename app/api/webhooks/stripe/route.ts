export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {

    // ─── STEP 2: Store stripe_customer_id when checkout completes ────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
      const stripeCustomerId = session.customer as string | null;

      if (!userId) {
        console.error('❌ No userId — client_reference_id and metadata.userId are both missing. Skipping.');
        break;
      }

      // One-time Section 2 payment: session.customer is null, use userId directly
      if (session.mode === 'payment' && session.metadata?.type === 'section2') {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ section2_unlocked: true })
          .eq('id', userId)
          .select();

        if (updateError) {
          console.error('❌ Failed to unlock section2:', updateError);
        }
        break;
      }

      // One-time photo slots unlock
      if (session.mode === 'payment' && session.metadata?.type === 'photo_slots') {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ photos_unlocked: true })
          .eq('id', userId)
          .select();

        if (updateError) {
          console.error('❌ Failed to unlock photo slots:', updateError);
        }
        break;
      }

      // One-time headshot credits payment
      if (session.mode === 'payment' && session.metadata?.type === 'headshot_credits') {
        const creditsToAdd = parseInt(session.metadata?.credits || '1', 10);
        const { data: currentUser } = await supabaseAdmin
          .from('users').select('headshot_credits').eq('id', userId).maybeSingle();
        const newCredits = (currentUser?.headshot_credits || 0) + creditsToAdd;
        const { error: creditsError } = await supabaseAdmin
          .from('users').update({ headshot_credits: newCredits }).eq('id', userId);
        if (creditsError) console.error('❌ Failed to add headshot credits:', creditsError);
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
      }

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select();

      if (updateError) {
        console.error('❌ Failed to upsert user in checkout.session.completed:', updateError);
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

      if (!stripeCustomerId) {
        console.error('❌ No stripeCustomerId on invoice.paid event. Skipping.');
        break;
      }

      if (!stripeSubscriptionId) {
        break;
      }

      // FIX B: Retry lookup once after a delay to handle the race where
      // invoice.paid arrives before checkout.session.completed has written
      // stripe_customer_id to public.users.
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

      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

      const updatePayload: Record<string, unknown> = {
        subscription_status: 'active',
        stripe_subscription_id: stripeSubscriptionId,
        subscription_ends_at: subscriptionEndsAt.toISOString(),
      };
      if (!userData.subscription_started_at) {
        updatePayload.subscription_started_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', userData.id)
        .select();

      if (updateError) {
        console.error('❌ Failed to activate subscription in invoice.paid:', updateError);
      }

      // ── Commission tracking ──────────────────────────────────────────────────
      if (userData.referred_by) {
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
          }
        }
      }
      break;
    }

    // ─── STEP 4a: Handle subscription status changes ─────────────────────────
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string | null;

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

      break;
    }

    // ─── STEP 4b: Deactivate subscription when it is cancelled ───────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string | null;

      if (!stripeCustomerId) {
        console.error('❌ No stripeCustomerId on subscription.deleted event. Skipping.');
        break;
      }

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

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ subscription_status: 'inactive' })
        .eq('id', userData.id)
        .select();

      if (updateError) {
        console.error('❌ Failed to deactivate subscription:', updateError);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
