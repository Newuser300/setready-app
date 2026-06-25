import { NextResponse } from 'next/server';
import { getCastingSession, getAgentSession, supabaseAdmin } from '@/lib/casting-auth';

export async function POST(req: Request) {
  const { performerUserId } = await req.json();
  if (!performerUserId) return NextResponse.json({ ok: false });

  // Only log views by casting directors (the people performers care about)
  const casting = await getCastingSession();
  if (!casting) {
    // Not a casting director (agent or performer) — don't log
    await getAgentSession().catch(() => null);
    return NextResponse.json({ ok: true, logged: false });
  }

  // Resolve viewer name + most recent production for context
  let viewerName: string | null = null;
  let productionName: string | null = null;
  const { data: cd } = await supabaseAdmin
    .from('casting_directors')
    .select('name, company')
    .eq('id', casting.accountId)
    .maybeSingle();
  if (cd) viewerName = cd.company || cd.name || null;

  const { data: recentReq } = await supabaseAdmin
    .from('casting_requests')
    .select('production_name')
    .eq('casting_director_id', casting.accountId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentReq) productionName = recentReq.production_name;

  await supabaseAdmin.from('profile_views').insert({
    performer_user_id: performerUserId,
    viewer_type: 'casting',
    viewer_id: casting.accountId,
    viewer_name: viewerName,
    production_name: productionName,
  });

  return NextResponse.json({ ok: true, logged: true });
}
