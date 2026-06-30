import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('donations')
    .select('id, stripe_session_id, amount_cents, currency, donor_email, donor_user_id, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const donations = data || []
  const totalCents = donations.reduce((sum, d) => sum + (d.amount_cents || 0), 0)

  return NextResponse.json({ donations, totalCents })
}
