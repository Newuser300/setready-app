import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { getRegionName } from '@/lib/film-regions'

export async function GET() {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // All request IDs for this casting director
  const { data: requests, error: reqError } = await supabaseAdmin
    .from('casting_requests')
    .select('id')
    .eq('casting_director_id', session.accountId)

  if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 })

  const reqIds = (requests || []).map((r: any) => r.id)
  const totalRequests = reqIds.length

  // Submission counts
  let totalSubmissions = 0
  let confirmedSubmissions = 0

  if (reqIds.length > 0) {
    const [{ count: total }, { count: confirmed }] = await Promise.all([
      supabaseAdmin
        .from('casting_submissions')
        .select('id', { count: 'exact', head: true })
        .in('casting_request_id', reqIds),
      supabaseAdmin
        .from('casting_submissions')
        .select('id', { count: 'exact', head: true })
        .in('casting_request_id', reqIds)
        .eq('status', 'confirmed'),
    ])
    totalSubmissions = total ?? 0
    confirmedSubmissions = confirmed ?? 0
  }

  const avgSubmissions = totalRequests > 0
    ? Math.round((totalSubmissions / totalRequests) * 10) / 10
    : 0
  const confirmationRate = totalSubmissions > 0
    ? Math.round((confirmedSubmissions / totalSubmissions) * 100)
    : 0

  // Most active region by public performer count
  const { data: profiles } = await supabaseAdmin
    .from('performer_profiles')
    .select('film_region_code')
    .eq('is_public', true)

  let mostActiveRegion = '—'
  if (profiles && profiles.length > 0) {
    const tally: Record<string, number> = {}
    for (const p of profiles) {
      if (p.film_region_code) {
        tally[p.film_region_code] = (tally[p.film_region_code] || 0) + 1
      }
    }
    const topCode = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]
    if (topCode) mostActiveRegion = getRegionName(topCode)
  }

  return NextResponse.json({ totalRequests, avgSubmissions, confirmationRate, mostActiveRegion })
}
