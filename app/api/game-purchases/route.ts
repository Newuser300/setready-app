import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    let user: any = null;
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    if (cookieUser) {
      user = cookieUser;
    } else {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      if (token) { const { data: { user: tokenUser } } = await supabaseAdmin.auth.getUser(token); user = tokenUser; }
    }
    if (!user) return NextResponse.json({ items: [], counts: {}, purchases: [], skipCount: 0 });

    const game = new URL(request.url).searchParams.get('game');
    // pull the unique purchase id (stripe_session_id) per row so the client can
    // count consumable purchases and apply each one exactly once across reloads.
    let query = supabaseAdmin.from('game_purchases').select('item, stripe_session_id').eq('user_id', user.id);
    if (game) query = query.eq('game', game);
    const { data, error } = await query;

    if (error) {
      console.error('Game purchases fetch error:', error);
      return NextResponse.json({ items: [], counts: {}, purchases: [], skipCount: 0 });
    }
    const rows = data || [];

    // items: deduplicated list (back-compat; permanent unlocks like pack_studio use this)
    const items = Array.from(new Set(rows.map(r => r.item)));

    // counts: how many times each item was purchased (for consumable power-up uses)
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.item] = (counts[r.item] || 0) + 1;

    // purchases: one entry per purchase row, with a stable unique id, so the client
    // can grant each distinct purchase once even if the same item is bought repeatedly.
    const purchases = rows.map((r, i) => ({
      id: (r.stripe_session_id as string) || `${r.item}:${i}`,
      item: r.item as string,
    }));

    const skipCount = rows.filter(r => r.item === 'skip').length;
    return NextResponse.json({ items, counts, purchases, skipCount });
  } catch (e) {
    console.error('Game purchases route error:', e);
    return NextResponse.json({ items: [], counts: {}, purchases: [], skipCount: 0 });
  }
}
