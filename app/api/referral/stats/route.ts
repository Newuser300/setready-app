import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('referral_code')
    .eq('id', user.id)
    .maybeSingle();

  const referralCode = userData?.referral_code || null;

  const { count: totalReferrals } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', referralCode || '___no_match___');

  const { data: commissions } = await supabaseAdmin
    .from('referral_commissions')
    .select('id, commission_amount, sale_amount, status, created_at, referred_user_id')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });

  const commissionsWithEmails = await Promise.all(
    (commissions || []).map(async (c) => {
      const { data: refUser } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', c.referred_user_id)
        .maybeSingle();

      const email = refUser?.email || '';
      const masked = email.includes('@')
        ? email[0] + '***@' + email.split('@')[1]
        : '***';

      return { ...c, referred_email: masked };
    })
  );

  const pendingCommission = (commissions || [])
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  const totalEarned = (commissions || [])
    .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  return NextResponse.json({
    referralCode,
    totalReferrals: totalReferrals || 0,
    pendingCommission,
    totalEarned,
    commissions: commissionsWithEmails,
  });
}
