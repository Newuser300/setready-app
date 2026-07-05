import { getMatchingRegions, getRegionFromCity, unionBadge, unionTierLabel } from './film-regions'

// Score a performer against a casting request's requirements
function scorePerformer(performer: any, request: any): number {
  let score = 0
  const req = request.requirements || {}

  // Union priority bonus (Full=100, Apprentice=75, BG=50, NonUnion=0)
  const unionBonuses: Record<number, number> = { 1: 100, 2: 75, 3: 50, 4: 0 }
  score += unionBonuses[performer.union_priority ?? 4] ?? 0

  // Availability on shoot date
  if (performer.is_available_on_date) score += 50

  // Gender match
  if (req.gender && req.gender !== 'Any' && performer.gender) {
    if (performer.gender.toLowerCase() === req.gender.toLowerCase()) score += 20
    else score -= 30
  }

  // Hair color
  if (req.hair_color && performer.hair_color) {
    if (performer.hair_color.toLowerCase() === req.hair_color.toLowerCase()) score += 10
  }

  // Height range
  if (req.height_min && req.height_max && performer.height_cm) {
    if (performer.height_cm >= req.height_min && performer.height_cm <= req.height_max) score += 15
  }

  // Special skills overlap
  if (req.special_skills?.length && performer.special_skills?.length) {
    const matches = req.special_skills.filter((s: string) =>
      performer.special_skills.some((ps: string) => ps.toLowerCase().includes(s.toLowerCase()))
    )
    score += matches.length * 10
  }

  // Age range
  if (performer.age) {
    if (req.age_min && performer.age < req.age_min) score -= 20
    if (req.age_max && performer.age > req.age_max) score -= 20
  }

  // Has headshot (profile completeness)
  if (performer.headshot_url) score += 5

  return score
}

export async function getSubmissionSuggestions(
  castingRequest: any,
  agencyRoster: any[]
): Promise<any[]> {
  // Filter by location
  const locationFiltered = agencyRoster.filter(p => {
    if (!castingRequest.shoot_region_code) return true
    if (!p.film_region_code) return true
    return getMatchingRegions(
      castingRequest.shoot_region_code,
      p.film_region_code,
      p.travel_willingness || 'local',
      p.travel_radius_km || 100
    )
  })

  // Score + attach metadata
  const scored = locationFiltered.map(p => ({
    ...p,
    matchScore: scorePerformer(p, castingRequest),
    unionBadge: unionBadge(p.union_status),
    unionTierLabel: unionTierLabel(p.union_status),
  }))

  // Sort by score (union priority already baked in)
  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10)
}

// Structured criteria extracted from a natural-language casting query.
export interface SearchCriteria {
  gender: string
  age_min: number | null
  age_max: number | null
  hair_color: string | null
  eye_color: string | null
  body_type: string | null
  ethnicity: string | null
  height_min_cm: number | null
  height_max_cm: number | null
  special_skills: string[]
  union_only: boolean
  availability_date: string | null
  location_text: string | null
  interpretation: string
}

