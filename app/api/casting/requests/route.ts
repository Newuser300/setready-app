import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { notifyAllAgents, notifyIndependentPerformers } from '@/lib/casting-notify'
import { sendEmail } from '@/lib/email'

export async function GET(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'open'

  const base = supabaseAdmin
    .from('casting_requests')
    .select(`
      id,
      production_name,
      project_type,
      shoot_date,
      call_time,
      location,
      shoot_region_code,
      role_type,
      performers_needed:number_needed,
      filled_count,
      gender_needed,
      age_min,
      age_max,
      union_status,
      rate,
      rate_notes,
      description:scene_description,
      wardrobe_notes,
      status,
      created_at
    `)
    .eq('casting_director_id', session.accountId)
    .order('shoot_date', { ascending: true })

  // open tab shows both active and paused requests
  const { data: requests, error } = await (
    status === 'open'
      ? base.in('status', ['open', 'paused'])
      : base.eq('status', status)
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!requests?.length) return NextResponse.json([])

  // Attach submission counts and agency counts
  const ids = requests.map(r => r.id)
  const { data: subs } = await supabaseAdmin
    .from('casting_submissions')
    .select('casting_request_id, status, agency_id')
    .in('casting_request_id', ids)

  const subMap: Record<string, { total: number; agencies: Set<string>; confirmed: number; shortlisted: number }> = {}
  ;(subs || []).forEach(s => {
    if (!subMap[s.casting_request_id]) {
      subMap[s.casting_request_id] = { total: 0, agencies: new Set(), confirmed: 0, shortlisted: 0 }
    }
    subMap[s.casting_request_id].total++
    subMap[s.casting_request_id].agencies.add(s.agency_id)
    if (s.status === 'confirmed') subMap[s.casting_request_id].confirmed++
    if (s.status === 'shortlisted') subMap[s.casting_request_id].shortlisted++
  })

  const result = requests.map(r => ({
    ...r,
    submissionCount: subMap[r.id]?.total || 0,
    agencyCount: subMap[r.id]?.agencies.size || 0,
    confirmedCount: subMap[r.id]?.confirmed || 0,
    shortlistedCount: subMap[r.id]?.shortlisted || 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    productionName, projectType, shootDate, callTime, location,
    roleType, performersNeeded, genderNeeded, ageMin, ageMax,
    unionStatus, rate, rateNotes, description, wardrobeNotes,
    notifyAll, specificAgencyIds,
  } = body

  if (!productionName || !shootDate || !roleType) {
    return NextResponse.json({ error: 'productionName, shootDate, roleType required' }, { status: 400 })
  }

  // Per-director trust flag: trusted directors auto-publish; everyone else is queued.
  const { data: directorRow } = await supabaseAdmin
    .from('casting_directors')
    .select('auto_approve')
    .eq('id', session.accountId)
    .maybeSingle()

  // Global override: when review mode is ON, every request is reviewed regardless of trust.
  const { data: reviewSetting } = await supabaseAdmin
    .from('admin_settings')
    .select('value')
    .eq('key', 'casting_request_review_mode')
    .maybeSingle()
  const globalReviewMode = reviewSetting?.value === 'true'

  const autoApprove = directorRow?.auto_approve === true && !globalReviewMode

  const { data: request, error } = await supabaseAdmin
    .from('casting_requests')
    .insert({
      casting_director_id: session.accountId,
      production_name: productionName,
      project_type: projectType || null,
      shoot_date: shootDate,
      call_time: callTime || null,
      location: location || null,
      role_type: roleType,
      number_needed: performersNeeded || 1,
      filled_count: 0,
      gender_needed: genderNeeded || 'Any',
      age_min: ageMin || null,
      age_max: ageMax || null,
      union_status: unionStatus || null,
      rate: rate || null,
      rate_notes: rateNotes || null,
      scene_description: description || null,
      wardrobe_notes: wardrobeNotes || null,
      status: 'open',
      moderation_status: autoApprove ? 'approved' : 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch notification settings in one query
  const { data: settingsRows } = await supabaseAdmin
    .from('admin_settings')
    .select('key, value')
    .in('key', ['email_agents_on_request', 'notify_independent_performers', 'email_independent_performers'])

  const settingsMap: Record<string, string> = {}
  ;(settingsRows || []).forEach((row: any) => { settingsMap[row.key] = row.value })

  const emailAgents = settingsMap['email_agents_on_request'] === 'true'
  const notifyIndependent = settingsMap['notify_independent_performers'] === 'true'
  const emailIndependent = settingsMap['email_independent_performers'] === 'true'

  // Only notify when the request is live. A pending request notifies nobody until
  // an admin approves it — the approve action fires these same calls.
  if (autoApprove) {
    // Notify agents
    if (notifyAll !== false) {
      await notifyAllAgents(
        'new_casting_request',
        `New Casting Request: ${productionName}`,
        `${roleType} needed for ${shootDate}${location ? ` in ${location}` : ''}. ${performersNeeded || 1} performer${performersNeeded > 1 ? 's' : ''} needed.`,
        `/agent/dashboard`,
        request.id,
        request,
        emailAgents
      )
    } else if (specificAgencyIds?.length) {
      const notifications = specificAgencyIds.map((agencyId: string) => ({
        recipient_type: 'agent' as const,
        recipient_id: agencyId,
        type: 'new_casting_request',
        title: `New Casting Request: ${productionName}`,
        message: `${roleType} needed for ${shootDate}.`,
        action_url: `/agent/dashboard`,
        related_request_id: request.id,
      }))
      await supabaseAdmin.from('casting_notifications').insert(notifications)
    }

    // Notify independent performers
    if (notifyIndependent) {
      try {
        await notifyIndependentPerformers(request, emailIndependent)
      } catch {
        // Non-fatal: don't block request creation if notification fails
      }
    }
  }

  // Email the admin(s) when a request needs approval, so it isn't missed
  if (!autoApprove) {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `Casting request needs approval: ${productionName}`,
        html: `<p>A casting request was submitted and is waiting for approval.</p><p><strong>Production:</strong> ${productionName}<br/><strong>Role:</strong> ${roleType}<br/><strong>Shoot date:</strong> ${shootDate}${location ? `<br/><strong>Location:</strong> ${location}` : ''}</p><p>Review under Casting → Pending Applications: <a href="https://setready.site/admin">setready.site/admin</a></p>`,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true, request, pendingApproval: !autoApprove })
}
