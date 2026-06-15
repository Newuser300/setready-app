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

  // Fetch all public performer profiles
  const { data: profiles, error } = await supabaseAdmin
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
      special_skills,
      film_region_code,
      city,
      travel_willingness,
      travel_radius_km,
      is_public,
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
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute age from date_of_birth
  const now = new Date()
  const performers = (profiles || []).map((p: any) => ({
    ...p,
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

  return NextResponse.json(result)
}
