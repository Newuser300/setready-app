import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Public: returns the partner's widget config + the live module list.
// Called by the hosted widget (same origin), keyed by the partner key.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('partner') || '';

  const { data: partner } = await supabaseAdmin
    .from('partner_accounts')
    .select('id, name, mode, price_cents, promo_code')
    .eq('partner_key', key)
    .eq('active', true)
    .maybeSingle();

  if (!partner) {
    return NextResponse.json({ error: 'Invalid or inactive partner key' }, { status: 403 });
  }

  const { data: modules } = await supabaseAdmin
    .from('modules')
    .select('id, module_number, title')
    .order('module_number');

  return NextResponse.json({
    partnerName: partner.name,
    mode: partner.mode,
    price: (partner.price_cents ?? 999) / 100,
    promoActive: !!partner.promo_code,
    modules: (modules || []).map((m: { id: string; module_number: number; title: string }) => ({
      id: m.id,
      n: m.module_number,
      title: m.title,
      mins: 10,
    })),
  });
}
