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
    .select('referral_code, email')
    .eq('id', user.id)
    .maybeSingle();

  let referralCode = userData?.referral_code || null;

  // Auto-generate a referral code for any logged-in user who doesn't have one yet.
  // Referral codes were previously only created on subscription — this fixes access for free users.
  if (!referralCode) {
    const base = (userData?.email || user.email || '')
      .split('@')[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 5);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = (base + suffix).substring(0, 8);

    const { error: codeError } = await supabaseAdmin
      .from('users')
      .update({ referral_code: newCode })
      .eq('id', user.id);

    if (!codeError) {
      referralCode = newCode;
    }
  }

  // referred_by stores the referrer's UUID — count users whose referred_by = current user's id
  const { count: totalReferrals } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', user.id);

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
    .filter(c => c.status === 'pending' || c.status === 'pending_30_days')
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
