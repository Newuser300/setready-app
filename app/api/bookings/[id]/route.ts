import { NextResponse } from 'next/server'
import { getAgentSession, getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { createClient } from '@/utils/supabase/server'

// The caller may be a performer (Supabase auth) or an agent/casting director (casting session).
async function resolveCaller() {
  try {
    const supa = await createClient()
    const {
      data: { user },
    } = await supa.auth.getUser()
    if (user) return { kind: 'performer' as const, id: user.id }
  } catch {
    /* no Supabase session — fall through to casting session */
  }
  const agent = await getAgentSession()
  if (agent) return { kind: 'agent' as const, accountId: agent.accountId, name: agent.name }
  const casting = await getCastingSession()
  if (casting) return { kind: 'casting' as const, accountId: casting.accountId, name: casting.name }
  return null
}

const nowISO = () => new Date().toISOString()

// PATCH /api/bookings/[id]   Body: { action: 'confirm' | 'decline' | 'cancel' }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const caller = await resolveCaller()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const action = body?.action
  if (!['confirm', 'decline', 'cancel'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be confirm, decline, or cancel' },
      { status: 400 }
    )
  }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const isPerformer = caller.kind === 'performer' && caller.id === booking.performer_id
  const isCreator =
    (caller.kind === 'agent' || caller.kind === 'casting') &&
    caller.accountId === booking.created_by_id

  // Does this agent's agency actively represent the performer?
  async function agentRepresents(): Promise<boolean> {
    if (!caller || caller.kind !== 'agent') return false
    const { data: agent } = await supabaseAdmin
      .from('agent_accounts')
      .select('agency_id')
      .eq('id', caller.accountId)
      .single()
    if (!agent) return false
    const { data: rep } = await supabaseAdmin
      .from('agency_roster')
      .select('id')
      .eq('agency_id', agent.agency_id)
      .eq('user_id', booking.performer_id)
      .eq('status', 'active')
      .maybeSingle()
    return !!rep
  }

  const range =
    booking.end_date !== booking.start_date
      ? `${booking.start_date} – ${booking.end_date}`
      : booking.start_date

  // ---- CONFIRM ----
  if (action === 'confirm') {
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: `Only pending bookings can be confirmed (this one is ${booking.status}).` },
        { status: 409 }
      )
    }
    // The performer can accept any hold; a representing agent can confirm their own roster.
    const allowed = isPerformer || (await agentRepresents())
    if (!allowed) {
      return NextResponse.json(
        { error: 'Only the performer or their representing agent can confirm this booking.' },
        { status: 403 }
      )
    }
    // No double-booking: reject if another confirmed booking overlaps these dates.
    const { data: clash } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('performer_id', booking.performer_id)
      .eq('status', 'confirmed')
      .neq('id', booking.id)
      .lte('start_date', booking.end_date)
      .gte('end_date', booking.start_date)
      .limit(1)
    if (clash && clash.length > 0) {
      return NextResponse.json(
        { error: 'Those dates already have a confirmed booking.' },
        { status: 409 }
      )
    }

    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'confirmed', confirmed_at: nowISO(), updated_at: nowISO() })
      .eq('id', booking.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If an agent confirmed, notify the performer. (Performer-initiated confirms notify the
    // agent/casting back — wired in Phase 5 once casting_notifications recipient conventions
    // for agents/casting are confirmed.)
    if (!isPerformer) {
      await supabaseAdmin.from('casting_notifications').insert({
        recipient_type: 'performer',
        recipient_id: booking.performer_id,
        type: 'booking_confirmed',
        title: 'Booking confirmed',
        message: `A booking on ${range} was confirmed on your calendar.`,
        action_url: '/availability',
      })
    }
    return NextResponse.json({ success: true })
  }

  // ---- DECLINE ----
  if (action === 'decline') {
    if (!isPerformer) {
      return NextResponse.json(
        { error: 'Only the performer can decline a hold.' },
        { status: 403 }
      )
    }
    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending holds can be declined.' }, { status: 409 })
    }
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'declined', updated_at: nowISO() })
      .eq('id', booking.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Phase 5: notify the agent/casting who created it.
    return NextResponse.json({ success: true })
  }

  // ---- CANCEL ----
  if (action === 'cancel') {
    if (!isPerformer && !isCreator) {
      return NextResponse.json(
        { error: 'Only the performer or whoever created this booking can cancel it.' },
        { status: 403 }
      )
    }
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'This booking is already cancelled.' }, { status: 409 })
    }
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled', updated_at: nowISO() })
      .eq('id', booking.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If an agent/casting cancelled, notify the performer. (Performer-initiated cancels notify
    // the agent/casting back in Phase 5.)
    if (!isPerformer) {
      await supabaseAdmin.from('casting_notifications').insert({
        recipient_type: 'performer',
        recipient_id: booking.performer_id,
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        message: `A booking on ${range} was cancelled.`,
        action_url: '/availability',
      })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unhandled action' }, { status: 400 })
}
