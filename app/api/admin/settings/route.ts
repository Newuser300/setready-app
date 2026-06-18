import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await supabaseAdmin.from('admin_settings').select('key, value');
  const settings: Record<string, string> = {};
  (data || []).forEach((r: any) => { settings[r.key] = r.value; });
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { key, value } = await req.json();
  if (!key || value === undefined) return NextResponse.json({ error: 'key and value required' }, { status: 400 });
  const { error } = await supabaseAdmin
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
