import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

// GET ?email=: look up user details for confirmation panel
export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email query param required' }, { status: 400 });

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name, subscription_status, stripe_subscription_id, stripe_customer_id, created_at, subscription_started_at')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (!user) return NextResponse.json({ error: `No user found for: ${email}` }, { status: 404 });

  const [progressResult, certResult] = await Promise.all([
    supabaseAdmin.from('user_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
    supabaseAdmin.from('certificates').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const within30Days = user.subscription_started_at
    ? (Date.now() - new Date(user.subscription_started_at).getTime()) < 30 * 24 * 60 * 60 * 1000
    : false;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    subscription_status: user.subscription_status,
    stripe_subscription_id: user.stripe_subscription_id || null,
    subscription_started_at: user.subscription_started_at || null,
    within_30_days: within30Days,
    created_at: user.created_at,
    completed_modules: progressResult.count ?? 0,
    certificates: certResult.count ?? 0,
  });
}

// DELETE body { userId }: permanently remove user
export async function DELETE(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let userId: string;
  try {
    const body = await request.json();
    userId = body.userId;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, stripe_subscription_id, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const log: string[] = [];

  // 1. Cancel Stripe subscription (no refund — 30-day minimum commitment policy)
  if (user.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      if (sub.status !== 'canceled') {
        await stripe.subscriptions.cancel(user.stripe_subscription_id);
        log.push('Stripe subscription cancelled (no refund per 30-day minimum commitment policy)');
      } else {
        log.push('Subscription already cancelled');
      }
    } catch (err: unknown) {
      log.push(`Stripe error (continuing): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Nullify referred_by for anyone this user referred
  const { error: nullifyErr } = await supabaseAdmin
    .from('users')
    .update({ referred_by: null })
    .eq('referred_by', userId);
  if (nullifyErr) log.push(`Warning: could not clear referral links: ${nullifyErr.message}`);
  else log.push('Cleared referral links');

  // 3. Delete referral commissions
  const { error: commErr } = await supabaseAdmin
    .from('referral_commissions')
    .delete()
    .or(`referrer_id.eq.${userId},referred_user_id.eq.${userId}`);
  if (commErr) log.push(`Warning: referral_commissions: ${commErr.message}`);
  else log.push('Deleted referral commissions');

  // 4. Delete certificates
  const { error: certErr } = await supabaseAdmin
    .from('certificates')
    .delete()
    .eq('user_id', userId);
  if (certErr) log.push(`Warning: certificates: ${certErr.message}`);
  else log.push('Deleted certificates');

  // 5. Delete user progress
  const { error: progErr } = await supabaseAdmin
    .from('user_progress')
    .delete()
    .eq('user_id', userId);
  if (progErr) log.push(`Warning: user_progress: ${progErr.message}`);
  else log.push('Deleted user progress');

  // 6. Delete from users table
  const { error: userErr } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);
  if (userErr) log.push(`Warning: users table: ${userErr.message}`);
  else log.push('Deleted user profile');

  // 7. Delete Supabase auth account
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authErr) log.push(`Warning: auth deletion: ${authErr.message}`);
  else log.push('Deleted auth account');

  console.log(`[remove-user] Admin ${admin.email} deleted user ${user.email} (${userId}):`, log);

  return NextResponse.json({ success: true, email: user.email, log });
}
