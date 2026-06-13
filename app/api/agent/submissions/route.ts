import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'
import { notify } from '@/lib/casting-notify'

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
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabaseAdmin
    .from('casting_submissions')
    .select(`
      id,
      status,
      submitted_at,
      notes,
      casting_requests (
        id,
        production_name,
        shoot_date,
        location,
        role_type
      ),
      performer_profiles:performer_id (
        headshot_url,
        union_status
      ),
      users:performer_id (
        id,
        email,
        raw_user_meta_data
      )
    `)
    .eq('agency_id', agent.agency_id)
    .order('submitted_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('submitted_at', from)
  if (to) query = query.lte('submitted_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { castingRequestId, performerIds, notes } = await req.json()

  if (!castingRequestId || !performerIds?.length) {
    return NextResponse.json(
      { error: 'castingRequestId and performerIds required' },
      { status: 400 }
    )
  }

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  // Fetch the casting request to get casting director info
  const { data: request } = await supabaseAdmin
    .from('casting_requests')
    .select('id, production_name, shoot_date, casting_director_id')
    .eq('id', castingRequestId)
    .single()

  if (!request) return NextResponse.json({ error: 'Casting request not found' }, { status: 404 })

  // Skip already-submitted performers for this request
  const { data: existing } = await supabaseAdmin
    .from('casting_submissions')
    .select('performer_id')
    .eq('casting_request_id', castingRequestId)
    .eq('agency_id', agent.agency_id)
    .in('performer_id', performerIds)

  const alreadySubmitted = new Set((existing || []).map(e => e.performer_id))
  const toSubmit = performerIds.filter((id: string) => !alreadySubmitted.has(id))

  if (!toSubmit.length) {
    return NextResponse.json(
      { error: 'All selected performers already submitted for this request' },
      { status: 409 }
    )
  }

  const rows = toSubmit.map((performerId: string) => ({
    casting_request_id: castingRequestId,
    agency_id: agent.agency_id,
    performer_id: performerId,
    submitted_by: session.accountId,
    status: 'submitted',
    notes: notes || null,
    submitted_at: new Date().toISOString(),
  }))

  const { data: created, error } = await supabaseAdmin
    .from('casting_submissions')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify casting director
  if (request.casting_director_id) {
    await notify({
      recipientType: 'casting_director',
      recipientId: request.casting_director_id,
      type: 'new_submissions',
      title: 'New Performer Submissions',
      message: `${toSubmit.length} performer${toSubmit.length > 1 ? 's' : ''} submitted for "${request.production_name}" (${request.shoot_date}).`,
      actionUrl: `/casting/requests/${castingRequestId}`,
      relatedRequestId: castingRequestId,
    })
  }

  return NextResponse.json({ success: true, submitted: toSubmit.length, skipped: alreadySubmitted.size })
}
