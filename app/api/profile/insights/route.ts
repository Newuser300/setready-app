import { NextResponse } from 'next/server';
import { getSessionUser } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: u } = await supabaseAdmin
    .from('users').select('insights_unlocked').eq('id', user.id).maybeSingle();

  if (!u?.insights_unlocked) return NextResponse.json({ unlocked: false });

  const { data: views } = await supabaseAdmin
    .from('profile_views')
    .select('viewer_name, production_name, created_at')
    .eq('performer_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = views || [];
  const now = Date.now();
  const last30 = rows.filter(v => now - new Date(v.created_at).getTime() < 30 * 86400000).length;
  const productions = [...new Set(rows.map(v => v.production_name).filter(Boolean))];

  return NextResponse.json({
    unlocked: true,
    totalViews: rows.length,
    last30Days: last30,
    productions,
    recent: rows.slice(0, 20),
  });
}
