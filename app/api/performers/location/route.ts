import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getRegionFromCity } from '@/lib/film-regions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
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
