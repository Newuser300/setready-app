import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin';

export const runtime = 'nodejs';

const TIER_LABELS: Record<string, string> = {
  full: 'Full Member',
  apprentice: 'Apprentice',
  aabp: 'AABP',
  permittee: 'Permittee',
};

// List submissions (pending first), enriched with the member's name/email.
export async function GET(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = new URL(req.url).searchParams.get('status'); // optional filter

  let query = supabaseAdmin
    .from('membership_verifications')
    .select('*')
    .order('status', { ascending: true }) // 'approved','pending','rejected' -> pending not first alphabetically; re-sorted below
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data: subs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = subs || [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersById: Record<string, { name?: string; email?: string }> = {};
  if (userIds.length) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
    for (const u of users || []) usersById[u.id] = { name: u.name, email: u.email };
  }

  // Pending first, then most recent.
  const order = { pending: 0, approved: 1, rejected: 2 } as Record<string, number>;
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  const enriched = rows.map((r) => ({
    ...r,
    tier_label: TIER_LABELS[r.tier] || r.tier,
    user_name: usersById[r.user_id]?.name || '',
    user_email: usersById[r.user_id]?.email || '',
  }));

  return NextResponse.json({ submissions: enriched });
}

// Approve or reject a submission.
export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, action, notes } = await req.json().catch(() => ({}));
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and a valid action are required' }, { status: 400 });
  }

  const { data: sub, error: fetchErr } = await supabaseAdmin
    .from('membership_verifications')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !sub) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const nowIso = new Date().toISOString();

  await supabaseAdmin
    .from('membership_verifications')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      review_notes: notes?.trim() || null,
      reviewed_at: nowIso,
    })
    .eq('id', id);

  if (action === 'approve') {
    // Apprentice and AABP status renews annually — set a 1-year expiry.
    let expires: string | null = null;
    if (sub.tier === 'apprentice' || sub.tier === 'aabp') {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      expires = d.toISOString().slice(0, 10);
    }
    await supabaseAdmin
      .from('users')
      .update({
        membership_tier: sub.tier,
        membership_number: sub.member_number,
        membership_verified: true,
        membership_verified_at: nowIso,
        membership_expires_at: expires,
      })
      .eq('id', sub.user_id);
  }

  return NextResponse.json({ success: true });
}
