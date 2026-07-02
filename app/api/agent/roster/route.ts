import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'
import { sendEmail } from '@/lib/email'

export async function GET(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  // ── Email lookup mode — preview only, does NOT add to roster ─────────────
  const lookupEmail = new URL(req.url).searchParams.get('email')?.trim().toLowerCase()
  if (lookupEmail) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('email', lookupEmail)
      .maybeSingle()

    if (!user) return NextResponse.json({ error: 'No performer found with that email' }, { status: 404 })

    const [{ data: profile }, { data: onRoster }] = await Promise.all([
      supabaseAdmin.from('performer_profiles')
        .select('headshot_url, union_status, film_region_code, city, agency_id')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabaseAdmin.from('agency_roster')
        .select('id, status')
        .eq('agency_id', agent.agency_id)
        .eq('performer_user_id', user.id)
        .maybeSingle(),
    ])

    return NextResponse.json({
      user_id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      headshot_url: profile?.headshot_url || null,
      union_status: profile?.union_status || null,
      film_region_code: profile?.film_region_code || null,
      city: profile?.city || null,
      already_represented: !!(profile?.agency_id),
      already_on_roster: !!onRoster,
      roster_status: onRoster?.status || null,
    })
  }
  // ─────────────────────────────────────────────────────────────────────────

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

    // Notify the performer — wrapped so a failure here cannot fail the removal.
    try {
      const [{ data: agency }, { data: user }] = await Promise.all([
        supabaseAdmin.from('agencies').select('name').eq('id', agent.agency_id).single(),
        supabaseAdmin.from('users').select('email, name').eq('id', rosterRow.performer_user_id).single(),
      ])

      const agencyName = agency?.name || 'an agency'

      await supabaseAdmin.from('casting_notifications').insert({
        recipient_type: 'performer',
        recipient_id: rosterRow.performer_user_id,
        type: 'roster_removed',
        title: 'Removed from agency roster',
        message: `You've been removed from ${agencyName}'s roster.`,
        action_url: '/profile',
      })

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `You've been removed from ${agencyName}'s roster`,
          html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" style="background:white;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#1a1a2e;padding:24px 32px;"><span style="color:white;font-size:20px;font-weight:700;">🎬 SetReady</span></td></tr>
        <tr><td style="background:#F59E0B;height:4px;"></td></tr>
        <tr><td style="padding:32px;">
          <h1 style="color:#1a1a2e;font-family:Georgia,serif;margin:0 0 16px;">Roster Update</h1>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ${user.name || 'there'},</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">You've been removed from <strong>${agencyName}'s</strong> roster on SetReady.</p>
          <p style="color:#6b7280;font-size:13px;">If you believe this was a mistake, please contact your agent directly.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })
      }
    } catch {
      // notify/email failure must not fail the removal
    }
  }

  return NextResponse.json({ success: true })
}
