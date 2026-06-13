import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { notifyAllAgents } from '@/lib/casting-notify'

export async function GET(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'open'

  const { data: requests, error } = await supabaseAdmin
    .from('casting_requests')
    .select(`
      id,
      production_name,
      project_type,
      shoot_date,
      call_time,
      location,
      role_type,
      performers_needed,
      filled_count,
      gender_needed,
      age_min,
      age_max,
      union_status,
      rate,
      rate_notes,
      description,
      wardrobe_notes,
      status,
      created_at
    `)
    .eq('casting_director_id', session.accountId)
    .eq('status', status)
    .order('shoot_date', { ascending: true })

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
      performers_needed: performersNeeded || 1,
      filled_count: 0,
      gender_needed: genderNeeded || 'Any',
      age_min: ageMin || null,
      age_max: ageMax || null,
      union_status: unionStatus || null,
      rate: rate || null,
      rate_notes: rateNotes || null,
      description: description || null,
      wardrobe_notes: wardrobeNotes || null,
      status: 'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify agents
  if (notifyAll !== false) {
    await notifyAllAgents(
      'new_casting_request',
      `New Casting Request: ${productionName}`,
      `${roleType} needed for ${shootDate}${location ? ` in ${location}` : ''}. ${performersNeeded || 1} performer${performersNeeded > 1 ? 's' : ''} needed.`,
      `/agent/dashboard`,
      request.id
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

  return NextResponse.json({ success: true, request })
}
