import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: account } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .maybeSingle()

  if (!account?.agency_id) {
    return NextResponse.json({ isPro: false, proExpiresAt: null, rosterLimit: 25 })
  }

  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('is_pro, pro_expires_at')
    .eq('id', account.agency_id)
    .maybeSingle()

  const isPro = !!(agency?.is_pro && (!agency.pro_expires_at || new Date(agency.pro_expires_at) > new Date()))

  return NextResponse.json({
    isPro,
    proExpiresAt: agency?.pro_expires_at || null,
    rosterLimit: isPro ? null : 25,
    agencyId: account.agency_id,
  })
}
