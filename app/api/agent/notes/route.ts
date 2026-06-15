import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const performerId = searchParams.get('performerId')
  if (!performerId) return NextResponse.json({ error: 'performerId required' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('agent_performer_notes')
    .select('note, updated_at')
    .eq('agency_id', agent.agency_id)
    .eq('performer_id', performerId)
    .single()

  return NextResponse.json({ note: data?.note || '', updated_at: data?.updated_at || null })
}

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { performerId, note } = await req.json()
  if (!performerId) return NextResponse.json({ error: 'performerId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('agent_performer_notes')
    .upsert({
      agency_id: agent.agency_id,
      performer_id: performerId,
      note: note || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'agency_id,performer_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
