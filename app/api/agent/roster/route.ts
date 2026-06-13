import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get agencyId for this agent
  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  // Build this week's date range
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  // Fetch roster with profiles
  const { data: roster, error } = await supabaseAdmin
    .from('agency_roster')
    .select(`
      id,
      status,
      added_at,
      user_id,
      users:user_id (
        id,
        email,
        raw_user_meta_data
      ),
      performer_profiles:user_id (
        headshot_url,
        union_status,
        height_cm,
        hair_color,
        eye_color,
        gender,
        is_public
      )
    `)
    .eq('agency_id', agent.agency_id)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Collect user IDs for availability query
  const userIds = (roster || []).map(r => r.user_id)

  let availabilityMap: Record<string, Record<string, string>> = {}
  if (userIds.length > 0) {
    const { data: avail } = await supabaseAdmin
      .from('performer_availability')
      .select('user_id, date, status')
      .in('user_id', userIds)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)

    ;(avail || []).forEach(a => {
      if (!availabilityMap[a.user_id]) availabilityMap[a.user_id] = {}
      availabilityMap[a.user_id][a.date] = a.status
    })
  }

  // Build week days array
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    weekDays.push(d.toISOString().slice(0, 10))
  }

  const result = (roster || []).map(r => ({
    ...r,
    weekAvailability: weekDays.map(date => ({
      date,
      status: availabilityMap[r.user_id]?.[date] || null,
    })),
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  // Look up user by email via public users view
  const { data: found, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (lookupError || !found) {
    return NextResponse.json(
      { error: 'No SetReady account found with that email address.' },
      { status: 404 }
    )
  }

  // Check if already on roster
  const { data: existing } = await supabaseAdmin
    .from('agency_roster')
    .select('id, status')
    .eq('agency_id', agent.agency_id)
    .eq('user_id', found.id)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: `Performer already on roster (status: ${existing.status})` },
      { status: 409 }
    )
  }

  const { data: entry, error } = await supabaseAdmin
    .from('agency_roster')
    .insert({
      agency_id: agent.agency_id,
      user_id: found.id,
      status: 'pending',
      added_by: session.accountId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the performer
  await supabaseAdmin.from('casting_notifications').insert({
    recipient_type: 'performer',
    recipient_id: found.id,
    type: 'roster_invite',
    title: 'Agency Roster Invite',
    message: `An agency has added you to their roster. Log in to confirm or decline.`,
    action_url: '/dashboard',
  })

  return NextResponse.json({ success: true, entry })
}

export async function DELETE(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rosterId } = await req.json()
  if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('agency_roster')
    .delete()
    .eq('id', rosterId)
    .eq('agency_id', agent.agency_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
