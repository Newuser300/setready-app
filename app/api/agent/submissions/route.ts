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
    .select('id, status, submitted_at, agent_notes, performer_user_id, agency_id, casting_request_id')
    .eq('agency_id', agent.agency_id)
    .order('submitted_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('submitted_at', from)
  if (to) query = query.lte('submitted_at', to)

  const { data: subs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = subs || []
  const userIds = [...new Set(rows.map(r => r.performer_user_id).filter(Boolean))]
  const requestIds = [...new Set(rows.map(r => r.casting_request_id).filter(Boolean))]

  const [usersRes, profilesRes, requestsRes] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from('users').select('id, email, name').in('id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length
      ? supabaseAdmin.from('performer_profiles').select('user_id, headshot_url, union_status, union_priority').in('user_id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    requestIds.length
      ? supabaseAdmin.from('casting_requests').select('id, production_name, shoot_date, location, role_type').in('id', requestIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const usersById = Object.fromEntries((usersRes.data || []).map(u => [u.id, u]))
  const profilesById = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p]))
  const requestsById = Object.fromEntries((requestsRes.data || []).map(r => [r.id, r]))

  const data = rows.map(r => {
    const u = r.performer_user_id ? usersById[r.performer_user_id] : null
    const p = r.performer_user_id ? profilesById[r.performer_user_id] : null
    const req = r.casting_request_id ? requestsById[r.casting_request_id] : null
    return {
      id: r.id,
      status: r.status,
      submitted_at: r.submitted_at,
      notes: r.agent_notes,
      performer_id: r.performer_user_id,
      agency_id: r.agency_id,
      casting_requests: req || null,
      performer_profiles: p ? { headshot_url: p.headshot_url, union_status: p.union_status, union_priority: p.union_priority } : null,
      users: u ? { id: u.id, email: u.email, raw_user_meta_data: { full_name: u.name } } : null,
    }
  })

  return NextResponse.json(data)
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
    .select('performer_user_id')
    .eq('casting_request_id', castingRequestId)
    .eq('agency_id', agent.agency_id)
    .in('performer_user_id', performerIds)

  const alreadySubmitted = new Set((existing || []).map(e => e.performer_user_id))
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
    performer_user_id: performerId,
    submitted_by_agent_id: session.accountId,
    status: 'submitted',
    agent_notes: notes || null,
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
