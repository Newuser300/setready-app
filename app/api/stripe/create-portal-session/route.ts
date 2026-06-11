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
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      console.error('No authorization token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token using service role client (works even with strict RLS)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS and read stripe_customer_id
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    let stripeCustomerId = userData?.stripe_customer_id ?? null;

    // Fallback: if stripe_customer_id is null, look up by email in Stripe
    if (!stripeCustomerId && user.email) {
      console.log(`No stripe_customer_id in DB for user ${user.id} — searching Stripe by email: ${user.email}`);
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
        console.log(`Found Stripe customer by email: ${stripeCustomerId} — backfilling DB`);
        await supabaseAdmin
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id);
      }
    }

    if (!stripeCustomerId) {
      console.error('No Stripe customer ID found for user:', user.id);
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
