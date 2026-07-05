import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { extractSearchCriteria, applyCriteriaFilter } from '@/lib/ai-casting'

const PROFILE_COLUMNS = `
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
`

const numOrNull = (v: any): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// today minus `yearsAgo` years, as a YYYY-MM-DD string (for date_of_birth windowing)
const dobCutoff = (yearsAgo: number): string => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - yearsAgo)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { query, shootRegionCode } = body as { query: string; shootRegionCode?: string }

  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)

  // 1) Parse the natural-language query into structured criteria (single AI call).
  const { criteria, effectiveRegion, resolvedRegionCode, interpretation, availabilityDate, usedAi } =
    await extractSearchCriteria(query.trim(), shootRegionCode || '', today)

  // 2) Build the candidate query, pushing the structured filters into the DATABASE.
  //    Invariant: the SQL filter is never STRICTER than applyCriteriaFilter() below — it keeps NULLs
  //    and widens the age window by a couple of years — so the exact in-memory cut in step 4 returns
  //    identical results to the old "load up to 500 and filter in JS" approach, while the DB does the
  //    narrowing. This removes the silent-drop problem: the cap now applies to an already-filtered set.
  const PROFILE_CAP = 500

  let q = supabaseAdmin
    .from('performer_profiles')
    .select(PROFILE_COLUMNS, { count: 'exact' })
    .eq('is_public', true)

  if (usedAi && criteria) {
    // Gender — exact, case-insensitive (matches the JS cut, which also drops NULL gender)
    const g = String(criteria.gender || '').toLowerCase()
    if (g === 'male' || g === 'female') {
      q = q.ilike('gender', g)
    }

    // Union only — Full (1) or Apprentice (2); NULL priority treated as non-union and excluded
    if (criteria.union_only) {
      q = q.lte('union_priority', 2)
    }

    // Height range — keep NULLs (unknown height is decided by the JS cut, which keeps them)
    const hMin = numOrNull(criteria.height_min_cm)
    const hMax = numOrNull(criteria.height_max_cm)
    if (hMin != null && hMax != null) {
      q = q.or(`height_cm.is.null,and(height_cm.gte.${hMin},height_cm.lte.${hMax})`)
    } else if (hMin != null) {
      q = q.or(`height_cm.is.null,height_cm.gte.${hMin}`)
    } else if (hMax != null) {
      q = q.or(`height_cm.is.null,height_cm.lte.${hMax}`)
    }

    // Hair color — substring, case-insensitive; keep NULLs (sanitize to letters/spaces for the or-filter)
    const hair = String(criteria.hair_color || '').replace(/[^a-zA-Z ]/g, '').trim()
    if (hair) {
      q = q.or(`hair_color.is.null,hair_color.ilike.*${hair}*`)
    }

    // Age -> date_of_birth window, keep NULLs, widen by 2 years each side so we never drop a valid
    // match; applyCriteriaFilter() then makes the exact age cut on the returned rows.
    const ageMin = numOrNull(criteria.age_min)
    const ageMax = numOrNull(criteria.age_max)
    if (ageMin != null) {
      // at least (ageMin - 2) years old => born on or before this date
      q = q.or(`date_of_birth.is.null,date_of_birth.lte.${dobCutoff(Math.max(0, ageMin - 2))}`)
    }
    if (ageMax != null) {
      // at most (ageMax + 2) years old => born on or after this date
      q = q.or(`date_of_birth.is.null,date_of_birth.gte.${dobCutoff(ageMax + 2)}`)
    }
  }

  const { data: profiles, error, count } = await q
    .order('user_id', { ascending: true })
    .limit(PROFILE_CAP)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 3) Stitch users and agencies separately — no FK relationships on performer_profiles
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
    console.warn(`[ai-search] ${count} profiles match "${query}" even after DB filtering — exceeds the ${PROFILE_CAP} cap, so some matches are dropped. Tighten the default filters or raise the cap (audit #11).`)
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

  // 4) Authoritative final cut. For AI mode, apply the exact criteria filter (identical to before,
  //    now on a much smaller set). Without AI (no key / parse failure), fall back to keyword search.
  let matched: any[]
  if (usedAi && criteria) {
    matched = applyCriteriaFilter(criteria, performers, effectiveRegion)
  } else {
    const ql = query.trim().toLowerCase()
    matched = performers.filter((p: any) => {
      const name = (p.users?.raw_user_meta_data?.full_name || '').toLowerCase()
      return name.includes(ql) || (p.union_status || '').toLowerCase().includes(ql)
    })
  }

  const result: {
    performers: any[]
    interpretation: string
    availability_date: string | null
    resolved_region_code: string | null
  } = {
    performers: matched,
    interpretation,
    availability_date: availabilityDate,
    resolved_region_code: resolvedRegionCode,
  }

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
