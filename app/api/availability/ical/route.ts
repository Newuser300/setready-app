import { createClient } from '@supabase/supabase-js'
import { createEvents } from 'ics'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const token = searchParams.get('token')

  if (!userId || !token) {
    return new Response('Missing userId or token', { status: 400 })
  }

  // Verify token
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('id, ical_token')
    .eq('id', userId)
    .eq('ical_token', token)
    .single()

  if (!userData) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Fetch next 6 months of availability
  const now = new Date()
  const sixMonths = new Date(now)
  sixMonths.setMonth(sixMonths.getMonth() + 6)

  const { data: avail } = await supabaseAdmin
    .from('performer_availability')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['available', 'morning', 'afternoon'])
    .gte('date', now.toISOString().slice(0, 10))
    .lte('date', sixMonths.toISOString().slice(0, 10))
    .order('date')

  const statusLabel: Record<string, string> = {
    available: 'Available for filming',
    morning: 'Available for filming (morning only)',
    afternoon: 'Available for filming (afternoon only)',
  }

  const events = (avail || []).map((day: any) => {
    const [y, m, d] = day.date.split('-').map(Number)
    return {
      start: [y, m, d] as [number, number, number],
      end: [y, m, d] as [number, number, number],
      title: statusLabel[day.status] || 'Available for filming',
      description: day.notes || 'Available for background work — SetReady',
      uid: `setready-avail-${day.id || day.date}@setready.site`,
    }
  })

  const { value, error } = createEvents(events)

  if (error || !value) {
    console.error('iCal generation error:', error)
    return new Response('Failed to generate calendar', { status: 500 })
  }

  return new Response(value, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': 'attachment; filename="setready-availability.ics"',
      'Cache-Control': 'no-cache',
    },
  })
}
