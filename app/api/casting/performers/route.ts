import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

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
  const skills = searchParams.get('skills') // comma-separated
  const sort = searchParams.get('sort') || 'available'
  const limit = parseInt(searchParams.get('limit') || '60')

  // Build profile query
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
      special_skills,
      languages,
      agency_id,
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
    .limit(limit)

  if (gender && gender !== 'Any') query = query.eq('gender', gender)
  if (hairColor) query = query.eq('hair_color', hairColor)
  if (eyeColor) query = query.eq('eye_color', eyeColor)
  if (unionStatus) query = query.eq('union_status', unionStatus)
  if (agencyId) query = query.eq('agency_id', agencyId)

  const { data: profiles, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result = profiles || []

  // Age filter (calculated from DOB)
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
  if (date) {
    const userIds = result.map(p => p.user_id)
    if (userIds.length > 0) {
      const { data: avail } = await supabaseAdmin
        .from('performer_availability')
        .select('user_id, status')
        .eq('date', date)
        .in('user_id', userIds)

      const availMap: Record<string, string> = {}
      ;(avail || []).forEach(a => { availMap[a.user_id] = a.status })

      result = result.map(p => ({ ...p, availabilityStatus: availMap[p.user_id] || null }))

      // Sort available first
      if (sort === 'available') {
        result.sort((a: any, b: any) => {
          const aAvail = a.availabilityStatus === 'available' ? 0 : 1
          const bAvail = b.availabilityStatus === 'available' ? 0 : 1
          return aAvail - bAvail
        })
      }
    }
  }

  // Sort options
  if (sort === 'name') {
    result.sort((a: any, b: any) => {
      const aName = a.users?.raw_user_meta_data?.full_name || a.users?.email || ''
      const bName = b.users?.raw_user_meta_data?.full_name || b.users?.email || ''
      return aName.localeCompare(bName)
    })
  }

  // Compute age for response
  const now = new Date()
  const withAge = result.map((p: any) => ({
    ...p,
    age: p.date_of_birth
      ? Math.floor((now.getTime() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
  }))

  return NextResponse.json(withAge)
}
