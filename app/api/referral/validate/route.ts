import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || code.trim().length < 4) {
    return NextResponse.json({ valid: false });
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('name')
    .eq('referral_code', code.trim().toUpperCase())
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ valid: false });
  }

  // Return first name only for privacy
  const firstName = (data.name || '').split(' ')[0] || null;

  return NextResponse.json({ valid: true, referrerName: firstName });
}