// Parse a natural-language casting query into structured criteria (single AI call).
// Returns usedAi=false (criteria null) when there is no API key or the response can't be parsed,
// so the caller can fall back to a keyword search.
export async function extractSearchCriteria(
  query: string,
  shootRegionCode: string,
  today?: string
): Promise<{
  criteria: SearchCriteria | null
  effectiveRegion: string
  resolvedRegionCode: string | null
  interpretation: string
  availabilityDate: string | null
  usedAi: boolean
}> {
  const todayStr = today || new Date().toISOString().slice(0, 10)
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return {
      criteria: null,
      effectiveRegion: shootRegionCode || '',
      resolvedRegionCode: null,
      interpretation: `Keyword search for: ${query}`,
      availabilityDate: null,
      usedAi: false,
    }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `You are a casting director assistant. Today's date is ${todayStr}. Extract casting criteria from this natural language query and return ONLY valid JSON with no markdown:

Query: "${query}"

Return this exact JSON structure:
{
  "gender": "male" or "female" or "any",
  "age_min": null or number,
  "age_max": null or number,
  "hair_color": null or string,
  "eye_color": null or string,
  "body_type": null or string,
  "ethnicity": null or string,
  "height_min_cm": null or number,
  "height_max_cm": null or number,
  "special_skills": [],
  "union_only": false or true,
  "availability_date": null or "YYYY-MM-DD" (resolve relative dates like "Tuesday", "next Thursday", "June 20" against today ${todayStr}),
  "location_text": null or string (any city or place name mentioned, e.g. "Vancouver", "Okanagan"),
  "interpretation": "one sentence describing what was understood"
}`,
        }],
      }),
    })

    const data = await res.json()
    const text: string = data.content?.[0]?.text || '{}'
    const criteria: SearchCriteria = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    // Resolve location_text to a region code if no shootRegionCode was passed in
    let resolvedRegionCode: string | null = null
    let effectiveRegion = shootRegionCode || ''
    if (criteria.location_text && !shootRegionCode) {
      const fromCity = getRegionFromCity(criteria.location_text)
      if (fromCity) {
        resolvedRegionCode = fromCity
        effectiveRegion = fromCity
      }
    }

    return {
      criteria,
      effectiveRegion,
      resolvedRegionCode,
      interpretation: criteria.interpretation || `Search for: ${query}`,
      availabilityDate: criteria.availability_date || null,
      usedAi: true,
    }
  } catch {
    return {
      criteria: null,
      effectiveRegion: shootRegionCode || '',
      resolvedRegionCode: null,
      interpretation: `Could not parse: "${query}" — showing all performers`,
      availabilityDate: null,
      usedAi: false,
    }
  }
}

// The authoritative in-memory filter + region match + union sort.
// The DB query in the route is only a (never-stricter) pre-filter to shrink the candidate set;
// this function makes the exact final cut, so results are identical to the old load-everything approach.
export function applyCriteriaFilter(
  criteria: SearchCriteria,
  allPerformers: any[],
  effectiveRegion: string
): any[] {
  let filtered = allPerformers.filter(p => {
    if (criteria.gender && criteria.gender !== 'any') {
      if (p.gender?.toLowerCase() !== criteria.gender.toLowerCase()) return false
    }
    if (criteria.age_min && p.age && p.age < criteria.age_min) return false
    if (criteria.age_max && p.age && p.age > criteria.age_max) return false
    if (criteria.hair_color && p.hair_color) {
      if (!p.hair_color.toLowerCase().includes(criteria.hair_color.toLowerCase())) return false
    }
    if (criteria.union_only && (p.union_priority ?? 4) > 2) return false
    if (criteria.height_min_cm && p.height_cm && p.height_cm < criteria.height_min_cm) return false
    if (criteria.height_max_cm && p.height_cm && p.height_cm > criteria.height_max_cm) return false
    return true
  })

  // Location filter (depends on each performer's travel willingness/radius — stays in app logic)
  if (effectiveRegion) {
    filtered = filtered.filter(p => {
      if (!p.film_region_code) return true
      return getMatchingRegions(effectiveRegion, p.film_region_code, p.travel_willingness || 'local', p.travel_radius_km || 100)
    })
  }

  // Sort by union priority ASC (Full Members first)
  filtered.sort((a, b) => (a.union_priority ?? 4) - (b.union_priority ?? 4))
  return filtered
}

// Backwards-compatible wrapper (kept for any external callers). The ai-search route no longer
// uses this — it calls extractSearchCriteria + a DB pre-filter + applyCriteriaFilter directly.
export async function aiPerformerSearch(
  query: string,
  allPerformers: any[],
  shootRegionCode: string,
  today?: string
): Promise<{ performers: any[]; interpretation: string; availability_date: string | null; resolved_region_code: string | null }> {
  const { criteria, effectiveRegion, resolvedRegionCode, interpretation, availabilityDate, usedAi } =
    await extractSearchCriteria(query, shootRegionCode, today)

  if (!usedAi || !criteria) {
    const q = query.toLowerCase()
    const filtered = allPerformers.filter(p => {
      const name = (p.users?.raw_user_meta_data?.full_name || '').toLowerCase()
      return name.includes(q) || (p.union_status || '').toLowerCase().includes(q)
    })
    return { performers: filtered, interpretation, availability_date: availabilityDate, resolved_region_code: resolvedRegionCode }
  }

  const filtered = applyCriteriaFilter(criteria, allPerformers, effectiveRegion)
  return { performers: filtered, interpretation, availability_date: availabilityDate, resolved_region_code: resolvedRegionCode }
}
