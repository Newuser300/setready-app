import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { aiPerformerSearch } from '@/lib/ai-casting'

export async function POST(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { query, shootRegionCode } = body as { query: string; shootRegionCode?: string }

  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)

  // Fetch public performer profiles.
  // NOTE (audit #11): this loads up to PROFILE_CAP profiles into memory and sends them all to
  // the AI for matching. Fine at current scale, but it does NOT scale. Before the public
  // performer count approaches this cap, matching should move into the DB query (parse the
  // query into structured filters, fetch only candidates). The order + count below make the
  // cap deterministic and log a warning when we're outgrowing this approach.
  const PROFILE_CAP = 500
  const { data: profiles, error, count } = await supabaseAdmin
    .from('performer_profiles')
    .select(`
      user_id,
      headshot_url,
      bio,
      gender,
      date_of_birth,
      height_cm,
      hair_color,
      eye_color,
      ethnicity,
      union_status,
      union_priority,
      boost_expires_at,
      special_skills,
      film_region_code,
      city,
      travel_willingness,
      travel_radius_km,
      is_public,
      agency_id
    `, { count: 'exact' })
    .eq('is_public', true)
    .order('user_id', { ascending: true })
    .limit(PROFILE_CAP)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Stitch users and agencies separately — no FK relationships on performer_profiles
  const profileList = profiles || []
  let usersMap: Record<string, any> = {}
  let agenciesMap: Record<string, any> = {}

  if (profileList.length > 0) {
    const uids = profileList.map((p: any) => p.user_id)
    const agencyIds = [...new Set(profileList.map((p: any) => p.agency_id).filter(Boolean))]

    const [{ data: userRows }, { data: agencyRows }] = await Promise.all([
      supabaseAdmin.from('users').select('id, email, name').in('id', uids),
      agencyIds.length > 0
        ? supabaseAdmin.from('agencies').select('id, name').in('id', agencyIds)
        : Promise.resolve({ data: [] }),
    ])

    ;(userRows || []).forEach((u: any) => {
      usersMap[u.id] = { id: u.id, email: u.email, raw_user_meta_data: { full_name: u.name || '' } }
    })
    ;(agencyRows || []).forEach((a: any) => { agenciesMap[a.id] = a })
  }

  if ((count ?? 0) > PROFILE_CAP) {
    console.warn(`[ai-search] ${count} public profiles exceed the ${PROFILE_CAP} in-memory cap — search is dropping performers. Time to move filtering into the query (audit #11).`)
  }

  // Compute age from date_of_birth
  const now = new Date()
  const performers = profileList.map((p: any) => ({
    ...p,
    users: usersMap[p.user_id] || null,
    agencies: p.agency_id ? (agenciesMap[p.agency_id] || null) : null,
    age: p.date_of_birth
      ? Math.floor((now.getTime() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
    availabilityStatus: null as string | null,
  }))

  const result = await aiPerformerSearch(query.trim(), performers, shootRegionCode || '', today)

  // If AI extracted an availability_date, attach availability status to each performer
  if (result.availability_date && result.performers.length > 0) {
    const userIds = result.performers.map((p: any) => p.user_id)

    const { data: avail } = await supabaseAdmin
      .from('performer_availability')
      .select('user_id, status')
      .eq('date', result.availability_date)
      .in('user_id', userIds)

    const availMap: Record<string, string> = {}
    ;(avail || []).forEach((a: any) => { availMap[a.user_id] = a.status })

    result.performers = result.performers.map((p: any) => ({
      ...p,
      availabilityStatus: availMap[p.user_id] || null,
    }))

    // Sort: available first, then by union_priority ASC
    result.performers.sort((a: any, b: any) => {
      const aAvail = a.availabilityStatus === 'available' ? 0 : 1
      const bAvail = b.availabilityStatus === 'available' ? 0 : 1
      if (aAvail !== bAvail) return aAvail - bAvail
      return (a.union_priority ?? 4) - (b.union_priority ?? 4)
    })
  }

  // Boost: pin boosted profiles to the top of the matched results. Boost data is
  // read from the original profiles (not the AI passthrough) so it's always present.
  const boostMap: Record<string, string | null> = {}
  profileList.forEach((p: any) => { boostMap[p.user_id] = p.boost_expires_at || null })
  const nowMs = Date.now()
  const isBoosted = (uid: string) => {
    const exp = boostMap[uid]
    return exp ? new Date(exp).getTime() > nowMs : false
  }
  if (Array.isArray(result.performers)) {
    result.performers = [
      ...result.performers.filter((p: any) => isBoosted(p.user_id)),
      ...result.performers.filter((p: any) => !isBoosted(p.user_id)),
    ]
  }

  return NextResponse.json(result)
}
