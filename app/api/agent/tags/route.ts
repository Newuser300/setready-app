import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { performerId, tag } = await req.json()
  if (!performerId || !tag) return NextResponse.json({ error: 'performerId and tag required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('performer_roster_tags')
    .upsert({ agency_id: agent.agency_id, performer_id: performerId, tag }, { onConflict: 'agency_id,performer_id,tag' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { performerId, tag } = await req.json()

  const { error } = await supabaseAdmin
    .from('performer_roster_tags')
    .delete()
    .eq('agency_id', agent.agency_id)
    .eq('performer_id', performerId)
    .eq('tag', tag)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('performer_roster_tags')
    .select('performer_id, tag')
    .eq('agency_id', agent.agency_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group tags by performer
  const grouped: Record<string, string[]> = {}
  ;(data || []).forEach((row: any) => {
    if (!grouped[row.performer_id]) grouped[row.performer_id] = []
    grouped[row.performer_id].push(row.tag)
  })

  return NextResponse.json(grouped)
}
