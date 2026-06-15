import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'
import { randomBytes } from 'crypto'

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, message, recipientType, performerIds, tagFilter } = await req.json()
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const checkId = randomBytes(16).toString('hex')

  // Resolve recipients
  let targetIds: string[] = []

  if (recipientType === 'selected' && performerIds?.length) {
    targetIds = performerIds
  } else {
    // All roster or by tag
    let rosterQuery = supabaseAdmin
      .from('agency_roster')
      .select('user_id')
      .eq('agency_id', agent.agency_id)
      .eq('status', 'active')

    const { data: roster } = await rosterQuery
    targetIds = (roster || []).map((r: any) => r.user_id)

    if (tagFilter) {
      const { data: tagged } = await supabaseAdmin
        .from('performer_roster_tags')
        .select('performer_id')
        .eq('agency_id', agent.agency_id)
        .eq('tag', tagFilter)

      const taggedSet = new Set((tagged || []).map((t: any) => t.performer_id))
      targetIds = targetIds.filter(id => taggedSet.has(id))
    }
  }

  // Insert response placeholders + send in-app notifications
  const notifications = targetIds.map(userId => ({
    recipient_type: 'performer',
    recipient_id: userId,
    type: 'availability_check',
    title: `Availability Check — ${date}`,
    message: message || `Your agency is checking your availability for ${date}. Please respond.`,
    action_url: `/availability?checkId=${checkId}&date=${date}`,
    related_request_id: null,
  }))

  if (notifications.length > 0) {
    await supabaseAdmin.from('casting_notifications').insert(notifications)
  }

  // Create response records
  const responseRows = targetIds.map(userId => ({
    check_id: checkId,
    agency_id: agent.agency_id,
    performer_id: userId,
    response: null,
  }))

  if (responseRows.length > 0) {
    await supabaseAdmin.from('availability_check_responses').insert(responseRows)
  }

  return NextResponse.json({ success: true, checkId, notified: targetIds.length })
}

export async function GET(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const checkId = searchParams.get('checkId')
  if (!checkId) return NextResponse.json({ error: 'checkId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('availability_check_responses')
    .select(`
      id,
      performer_id,
      response,
      responded_at,
      users:performer_id (email, raw_user_meta_data),
      performer_profiles:performer_id (headshot_url, union_status, union_priority)
    `)
    .eq('check_id', checkId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
