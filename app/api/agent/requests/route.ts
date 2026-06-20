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

  // Fetch casting requests
  const { data: requests, error } = await supabaseAdmin
    .from('casting_requests')
    .select(`
      id,
      production_name,
      shoot_date,
      location,
      role_type,
      gender_needed,
      age_min,
      age_max,
      union_status,
      performers_needed,
      rate,
      rate_notes,
      description,
      status,
      created_at,
      casting_directors (
        name,
        company
      )
    `)
    .eq('status', statusFilter)
    .eq('moderation_status', 'approved')
    .order('shoot_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!requests?.length) return NextResponse.json([])

  // For each request, get submission count for THIS agency
  const requestIds = requests.map(r => r.id)

  const { data: submissionCounts } = await supabaseAdmin
    .from('casting_submissions')
    .select('casting_request_id')
    .eq('agency_id', agent.agency_id)
    .in('casting_request_id', requestIds)

  const countMap: Record<string, number> = {}
  ;(submissionCounts || []).forEach(s => {
    countMap[s.casting_request_id] = (countMap[s.casting_request_id] || 0) + 1
  })

  const result = requests.map(r => ({
    ...r,
    mySubmissionCount: countMap[r.id] || 0,
  }))

  return NextResponse.json(result)
}
