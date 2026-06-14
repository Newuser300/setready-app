import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdmin(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  if (adminEmails.includes(user.email || '')) return true;
  const { data } = await supabaseAdmin.from('admin_users').select('id').eq('email', user.email).maybeSingle();
  return !!data;
}

// GET — return all admin settings
export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data } = await supabaseAdmin.from('admin_settings').select('key, value');
  const settings: Record<string, string> = {};
  (data || []).forEach((r: any) => { settings[r.key] = r.value; });
  return NextResponse.json(settings);
}

// POST — upsert a setting
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { key, value } = await req.json();
  if (!key || value === undefined) return NextResponse.json({ error: 'key and value required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
