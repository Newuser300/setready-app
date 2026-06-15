import { NextRequest, NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(request: NextRequest) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ results: [] })

  const { data: roster } = await supabaseAdmin
    .from('agency_roster')
    .select('user_id, users:user_id (id, email, raw_user_meta_data)')
    .eq('agency_id', agent.agency_id)
    .eq('status', 'active')
    .limit(50)

  const qLower = q.toLowerCase()

  const results = (roster || [])
    .map((r: any) => {
      const user = r.users
      const name: string = user?.raw_user_meta_data?.full_name || user?.email?.split('@')[0] || ''
      const email: string = user?.email || ''
      return { id: user?.id, name, email, type: 'performer' }
    })
    .filter(p => p.name.toLowerCase().includes(qLower) || p.email.toLowerCase().includes(qLower))
    .slice(0, 10)

  return NextResponse.json({ results })
}
