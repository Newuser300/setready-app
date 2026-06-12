import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/isAdmin';

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

export async function POST(req: Request) {
  console.log('=== Referral Apply Route Called ===');

  const user = await getUser(req);
  console.log('Auth user:', user?.email ?? 'null');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let code: string;
  try {
    const body = await req.json();
    code = body.code?.trim().toUpperCase() ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  console.log('Code to apply:', code);
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  // Fetch current user profile
  const { data: currentUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('referred_by, referral_code')
    .eq('id', user.id)
    .maybeSingle();

  console.log('Current user:', JSON.stringify(currentUser));
  if (userError) console.error('User fetch error:', JSON.stringify(userError));

  // Already has a referral applied — treat as success so checkout proceeds
  if (currentUser?.referred_by) {
    console.log('User already has referral applied');
    return NextResponse.json({ success: true, alreadyApplied: true });
  }

  // Cannot use own code
  if (currentUser?.referral_code === code) {
    return NextResponse.json(
      { error: 'You cannot use your own referral code.' },
      { status: 400 }
    );
  }

  // Look up referrer by their referral_code column — get their UUID
  const { data: referrer, error: referrerError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle();

  console.log('Referrer UUID:', referrer?.id ?? 'null');
  if (referrerError) console.error('Referrer lookup error:', JSON.stringify(referrerError));

  if (!referrer) {
    return NextResponse.json(
      { error: 'Code not found. Please check and try again.' },
      { status: 404 }
    );
  }

  if (referrer.id === user.id) {
    return NextResponse.json(
      { error: 'You cannot use your own referral code.' },
      { status: 400 }
    );
  }

  // Store the referrer's UUID in referred_by (NOT the code string — referred_by is UUID type)
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ referred_by: referrer.id })
    .eq('id', user.id);

  if (updateError) {
    console.error('Referral update error:', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    });
    return NextResponse.json(
      { error: updateError.message || 'Failed to save referral code.' },
      { status: 500 }
    );
  }

  console.log('Referral applied: user', user.email, '→ referrer', referrer.id);
  return NextResponse.json({ success: true });
}
