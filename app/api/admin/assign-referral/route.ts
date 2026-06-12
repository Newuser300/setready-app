import { NextResponse } from 'next/server';
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin';

export async function POST(req: Request) {
  const admin = await verifyAdminRequest(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userEmail, referralCode } = await req.json();
  if (!userEmail?.trim() || !referralCode?.trim()) {
    return NextResponse.json({ error: 'Missing userEmail or referralCode' }, { status: 400 });
  }

  const normalizedCode  = referralCode.trim().toUpperCase();
  const normalizedEmail = userEmail.trim().toLowerCase();

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const authUser = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
  if (!authUser) {
    return NextResponse.json({ error: `No account found for email: ${normalizedEmail}` }, { status: 404 });
  }

  const { data: targetProfile } = await supabaseAdmin
    .from('users')
    .select('id, referred_by, referral_code')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
  }

  if (targetProfile.referred_by) {
    return NextResponse.json(
      { error: `This user already has referral code "${targetProfile.referred_by}" applied.` },
      { status: 409 }
    );
  }

  const { data: referrer } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('referral_code', normalizedCode)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json({ error: `Referral code "${normalizedCode}" does not exist.` }, { status: 404 });
  }

  if (referrer.id === authUser.id) {
    return NextResponse.json({ error: 'Cannot assign a user their own referral code.' }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ referred_by: normalizedCode })
    .eq('id', authUser.id);

  if (updateError) {
    return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Applied referral code ${normalizedCode} to ${normalizedEmail}`,
    userId: authUser.id,
  });
}
