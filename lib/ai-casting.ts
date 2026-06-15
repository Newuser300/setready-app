import { getMatchingRegions, unionBadge, unionTierLabel } from './film-regions'

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

export async function aiPerformerSearch(
  query: string,
  allPerformers: any[],
  shootRegionCode: string
): Promise<{ performers: any[]; interpretation: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Fallback: basic keyword search
    const q = query.toLowerCase()
    const filtered = allPerformers.filter(p => {
      const name = (p.users?.raw_user_meta_data?.full_name || '').toLowerCase()
      return name.includes(q) || (p.union_status || '').toLowerCase().includes(q)
    })
    return { performers: filtered, interpretation: `Keyword search for: ${query}` }
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
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `You are a casting director assistant. Extract casting criteria from this natural language query and return ONLY valid JSON with no markdown:

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
  "interpretation": "one sentence describing what was understood"
}`,
        }],
      }),
    })

    const data = await res.json()
    const text: string = data.content?.[0]?.text || '{}'
    const criteria = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    // Filter performers by extracted criteria
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

    // Location filter
    if (shootRegionCode) {
      filtered = filtered.filter(p => {
        if (!p.film_region_code) return true
        return getMatchingRegions(shootRegionCode, p.film_region_code, p.travel_willingness || 'local', p.travel_radius_km || 100)
      })
    }

    // Always sort by union priority first
    filtered.sort((a, b) => (a.union_priority ?? 4) - (b.union_priority ?? 4))

    return {
      performers: filtered,
      interpretation: criteria.interpretation || `Search for: ${query}`,
    }
  } catch {
    return { performers: allPerformers.slice(0, 20), interpretation: `Could not parse: "${query}" — showing all performers` }
  }
}
