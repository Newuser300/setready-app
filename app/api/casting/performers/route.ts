import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { getMatchingRegions, calculateDistanceKm, FILM_REGIONS } from '@/lib/film-regions'

export async function GET(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const gender = searchParams.get('gender')
  const ageMin = searchParams.get('ageMin')
  const ageMax = searchParams.get('ageMax')
  const hairColor = searchParams.get('hairColor')
  const eyeColor = searchParams.get('eyeColor')
  const unionStatus = searchParams.get('unionStatus')
  const agencyId = searchParams.get('agencyId')
  const skills = searchParams.get('skills')
  const sort = searchParams.get('sort') || 'priority'
  const limit = parseInt(searchParams.get('limit') || '100')
  const shootRegionCode = searchParams.get('region') || ''
  const unionTier = searchParams.get('unionTier') || '' // 'full','apprentice','bg','nonunion'
  const representation = searchParams.get('representation') || '' // '', 'represented', 'unrepresented'
  const hairLength = searchParams.get('hairLength') || ''
  const hairTexture = searchParams.get('hairTexture') || ''
  const bodyType = searchParams.get('bodyType') || ''
  const skinTone = searchParams.get('skinTone') || ''
  const facialHair = searchParams.get('facialHair') || ''
  const ethnicity = searchParams.get('ethnicity') || ''
  const language = searchParams.get('language') || ''
  const danceStyle = searchParams.get('danceStyle') || ''
  const sport = searchParams.get('sport') || ''
  const accent = searchParams.get('accent') || ''
  const driving = searchParams.get('driving') || ''
  const swimming = searchParams.get('swimming') || ''
  const heightMin = searchParams.get('heightMin') || ''
  const heightMax = searchParams.get('heightMax') || ''

  let query = supabaseAdmin
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
      verified_badge,
      special_skills,
      languages,
      agency_id,
      film_region_code,
      city,
      travel_willingness,
      travel_radius_km,
      travel_costs_required,
      is_public,
      updated_at,
      users:user_id (
        id,
        email,
        raw_user_meta_data
      ),
      agencies:agency_id (
        id,
        name
      )
    `)
    .eq('is_public', true)
    .order('union_priority', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (gender && gender !== 'Any') query = query.eq('gender', gender)
  if (hairColor) query = query.eq('hair_color', hairColor)
  if (eyeColor) query = query.eq('eye_color', eyeColor)
  if (unionStatus) query = query.eq('union_status', unionStatus)
  if (agencyId) query = query.eq('agency_id', agencyId)
  if (representation === 'unrepresented') query = query.is('agency_id', null)
  else if (representation === 'represented') query = query.not('agency_id', 'is', null)

  // Filter by union tier
  if (unionTier === 'full') query = query.eq('union_priority', 1)
  else if (unionTier === 'apprentice') query = query.eq('union_priority', 2)
  else if (unionTier === 'bg') query = query.eq('union_priority', 3)
  else if (unionTier === 'nonunion') query = query.eq('union_priority', 4)

  // Text filters — exact match
  if (hairLength) query = query.eq('hair_length', hairLength)
  if (hairTexture) query = query.eq('hair_texture', hairTexture)
  if (bodyType) query = query.eq('body_type', bodyType)
  if (skinTone) query = query.eq('skin_tone', skinTone)
  if (facialHair) query = query.eq('facial_hair', facialHair)
  if (swimming) query = query.eq('swimming_level', swimming)

  // Array filters — row must contain the selected value
  if (ethnicity) query = query.contains('ethnicity', [ethnicity])
  if (language) query = query.contains('languages', [language])
  if (danceStyle) query = query.contains('dance_styles', [danceStyle])
  if (sport) query = query.contains('sports', [sport])
  if (accent) query = query.contains('accents', [accent])
  if (driving) query = query.contains('driving_licence', [driving])

  // Height range
  if (heightMin) query = query.gte('height_cm', parseInt(heightMin))
  if (heightMax) query = query.lte('height_cm', parseInt(heightMax))

  const { data: profiles, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result: any[] = profiles || []

  // Age filter
  if (ageMin || ageMax) {
    const now = new Date()
    result = result.filter(p => {
      if (!p.date_of_birth) return true
      const age = Math.floor((now.getTime() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (ageMin && age < parseInt(ageMin)) return false
      if (ageMax && age > parseInt(ageMax)) return false
      return true
    })
  }

  // Skills filter
  if (skills) {
    const skillList = skills.split(',').map(s => s.trim().toLowerCase())
    result = result.filter(p =>
      skillList.some(sk => p.special_skills?.some((s: string) => s.toLowerCase().includes(sk)))
    )
  }

  // Attach availability for requested date
  if (date && result.length > 0) {
    const userIds = result.map(p => p.user_id)
    const { data: avail } = await supabaseAdmin
      .from('performer_availability')
      .select('user_id, status')
      .eq('date', date)
      .in('user_id', userIds)

    const availMap: Record<string, string> = {}
    ;(avail || []).forEach((a: any) => { availMap[a.user_id] = a.status })
    result = result.map(p => ({ ...p, availabilityStatus: availMap[p.user_id] || null }))
  }

  // Compute age
  const now = new Date()
  result = result.map((p: any) => ({
    ...p,
    age: p.date_of_birth
      ? Math.floor((now.getTime() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
  }))

  // Location filtering — split into inRegion + adjacent
  let inRegion = result
  let adjacentRegion: any[] = []

  if (shootRegionCode && FILM_REGIONS[shootRegionCode]) {
    const shootRegion = FILM_REGIONS[shootRegionCode]

    // Performers in-region or willing to travel to this region
    inRegion = result.filter(p => {
      if (!p.film_region_code) return true // no region set — include
      return getMatchingRegions(
        shootRegionCode,
        p.film_region_code,
        p.travel_willingness || 'local',
        p.travel_radius_km || 100
      )
    })

    // Adjacent — performers not in inRegion who are physically close
    const inRegionIds = new Set(inRegion.map(p => p.user_id))
    adjacentRegion = result
      .filter(p => !inRegionIds.has(p.user_id) && p.film_region_code)
      .filter(p => {
        const pRegion = FILM_REGIONS[p.film_region_code]
        if (!pRegion) return false
        const distance = calculateDistanceKm(
          shootRegion.latitudeCenter, shootRegion.longitudeCenter,
          pRegion.latitudeCenter, pRegion.longitudeCenter
        )
        return distance <= 300 // show adjacent within 300km
      })
  }

  function sortPerformers(arr: any[]) {
    const nowMs = Date.now()
    const isBoosted = (p: any) => p.boost_expires_at ? new Date(p.boost_expires_at).getTime() > nowMs : false
    return arr.sort((a, b) => {
      const aB = isBoosted(a) ? 0 : 1
      const bB = isBoosted(b) ? 0 : 1
      if (aB !== bB) return aB - bB
      const pA = a.union_priority ?? 4
      const pB = b.union_priority ?? 4
      if (pA !== pB) return pA - pB
      const aAvail = a.availabilityStatus === 'available' ? 0 : 1
      const bAvail = b.availabilityStatus === 'available' ? 0 : 1
      if (aAvail !== bAvail) return aAvail - bAvail
      const aHead = a.headshot_url ? 0 : 1
      const bHead = b.headshot_url ? 0 : 1
      return aHead - bHead
    })
  }

  if (sort === 'name') {
    result.sort((a, b) => {
      const aName = a.users?.raw_user_meta_data?.full_name || a.users?.email || ''
      const bName = b.users?.raw_user_meta_data?.full_name || b.users?.email || ''
      return aName.localeCompare(bName)
    })
    return NextResponse.json(result)
  }

  if (sort === 'available' && !shootRegionCode) {
    result.sort((a: any, b: any) => {
      const aAvail = a.availabilityStatus === 'available' ? 0 : 1
      const bAvail = b.availabilityStatus === 'available' ? 0 : 1
      return aAvail - bAvail
    })
    return NextResponse.json(result)
  }

  // Default: priority sort with region split
  if (shootRegionCode) {
    return NextResponse.json({
      inRegion: sortPerformers(inRegion),
      adjacentRegion: sortPerformers(adjacentRegion),
      shootRegionName: FILM_REGIONS[shootRegionCode]?.name || shootRegionCode,
    })
  }

  return NextResponse.json(sortPerformers(result))
}
