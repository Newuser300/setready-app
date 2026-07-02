import { NextResponse } from 'next/server'
import { getAgentSession, getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { createClient } from '@/utils/supabase/server'

// Identify whether the caller is a logged-in agent or casting director.
async function getCastingCaller() {
  const agent = await getAgentSession()
  if (agent) return { kind: 'agent' as const, accountId: agent.accountId, name: agent.name }
  const casting = await getCastingSession()
  if (casting) return { kind: 'casting' as const, accountId: casting.accountId, name: casting.name }
  return null
}

// GET /api/bookings
// Performer -> their own pending/confirmed bookings (uses Supabase auth session).
// Agent     -> bookings for performers their agency actively represents.
// Casting   -> bookings they created.
// Optional ?performerId=... narrows agent/casting results to a single performer.
export async function GET(req: Request) {
  // Performer path: authenticated via Supabase (anon key / cookies)
  try {
    const supa = await createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (user) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('performer_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .order('start_date')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data || [])
    }
  } catch { /* no Supabase session — fall through */ }

  // Agent / casting director path
  const caller = await getCastingCaller()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const performerId = searchParams.get('performerId')

  if (caller.kind === 'agent') {
    const { data: agent } = await supabaseAdmin
      .from('agent_accounts')
      .select('agency_id')
      .eq('id', caller.accountId)
      .single()
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const { data: roster } = await supabaseAdmin
      .from('agency_roster')
      .select('user_id')
      .eq('agency_id', agent.agency_id)
      .eq('status', 'active')
    const rosterIds = (roster || []).map((r) => r.user_id)
    if (rosterIds.length === 0) return NextResponse.json([])

    let q = supabaseAdmin
      .from('bookings')
      .select('*')
      .in('performer_id', rosterIds)
      .order('start_date')
    if (performerId) q = q.eq('performer_id', performerId)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // casting director: bookings they created
  let q = supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('created_by_id', caller.accountId)
    .order('start_date')
  if (performerId) q = q.eq('performer_id', performerId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/bookings  -> create a PENDING hold.
// Body: { performerId, startDate, endDate, production?, note? }  (dates YYYY-MM-DD)
export async function POST(req: Request) {
  const caller = await getCastingCaller()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { performerId, startDate, endDate, production, note } = body || {}

  if (!performerId || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'performerId, startDate and endDate are required' },
      { status: 400 }
    )
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRe.test(startDate) || !dateRe.test(endDate)) {
    return NextResponse.json({ error: 'Dates must be in YYYY-MM-DD format' }, { status: 400 })
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'endDate cannot be before startDate' }, { status: 400 })
  }

  // Agents may only book performers their agency actively represents.
  if (caller.kind === 'agent') {
    const { data: agent } = await supabaseAdmin
      .from('agent_accounts')
      .select('agency_id')
      .eq('id', caller.accountId)
      .single()
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const { data: rep } = await supabaseAdmin
      .from('agency_roster')
      .select('id')
      .eq('agency_id', agent.agency_id)
      .eq('user_id', performerId)
      .eq('status', 'active')
      .maybeSingle()
    if (!rep) {
      return NextResponse.json(
        { error: 'You can only book performers your agency represents.' },
        { status: 403 }
      )
    }
  }

  // Reject if those dates already overlap a CONFIRMED booking.
  const { data: clash } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('performer_id', performerId)
    .eq('status', 'confirmed')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .limit(1)
  if (clash && clash.length > 0) {
    return NextResponse.json(
      { error: 'Those dates already have a confirmed booking.' },
      { status: 409 }
    )
  }

  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      performer_id: performerId,
      created_by_id: caller.accountId,
      created_by_type: caller.kind, // 'agent' | 'casting'
      created_by_name: caller.name || null,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
      production: production || null,
      note: note || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the performer that a hold was placed on their calendar.
  const range = endDate !== startDate ? `${startDate} – ${endDate}` : startDate
  await supabaseAdmin.from('casting_notifications').insert({
    recipient_type: 'performer',
    recipient_id: performerId,
    type: 'booking_hold',
    title: 'New tentative booking',
    message: `${caller.name || 'Someone'} placed a tentative hold on ${range}${
      production ? ` for ${production}` : ''
    }. Review it on your availability calendar.`,
    action_url: '/availability',
  })

  return NextResponse.json({ success: true, booking })
}
