import { NextResponse } from 'next/server';
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin';

// Admin-only: lists partner accounts and every widget enrollment/subscriber.
export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [partnersResult, enrResult] = await Promise.all([
    supabaseAdmin
      .from('partner_accounts')
      .select('id, partner_key, name, mode, price_cents, active, created_at')
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('widget_enrollments')
      .select('id, partner_id, name, email, status, paid, amount_cents, modules_done, cert_id, cert_issued_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5000),
  ]);

  return NextResponse.json({
    partners: partnersResult.data || [],
    enrollments: enrResult.data || [],
  });
}
