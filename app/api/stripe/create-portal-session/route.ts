import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/utils/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(request: Request) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      console.error('[portal] FAIL 1: No authorization token in request headers');
      return NextResponse.json({ error: 'Unauthorized', details: 'No bearer token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[portal] FAIL 1: Auth verification failed', {
        authError: authError?.message ?? null,
        authStatus: authError?.status ?? null,
        userPresent: !!user,
      });
      return NextResponse.json({
        error: 'Unauthorized',
        details: authError?.message ?? 'Token verification returned no user',
      }, { status: 401 });
    }

    console.log('[portal] Auth OK — user:', user.id, user.email);

    // ── 2. Database lookup ────────────────────────────────────────
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('[portal] FAIL 2: DB query failed', {
        message: userError.message,
        code: userError.code,
        details: userError.details,
        hint: userError.hint,
        userId: user.id,
      });
      return NextResponse.json({
        error: 'Billing portal error',
        details: `DB query failed: ${userError.message}`,
      }, { status: 500 });
    }

    console.log('[portal] DB OK — stripe_customer_id:', userData?.stripe_customer_id ?? 'NULL');

    let stripeCustomerId = userData?.stripe_customer_id ?? null;

    // ── 3. Stripe customer lookup (fallback) ──────────────────────
    if (!stripeCustomerId && user.email) {
      console.log(`[portal] No stripe_customer_id in DB — searching Stripe by email: ${user.email}`);
      try {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
          console.log(`[portal] Found Stripe customer by email: ${stripeCustomerId} — backfilling DB`);
          await supabaseAdmin
            .from('users')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', user.id);
        } else {
          console.log('[portal] No Stripe customer found by email either');
        }
      } catch (stripeListErr: any) {
        console.error('[portal] FAIL 3: Stripe customer lookup failed', {
          message: stripeListErr?.message,
          type: stripeListErr?.type,
          code: stripeListErr?.code,
          statusCode: stripeListErr?.statusCode,
        });
        return NextResponse.json({
          error: 'Billing portal error',
          details: `Stripe customer lookup failed: ${stripeListErr?.message}`,
        }, { status: 500 });
      }
    }

    if (!stripeCustomerId) {
      console.error('[portal] FAIL 3: No Stripe customer ID found for user:', user.id, user.email);
      return NextResponse.json({
        error: 'No billing account found',
        details: 'No Stripe customer ID in database and none found by email in Stripe',
      }, { status: 404 });
    }

    // ── 4. Create portal session ──────────────────────────────────
    // Fall back to the live domain: an unset env var would yield
    // "undefined/dashboard", which Stripe rejects as an invalid return_url.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bgready.site';
    const returnUrl = `${appUrl}/dashboard`;
    console.log('[portal] Creating portal session for customer:', stripeCustomerId, '— return_url:', returnUrl);

    let portalSession: Stripe.BillingPortal.Session;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });
    } catch (stripePortalErr: any) {
      console.error('[portal] FAIL 4: Stripe portal session creation failed', {
        message: stripePortalErr?.message,
        type: stripePortalErr?.type,
        code: stripePortalErr?.code,
        statusCode: stripePortalErr?.statusCode,
        stripeCustomerId,
      });
      return NextResponse.json({
        error: 'Billing portal error',
        details: `Stripe portal session failed: ${stripePortalErr?.message}`,
      }, { status: 500 });
    }

    console.log('[portal] Portal session created:', portalSession.id);
    return NextResponse.json({ url: portalSession.url });

  } catch (err: any) {
    console.error('[portal] FAIL: Unexpected top-level error', {
      message: err?.message,
      stack: err?.stack,
    });
    return NextResponse.json({
      error: 'Billing portal error',
      details: err?.message ?? 'Unknown error',
    }, { status: 500 });
  }
}
