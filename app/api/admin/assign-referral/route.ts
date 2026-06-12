import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

export async function POST(req: Request) {
  const requester = await getUser(req);
  if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!getAdminEmails().includes(requester.email?.toLowerCase() ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userEmail, referralCode } = await req.json();
  if (!userEmail?.trim() || !referralCode?.trim()) {
    return NextResponse.json({ error: 'Missing userEmail or referralCode' }, { status: 400 });
  }

  const normalizedCode  = referralCode.trim().toUpperCase();
  const normalizedEmail = userEmail.trim().toLowerCase();

  // Find the target user in auth.users
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authUser = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

  if (!authUser) {
    return NextResponse.json({ error: `No account found for email: ${normalizedEmail}` }, { status: 404 });
  }

  // Get the target user's profile row
  const { data: targetProfile } = await admin
    .from('users')
    .select('id, referred_by, referral_code')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
  }

  // Already has a referral applied
  if (targetProfile.referred_by) {
    return NextResponse.json(
      { error: `This user already has referral code "${targetProfile.referred_by}" applied.` },
      { status: 409 }
    );
  }

  // Validate the referral code exists
  const { data: referrer } = await admin
    .from('users')
    .select('id')
    .eq('referral_code', normalizedCode)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json(
      { error: `Referral code "${normalizedCode}" does not exist.` },
      { status: 404 }
    );
  }

  // Cannot assign a user their own code
  if (referrer.id === authUser.id) {
    return NextResponse.json(
      { error: 'Cannot assign a user their own referral code.' },
      { status: 400 }
    );
  }

  // Apply
  const { error: updateError } = await admin
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
