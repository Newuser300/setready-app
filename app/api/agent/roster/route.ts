import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)

  // Roster rows (no embedded joins — agency_roster has no FK relationships defined)
  const { data: roster, error } = await supabaseAdmin
    .from('agency_roster')
    .select('id, status, joined_at, performer_user_id')
    .eq('agency_id', agent.agency_id)
    .order('joined_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = (roster || []).map(r => r.performer_user_id).filter(Boolean)

  // Fetch users + profiles separately, then stitch
  let usersMap: Record<string, any> = {}
  let profilesMap: Record<string, any> = {}
  let availabilityMap: Record<string, Record<string, string>> = {}

  if (userIds.length > 0) {
    const [{ data: users }, { data: profiles }, { data: avail }] = await Promise.all([
      supabaseAdmin.from('users').select('id, email, name').in('id', userIds),
      supabaseAdmin.from('performer_profiles')
        .select('user_id, headshot_url, union_status, union_priority, height_cm, hair_color, eye_color, gender, film_region_code, is_public')
        .in('user_id', userIds),
      supabaseAdmin.from('performer_availability')
        .select('user_id, date, status')
        .in('user_id', userIds)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr),
    ])

    ;(users || []).forEach((u: any) => {
      usersMap[u.id] = {
        id: u.id,
        email: u.email,
        raw_user_meta_data: { full_name: u.name || '' },
      }
    })
    ;(profiles || []).forEach((p: any) => { profilesMap[p.user_id] = p })
    ;(avail || []).forEach((a: any) => {
      if (!availabilityMap[a.user_id]) availabilityMap[a.user_id] = {}
      availabilityMap[a.user_id][a.date] = a.status
    })
  }

  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    weekDays.push(d.toISOString().slice(0, 10))
  }

  const result = (roster || []).map(r => ({
    id: r.id,
    status: r.status,
    joined_at: r.joined_at,
    user_id: r.performer_user_id,
    users: usersMap[r.performer_user_id] || null,
    performer_profiles: profilesMap[r.performer_user_id] || null,
    weekAvailability: weekDays.map(date => ({
      date,
      status: availabilityMap[r.performer_user_id]?.[date] || null,
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

  const { data: existing } = await supabaseAdmin
    .from('agency_roster')
    .select('id, status')
    .eq('agency_id', agent.agency_id)
    .eq('performer_user_id', found.id)
    .maybeSingle()

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
      performer_user_id: found.id,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Link the performer's profile to this agency so the profile + casting views
  // (which read performer_profiles.agency_id) reflect the representation.
  const { error: agencyLinkError } = await supabaseAdmin
    .from('performer_profiles')
    .update({ agency_id: agent.agency_id })
    .eq('user_id', found.id)
  if (agencyLinkError) console.error('Failed to set profile agency_id:', agencyLinkError)

  await supabaseAdmin.from('casting_notifications').insert({
    recipient_type: 'performer',
    recipient_id: found.id,
    type: 'roster_added',
    title: 'Added to an Agency Roster',
    message: `An agency has added you to their roster.`,
    action_url: '/profile',
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

  // Look up who this roster row belongs to before deleting, so we can clear their profile link.
  const { data: rosterRow } = await supabaseAdmin
    .from('agency_roster')
    .select('performer_user_id')
    .eq('id', rosterId)
    .eq('agency_id', agent.agency_id)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('agency_roster')
    .delete()
    .eq('id', rosterId)
    .eq('agency_id', agent.agency_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clear the profile's agency link, but only if it still points at THIS agency
  // (don't wipe a link the performer may have re-established with another agency).
  if (rosterRow?.performer_user_id) {
    await supabaseAdmin
      .from('performer_profiles')
      .update({ agency_id: null })
      .eq('user_id', rosterRow.performer_user_id)
      .eq('agency_id', agent.agency_id)
  }

  return NextResponse.json({ success: true })
}
