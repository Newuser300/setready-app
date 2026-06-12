import { NextResponse } from 'next/server';
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin';

// ── GET: return all payout requests, commissions, and summary ────────────────
export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: payoutRequests, error: payoutError } = await supabaseAdmin
    .from('referral_payout_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (payoutError) {
    console.error('Error fetching payout requests:', payoutError);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }

  const enrichedPayouts = await Promise.all(
    (payoutRequests || []).map(async (req) => {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email, referral_code')
        .eq('id', req.user_id)
        .maybeSingle();
      return {
        ...req,
        user_email: userData?.email || 'Unknown',
        referral_code: userData?.referral_code || '—',
      };
    })
  );

  const { data: commissions, error: commError } = await supabaseAdmin
    .from('referral_commissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (commError) {
    console.error('Error fetching commissions:', commError);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  }

  const enrichedCommissions = await Promise.all(
    (commissions || []).map(async (c) => {
      const [{ data: referrer }, { data: referred }] = await Promise.all([
        supabaseAdmin.from('users').select('email').eq('id', c.referrer_id).maybeSingle(),
        supabaseAdmin.from('users').select('email').eq('id', c.referred_user_id).maybeSingle(),
      ]);

      const referredEmail = referred?.email || '';
      const maskedReferred = referredEmail.includes('@')
        ? referredEmail[0] + '***@' + referredEmail.split('@')[1]
        : '***';

      return {
        ...c,
        referrer_email: referrer?.email || 'Unknown',
        referred_email: maskedReferred,
      };
    })
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const pending = (payoutRequests || []).filter(r => r.status === 'pending');
  const paid = (payoutRequests || []).filter(r => r.status === 'paid');
  const monthlyPending = pending.filter(r => r.requested_at >= monthStart);

  const pendingCount = pending.length;
  const pendingAmount = pending.reduce((sum, r) => sum + (r.amount || 0), 0);
  const monthlyAmount = monthlyPending.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalPaid = paid.reduce((sum, r) => sum + (r.amount || 0), 0);
  const uniqueReferrers = new Set((commissions || []).map(c => c.referrer_id)).size;

  return NextResponse.json({
    payoutRequests: enrichedPayouts,
    commissions: enrichedCommissions,
    summary: {
      pendingCount,
      pendingAmount,
      monthlyAmount,
      totalPaid,
      activeReferrers: uniqueReferrers,
    },
  });
}

// ── POST: mark a payout request as paid ─────────────────────────────────────
export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { payoutRequestId } = await request.json();
  if (!payoutRequestId) {
    return NextResponse.json({ error: 'payoutRequestId is required' }, { status: 400 });
  }

  const { data: payoutReq, error: fetchError } = await supabaseAdmin
    .from('referral_payout_requests')
    .select('id, user_id, amount, status')
    .eq('id', payoutRequestId)
    .maybeSingle();

  if (fetchError || !payoutReq) {
    console.error('Payout request not found:', fetchError);
    return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
  }

  if (payoutReq.status === 'paid') {
    return NextResponse.json({ error: 'Already marked as paid' }, { status: 409 });
  }

  const paidAt = new Date().toISOString();

  const { error: payoutUpdateError } = await supabaseAdmin
    .from('referral_payout_requests')
    .update({ status: 'paid', paid_at: paidAt })
    .eq('id', payoutRequestId);

  if (payoutUpdateError) {
    console.error('Failed to update payout request:', payoutUpdateError);
    return NextResponse.json({ error: 'Failed to update payout request' }, { status: 500 });
  }

  const { error: commUpdateError } = await supabaseAdmin
    .from('referral_commissions')
    .update({ status: 'paid', paid_at: paidAt })
    .eq('referrer_id', payoutReq.user_id)
    .eq('status', 'pending');

  if (commUpdateError) {
    console.error('Failed to update commissions:', commUpdateError);
    return NextResponse.json({ error: 'Failed to update commissions' }, { status: 500 });
  }

  console.log(`✅ Admin ${admin.email} marked payout ${payoutRequestId} as paid ($${payoutReq.amount})`);

  return NextResponse.json({
    success: true,
    message: `Payout of $${payoutReq.amount?.toFixed(2)} marked as paid.`,
  });
}
