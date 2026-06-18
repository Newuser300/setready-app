import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getRegionFromCity } from '@/lib/film-regions'
import { supabaseAdmin } from '@/utils/supabase/admin'

async function getUser(req?: Request) {
  // Try Authorization header first (used during sign-up before cookies are set)
  if (req) {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      if (user) return user
    }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function PATCH(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { city, filmRegionCode, travelWillingness, travelRadiusKm, travelCostsRequired } = await req.json()

  // Auto-detect region from city if not provided
  const resolvedRegion = filmRegionCode || (city ? getRegionFromCity(city) : null)

  // Update users table
  await supabaseAdmin
    .from('users')
    .update({
      city: city || null,
      film_region_code: resolvedRegion,
      travel_willingness: travelWillingness || 'local',
      travel_radius_km: travelRadiusKm || 100,
    })
    .eq('id', user.id)

  // Update performer_profiles table
  const { error } = await supabaseAdmin
    .from('performer_profiles')
    .update({
      city: city || null,
      film_region_code: resolvedRegion,
      travel_willingness: travelWillingness || 'local',
      travel_radius_km: travelRadiusKm || 100,
      travel_costs_required: travelCostsRequired ?? false,
    })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, resolvedRegion })
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('users')
    .select('city, film_region_code, travel_willingness, travel_radius_km')
    .eq('id', user.id)
    .single()

  const { data: profile } = await supabaseAdmin
    .from('performer_profiles')
    .select('travel_costs_required')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    city: data?.city || '',
    filmRegionCode: data?.film_region_code || '',
    travelWillingness: data?.travel_willingness || 'local',
    travelRadiusKm: data?.travel_radius_km || 100,
    travelCostsRequired: profile?.travel_costs_required ?? false,
  })
}
