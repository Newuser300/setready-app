import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/isAdmin';

async function getUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

const VALID_TIERS = ['full', 'apprentice', 'aabp', 'permittee'];
const VALID_UNIONS = ['ubcp', 'actra'];

// Own submissions
export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('membership_verifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data || [] });
}

// Create a new pending submission
export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { union_org, tier, member_number, file_url, filename, file_type } = body;

  if (!VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: 'Invalid membership tier' }, { status: 400 });
  }
  if (!file_url?.trim()) {
    return NextResponse.json({ error: 'A proof document is required' }, { status: 400 });
  }
  if (!file_url.startsWith(user.id + '/')) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
  }
  if (tier !== 'permittee' && !member_number?.trim()) {
    return NextResponse.json({ error: 'A member number is required for this tier' }, { status: 400 });
  }

  // Replace any existing still-pending submission so the queue stays clean.
  await supabaseAdmin
    .from('membership_verifications')
    .delete()
    .eq('user_id', user.id)
    .eq('status', 'pending');

  const { data, error } = await supabaseAdmin
    .from('membership_verifications')
    .insert({
      user_id: user.id,
      tier,
      member_number: member_number?.trim() || null,
      file_url,
      filename: filename || null,
      file_type: file_type || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: data });
}
