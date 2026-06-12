import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/isAdmin';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id, email, name, province, referred_by } = body as {
    id?: string;
    email?: string;
    name?: string;
    province?: string;
    referred_by?: string | null;
  };

  if (!id || !email) {
    return NextResponse.json({ error: 'Missing id or email' }, { status: 400 });
  }

  // Verify the token matches the claimed user id
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  if (token) {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user || user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const profileData: Record<string, unknown> = {
    id,
    email,
    name: name || '',
    subscription_status: 'inactive',
  };

  if (province) profileData.province = province;

  // referred_by column is UUID type — look up the referrer's UUID from their referral code
  if (referred_by) {
    const { data: referrer } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', referred_by)
      .maybeSingle();
    if (referrer?.id) {
      profileData.referred_by = referrer.id;
    }
  }

  const { error } = await supabaseAdmin
    .from('users')
    .upsert(profileData, { onConflict: 'id' });

  if (error) {
    console.error('Profile creation error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: error.message || 'Profile creation failed', code: error.code },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
