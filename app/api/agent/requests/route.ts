import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

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
  const statusFilter = searchParams.get('status') || 'open'

  // Fetch casting requests (no embedded casting_directors join — no FK relationship)
  const { data: requests, error } = await supabaseAdmin
    .from('casting_requests')
    .select(`
      id,
      production_name,
      project_type,
      shoot_date,
      location,
      role_type,
      gender_needed,
      age_min,
      age_max,
      union_status,
      performers_needed:number_needed,
      rate,
      rate_notes,
      call_time,
      wardrobe_notes,
      description:scene_description,
      shoot_region_code,
      status,
      created_at,
      casting_director_id
    `)
    .eq('status', statusFilter)
    .eq('moderation_status', 'approved')
    .order('shoot_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!requests?.length) return NextResponse.json([])

  // Fetch casting director names separately and stitch
  const directorIds = [...new Set(requests.map(r => r.casting_director_id).filter(Boolean))]
  const directorsById: Record<string, { name: string; company: string }> = {}
  if (directorIds.length > 0) {
    const { data: directors } = await supabaseAdmin
      .from('casting_directors')
      .select('id, name, company')
      .in('id', directorIds)
    ;(directors || []).forEach(d => { directorsById[d.id] = { name: d.name, company: d.company } })
  }

  // For each request, get submission count for THIS agency
  const requestIds = requests.map(r => r.id)

  const { data: submissions } = await supabaseAdmin
    .from('casting_submissions')
    .select('casting_request_id, performer_user_id')
    .eq('agency_id', agent.agency_id)
    .in('casting_request_id', requestIds)

  const countMap: Record<string, number> = {}
  const idsMap: Record<string, string[]> = {}
  ;(submissions || []).forEach(s => {
    countMap[s.casting_request_id] = (countMap[s.casting_request_id] || 0) + 1
    ;(idsMap[s.casting_request_id] ??= []).push(s.performer_user_id)
  })

  const result = requests.map(r => ({
    ...r,
    casting_directors: r.casting_director_id ? (directorsById[r.casting_director_id] || null) : null,
    mySubmissionCount: countMap[r.id] || 0,
    submittedPerformerIds: idsMap[r.id] || [],
  }))

  return NextResponse.json(result)
}
