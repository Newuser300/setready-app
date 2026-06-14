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

  if (!account?.agency_id) return NextResponse.json([])

  const { data: members } = await supabaseAdmin
    .from('agent_accounts')
    .select('id, name, email, role, last_login')
    .eq('agency_id', account.agency_id)
    .order('role')

  return NextResponse.json(members || [])
}
