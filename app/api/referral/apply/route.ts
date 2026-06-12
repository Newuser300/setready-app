import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const normalizedCode = code.trim().toUpperCase();

  // Fetch current user's profile
  const { data: currentUser } = await admin
    .from('users')
    .select('referred_by, referral_code')
    .eq('id', user.id)
    .maybeSingle();

  // Already applied — cannot change
  if (currentUser?.referred_by) {
    return NextResponse.json(
      { error: 'You have already applied a referral code. Referral codes cannot be changed.' },
      { status: 403 }
    );
  }

  // Cannot use own code
  if (currentUser?.referral_code === normalizedCode) {
    return NextResponse.json(
      { error: 'You cannot use your own referral code.' },
      { status: 400 }
    );
  }

  // Find the referrer by code
  const { data: referrer } = await admin
    .from('users')
    .select('id')
    .eq('referral_code', normalizedCode)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json(
      { error: 'Code not found. Please check and try again.' },
      { status: 404 }
    );
  }

  // Double-check: referrer cannot be the current user
  if (referrer.id === user.id) {
    return NextResponse.json(
      { error: 'You cannot use your own referral code.' },
      { status: 400 }
    );
  }

  // Apply the code
  const { error: updateError } = await admin
    .from('users')
    .update({ referred_by: normalizedCode })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error applying referral code:', updateError);
    return NextResponse.json({ error: 'Failed to apply code. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
