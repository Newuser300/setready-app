import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET — return the current user's agency links
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    // Try cookie-based auth
    const supabaseCookie = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Fall back to service role lookup via profile API pattern
    return NextResponse.json([]);
  }

  const { data, error } = await supabaseAdmin
    .from('agency_roster')
    .select('id, agency_id, status, agencies(name)')
    .eq('user_id', user.id)
    .neq('status', 'inactive');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const links = (data || []).map((r: any) => ({
    id: r.id,
    agency_id: r.agency_id,
    agency_name: r.agencies?.name || 'Unknown Agency',
    status: r.status,
  }));

  return NextResponse.json(links);
}

// POST — request to join agency
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { agencyId } = await req.json();
  if (!agencyId) return NextResponse.json({ error: 'agencyId required' }, { status: 400 });

  // Check if a non-inactive link already exists
  const { data: existing } = await supabaseAdmin
    .from('agency_roster')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('agency_id', agencyId)
    .neq('status', 'inactive')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: `You already have a ${existing.status} request for this agency.` }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('agency_roster')
    .insert({ user_id: user.id, agency_id: agencyId, status: 'pending' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE — leave agency (set status to inactive)
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('agency_roster')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
