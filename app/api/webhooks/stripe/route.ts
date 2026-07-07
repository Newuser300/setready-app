export const maxDuration = 60
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { sendAbandonedCartEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

/**
 * Resolve a subscription's current period end as an ISO string.
 *
 * As of Stripe's Basil release (and the pinned 2026-04-22.dahlia version),
 * current_period_end was removed from the top-level Subscription object and
 * lives on each subscription item: items.data[0].current_period_end (a Unix
 * timestamp in seconds). The old top-level field returns undefined rather than
 * throwing, so we read the item first and fall back to the top-level field only
 * for safety against older shapes. Returns null if neither is present.
 */
function periodEndISO(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;

  const unixSeconds =
    item?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    null;

  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

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

  // Kick off all fulfillment in the background so we return 200 immediately.
  // waitUntil keeps the Vercel function alive until the promise settles.
  waitUntil(fulfillEvent(event));

  return NextResponse.json({ received: true });
}

async function fulfillEvent(event: Stripe.Event): Promise<void> {
  // ─── Idempotency: process each Stripe event id at most once ──────────────
  {
    const { error: dedupeError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .insert({ id: event.id, type: event.type });

    if (dedupeError) {
      // 23505 = unique_violation → already processed.
      if ((dedupeError as { code?: string }).code === '23505') {
        return;
      }
      console.error('⚠️ Stripe event dedupe insert failed (continuing):', dedupeError);
    }
  }

  try { switch (event.type) {

    // ─── STEP 2: Store stripe_customer_id when checkout completes ────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
      const stripeCustomerId = session.customer as string | null;

      // Donation — no userId required; must be handled before the !userId guard
      if (session.mode === 'payment' && session.metadata?.type === 'donation') {
        const donorEmail =
          session.customer_details?.email ??
          (session as any).customer_email ??
          null;
        const donorUserId = session.metadata?.donor_user_id ?? null;
        const { error: donationError } = await supabaseAdmin
          .from('donations')
          .upsert(
            {
              stripe_session_id: session.id,
              amount_cents: session.amount_total,
              currency: session.currency,
              donor_email: donorEmail,
              donor_user_id: donorUserId || null,
              status: 'completed',
            },
            { onConflict: 'stripe_session_id' }
          );
        if (donationError) console.error('❌ Failed to record donation:', donationError);
        break;
      }

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

      // One-time profile boost: extend boost_expires_at by the purchased months
      if (session.mode === 'payment' && session.metadata?.type === 'boost') {
        const months = parseInt(session.metadata?.months || '1', 10);
        const { data: prof } = await supabaseAdmin
          .from('performer_profiles')
          .select('boost_expires_at')
          .eq('user_id', userId)
          .maybeSingle();
        const nowDate = new Date();
        const current = prof?.boost_expires_at ? new Date(prof.boost_expires_at) : null;
        const base = current && current > nowDate ? current : nowDate;
        base.setMonth(base.getMonth() + months);
        const { error: boostError } = await supabaseAdmin
          .from('performer_profiles')
          .update({ boost_expires_at: base.toISOString() })
          .eq('user_id', userId);
        if (boostError) console.error('❌ Failed to extend profile boost:', boostError);
        break;
      }

      // One-time Pro Insights unlock
      if (session.mode === 'payment' && session.metadata?.type === 'insights') {
        const { error: insErr } = await supabaseAdmin
          .from('users')
          .update({ insights_unlocked: true })
          .eq('id', userId);
        if (insErr) console.error('❌ Failed to unlock insights:', insErr);
        break;
      }

      // One-time Verified Badge (bundle) — the badge itself goes pending for
      // admin approval; the bundled extras unlock instantly:
      //   • Pro Insights        (users.insights_unlocked)
      //   • Profile Boost 1 mo. (performer_profiles.boost_expires_at)
      //   • 4 extra photo slots (performer_profiles.photos_unlocked)
      // Each mirrors the exact logic of its standalone purchase.
      if (session.mode === 'payment' && session.metadata?.type === 'verified_badge') {
        // Extend Profile Boost by 1 month from whichever is later (now / current expiry)
        const { data: prof } = await supabaseAdmin
          .from('performer_profiles')
          .select('boost_expires_at')
          .eq('user_id', userId)
          .maybeSingle();
        const nowDate = new Date();
        const current = prof?.boost_expires_at ? new Date(prof.boost_expires_at) : null;
        const base = current && current > nowDate ? current : nowDate;
        base.setMonth(base.getMonth() + 1);

        const { error: vbErr } = await supabaseAdmin
          .from('performer_profiles')
          .update({
            verified_badge_pending: true,
            boost_expires_at: base.toISOString(),
          })
          .eq('user_id', userId);
        if (vbErr) console.error('❌ Failed to apply verified badge bundle (performer_profiles):', vbErr);

        // Pro Insights and extra photo slots both live on the users table
        const { error: insErr } = await supabaseAdmin
          .from('users')
          .update({ insights_unlocked: true, photos_unlocked: true })
          .eq('id', userId);
        if (insErr) console.error('❌ Failed to unlock insights/photos (verified badge bundle):', insErr);

        break;
      }

      // One-time game purchase: record it; the game reconciles effects on load
      if (session.mode === 'payment' && session.metadata?.type === 'game_purchase') {
        const game = session.metadata?.game || '';
        const item = session.metadata?.item || '';
        const { error: gpError } = await supabaseAdmin
          .from('game_purchases')
          .insert({ user_id: userId, game, item, stripe_session_id: session.id });
        if (gpError) console.error('❌ Failed to record game purchase:', gpError);
        break;
      }

      // Subscription checkout: stripeCustomerId is required
      if (!stripeCustomerId) {
        console.error('❌ No stripeCustomerId on session. Skipping.');
        break;
      }

      const upsertPayload: Record<string, unknown> = {
        id: userId,
        stripe_customer_id: stripeCustomerId,
      };

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
      const stripeSubscriptionId = (
        invoiceAny.parent?.subscription_details?.subscription ??
        invoiceAny.subscription ??
        null
      ) as string | null;

      if (!stripeCustomerId || !stripeSubscriptionId) break;

      const { data: userData, error: findError } = await supabaseAdmin
        .from('users')
        .select('id, referred_by, subscription_started_at')
        .eq('stripe_customer_id', stripeCustomerId)
        .maybeSingle();

      if (findError) {
        console.error('❌ Error querying user by stripe_customer_id:', findError);
        break;
      }

      if (!userData) {
        console.warn(`⚠️ User not found for stripe_customer_id ${stripeCustomerId} — will be fulfilled on Stripe retry`);
        break;
      }

      const periodEnd: number | null =
        (invoice.lines?.data?.[0] as any)?.period?.end ?? null;
      const subscriptionEndsAtISO = periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null;
      if (!subscriptionEndsAtISO) {
        console.warn(`⚠️ Could not resolve period end from invoice lines for subscription ${stripeSubscriptionId}`);
      }

      const updatePayload: Record<string, unknown> = {
        subscription_status: 'active',
        stripe_subscription_id: stripeSubscriptionId,
      };
      if (subscriptionEndsAtISO) updatePayload.subscription_ends_at = subscriptionEndsAtISO;
      if (!userData.subscription_started_at) updatePayload.subscription_started_at = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', userData.id);
      if (updateError) console.error('❌ Failed to activate subscription in invoice.paid:', updateError);

      // ── Commission tracking ──────────────────────────────────────────────────
      if (userData.referred_by) {
        const { count: existingCommissions } = await supabaseAdmin
          .from('referral_commissions')
          .select('*', { count: 'exact', head: true })
          .eq('referred_user_id', userData.id);

        if (existingCommissions === 0) {
          const invoiceAmount = ((invoice as any).amount_paid ?? 0) / 100;
          const commissionPayableAfter = new Date();
          commissionPayableAfter.setDate(commissionPayableAfter.getDate() + 30);

          const { error: commissionError } = await supabaseAdmin
            .from('referral_commissions')
            .insert({
              referrer_id: userData.referred_by,
              referred_user_id: userData.id,
              sale_amount: invoiceAmount,
              commission_amount: parseFloat((invoiceAmount * 0.20).toFixed(2)),
              commission_rate: 20.00,
              status: 'pending_30_days',
              payment_method: 'etransfer',
              commission_payable_after: commissionPayableAfter.toISOString(),
            });
          if (commissionError) console.error('❌ Failed to insert referral commission:', commissionError);
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

      const updatePayload: Record<string, unknown> = {
        subscription_status: newStatus,
        subscription_updated_at: new Date().toISOString(),
      };

      const endsAtISO = periodEndISO(subscription);
      if (endsAtISO) {
        updatePayload.subscription_ends_at = endsAtISO;
      }

      await supabaseAdmin.from('users').update(updatePayload).eq('id', userData.id);
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
        .update({
          subscription_status: 'inactive',
          subscription_ends_at: new Date().toISOString(),
          subscription_updated_at: new Date().toISOString(),
        })
        .eq('id', userData.id)
        .select();

      if (updateError) {
        console.error('❌ Failed to deactivate subscription:', updateError);
      }
      break;
    }

    // ─── Abandoned cart: checkout session expired without completing ─────────
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;

      // No recovery nudge for donations
      if (session.metadata?.type === 'donation') break;

      // We need an address to email. customer_email is set at session creation;
      // customer_details.email is only present if they got far enough to enter it.
      const email =
        (session as { customer_email?: string | null }).customer_email ??
        session.customer_details?.email ??
        null;
      if (!email) break;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.setready.site';

      // Prefer Stripe's one-click recovery link (when recovery was enabled on the
      // session); otherwise fall back to the item's page so they can restart.
      const recoveryUrl =
        (session as any).after_expiration?.recovery?.url ??
        (session as any).recovery_url ??
        `${appUrl}${session.metadata?.returnPath || '/dashboard'}`;

      const itemName = session.metadata?.itemName || 'your SetReady purchase';

      await sendAbandonedCartEmail(email, itemName, recoveryUrl);
      break;
    }

    default:
      break;
  } } catch (err) {
    console.error('❌ Unhandled webhook error:', err);
  }
}
