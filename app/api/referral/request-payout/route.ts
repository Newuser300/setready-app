import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { etransferEmail, amount } = await request.json();

  if (!etransferEmail || !amount) {
    return NextResponse.json({ error: 'Email and amount are required' }, { status: 400 });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const { data: commissions } = await supabaseAdmin
    .from('referral_commissions')
    .select('commission_amount')
    .eq('referrer_id', user.id)
    .eq('status', 'pending');

  const available = (commissions || []).reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  if (parsedAmount > available) {
    return NextResponse.json({
      error: `Insufficient balance. Available: $${available.toFixed(2)}`
    }, { status: 400 });
  }

  const { error: insertError } = await supabaseAdmin
    .from('referral_payout_requests')
    .insert({
      user_id: user.id,
      etransfer_email: etransferEmail,
      amount: parsedAmount,
      status: 'pending',
    });

  if (insertError) {
    console.error('Payout request insert error:', insertError);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Payout request for $${parsedAmount.toFixed(2)} submitted. We process payouts monthly via Interac e-Transfer.`
  });
}
