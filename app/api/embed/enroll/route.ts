import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Records a widget user/subscriber. Upserts by (partner, email) so re-entry
// keeps one row. This is what makes widget users visible to the BGReady admin.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const key = String(body.partner || '');
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();

  if (!name || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: 'name and valid email required' }, { status: 400 });
  }

  const { data: partner } = await supabaseAdmin
    .from('partner_accounts')
    .select('id')
    .eq('partner_key', key)
    .eq('active', true)
    .maybeSingle();

  if (!partner) {
    return NextResponse.json({ error: 'Invalid or inactive partner key' }, { status: 403 });
  }

  const { data: enr, error } = await supabaseAdmin
    .from('widget_enrollments')
    .upsert(
      {
        partner_id: partner.id,
        name,
        email,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'partner_id,email' }
    )
    .select('id')
    .single();

  if (error || !enr) {
    return NextResponse.json({ error: 'could not record enrollment' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enrollmentId: enr.id });
}
