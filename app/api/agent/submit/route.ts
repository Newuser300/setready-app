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

  const { reqId, performerId, notes } = await req.json()
  if (!reqId || !performerId) return NextResponse.json({ error: 'reqId and performerId required' }, { status: 400 })

  // Verify performer is on this agency's roster
  const { data: rosterEntry } = await supabaseAdmin
    .from('agency_performers')
    .select('id')
    .eq('agency_id', agent.agency_id)
    .eq('user_id', performerId)
    .eq('status', 'active')
    .single()

  if (!rosterEntry) return NextResponse.json({ error: 'Performer not on your roster' }, { status: 403 })

  // Upsert submission
  const { data, error } = await supabaseAdmin
    .from('casting_submissions')
    .upsert({
      casting_request_id: reqId,
      performer_id: performerId,
      agency_id: agent.agency_id,
      status: 'submitted',
      notes: notes || null,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'casting_request_id,performer_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify casting director
  const { data: castingReq } = await supabaseAdmin
    .from('casting_requests')
    .select('casting_director_id, production_name')
    .eq('id', reqId)
    .single()

  if (castingReq) {
    const { data: performer } = await supabaseAdmin
      .from('users')
      .select('raw_user_meta_data, email')
      .eq('id', performerId)
      .single()

    const performerName = performer?.raw_user_meta_data?.full_name || performer?.email || 'A performer'

    await supabaseAdmin
      .from('casting_notifications')
      .insert({
        recipient_type: 'casting_director',
        recipient_id: castingReq.casting_director_id,
        type: 'submission',
        title: 'New Submission',
        message: `${performerName} was submitted for ${castingReq.production_name}`,
        is_read: false,
      })
  }

  return NextResponse.json(data)
}
