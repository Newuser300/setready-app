import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Marks a widget enrollment complete and issues a verifiable certificate ID.
// Records the completion so it shows in the SetReady admin console.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const key = String(body.partner || '');
  const email = String(body.email || '').trim().toLowerCase();
  const modulesDone = Array.isArray(body.modules) ? body.modules.length : 0;

  const { data: partner } = await supabaseAdmin
    .from('partner_accounts')
    .select('id')
    .eq('partner_key', key)
    .eq('active', true)
    .maybeSingle();

  if (!partner) {
    return NextResponse.json({ error: 'Invalid or inactive partner key' }, { status: 403 });
  }

  const certId =
    'SR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const issuedAt = new Date().toISOString();

  await supabaseAdmin
    .from('widget_enrollments')
    .update({
      status: 'completed',
      modules_done: modulesDone,
      cert_id: certId,
      cert_issued_at: issuedAt,
      updated_at: issuedAt,
    })
    .eq('partner_id', partner.id)
    .eq('email', email);

  return NextResponse.json({ ok: true, certId, issuedAt });
}
