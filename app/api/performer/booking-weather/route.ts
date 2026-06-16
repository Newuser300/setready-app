import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { fetchBookingWeather } from '@/lib/booking-weather'
import { resolveLocationToRegion } from '@/lib/film-regions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(s) { try { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

  // Verify performer has a confirmed submission for this request
  const { data: sub } = await supabaseAdmin
    .from('casting_submissions')
    .select('id')
    .eq('casting_request_id', requestId)
    .eq('performer_id', user.id)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: castingReq } = await supabaseAdmin
    .from('casting_requests')
    .select('shoot_date, call_time, location, production_name, role_type')
    .eq('id', requestId)
    .single()

  if (!castingReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  const { shoot_date, call_time, location, production_name, role_type } = castingReq

  // Days until shoot (for forecast window check)
  const destRegion = resolveLocationToRegion(location)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const shoot = new Date(shoot_date + 'T00:00:00')
  const daysAway = Math.ceil((shoot.getTime() - today.getTime()) / 86400000)

  const forecastComingSoon = !!destRegion && daysAway > 16

  const weather = destRegion && daysAway <= 16
    ? await fetchBookingWeather(location, shoot_date)
    : null

  return NextResponse.json({
    shoot_date,
    call_time,
    location,
    production_name,
    role_type,
    weather,
    forecastComingSoon,
  })
}
