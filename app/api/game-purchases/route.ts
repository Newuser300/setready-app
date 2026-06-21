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
    if (!user) return NextResponse.json({ items: [], skipCount: 0 });

    const game = new URL(request.url).searchParams.get('game');
    let query = supabaseAdmin.from('game_purchases').select('item').eq('user_id', user.id);
    if (game) query = query.eq('game', game);
    const { data, error } = await query;

    if (error) {
      console.error('Game purchases fetch error:', error);
      return NextResponse.json({ items: [], skipCount: 0 });
    }
    const rows = data || [];
    const items = Array.from(new Set(rows.map(r => r.item)));
    const skipCount = rows.filter(r => r.item === 'skip').length;
    return NextResponse.json({ items, skipCount });
  } catch (e) {
    console.error('Game purchases route error:', e);
    return NextResponse.json({ items: [], skipCount: 0 });
  }
}
