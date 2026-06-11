import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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
