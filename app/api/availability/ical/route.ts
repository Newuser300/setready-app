import { supabaseAdmin } from '@/utils/supabase/admin'
import { createEvents } from 'ics'

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

  const nowStr = now.toISOString().slice(0, 10)
  const sixStr = sixMonths.toISOString().slice(0, 10)

  const { data: avail } = await supabaseAdmin
    .from('performer_availability')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['available', 'morning', 'afternoon'])
    .gte('date', nowStr)
    .lte('date', sixStr)
    .order('date')

  // Confirmed bookings block out dates as BUSY. Fetch any overlapping the window.
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, start_date, end_date, production, note')
    .eq('performer_id', userId)
    .eq('status', 'confirmed')
    .lte('start_date', sixStr)
    .gte('end_date', nowStr)

  const bookedDates = new Set<string>()
  const bookingEvents: any[] = []
  for (const b of bookings || []) {
    const [sy, sm, sd] = b.start_date.split('-').map(Number)
    const [ey, em, ed] = b.end_date.split('-').map(Number)
    const cur = new Date(sy, sm - 1, sd)
    const last = new Date(ey, em - 1, ed)
    while (cur <= last) {
      const mm = String(cur.getMonth() + 1).padStart(2, '0')
      const dd = String(cur.getDate()).padStart(2, '0')
      const ds = `${cur.getFullYear()}-${mm}-${dd}`
      if (ds >= nowStr && ds <= sixStr) {
        bookedDates.add(ds)
        bookingEvents.push({
          start: [cur.getFullYear(), cur.getMonth() + 1, cur.getDate()] as [number, number, number],
          end: [cur.getFullYear(), cur.getMonth() + 1, cur.getDate()] as [number, number, number],
          title: b.production ? `Booked — ${b.production}` : 'Booked — unavailable',
          description: b.note || 'Confirmed booking — BGReady',
          uid: `setready-booking-${b.id}-${ds}@bgready.site`,
        })
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  const statusLabel: Record<string, string> = {
    available: 'Available for filming',
    morning: 'Available for filming (morning only)',
    afternoon: 'Available for filming (afternoon only)',
  }

  const availEvents = (avail || [])
    .filter((day: any) => !bookedDates.has(day.date))
    .map((day: any) => {
      const [y, m, d] = day.date.split('-').map(Number)
      return {
        start: [y, m, d] as [number, number, number],
        end: [y, m, d] as [number, number, number],
        title: statusLabel[day.status] || 'Available for filming',
        description: day.notes || 'Available for background work — BGReady',
        uid: `setready-avail-${day.id || day.date}@bgready.site`,
      }
    })

  const { value, error } = createEvents([...availEvents, ...bookingEvents])

  if (error || !value) {
    console.error('iCal generation error:', error)
    return new Response('Failed to generate calendar', { status: 500 })
  }

  return new Response(value, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': 'attachment; filename="bgready-availability.ics"',
      'Cache-Control': 'no-cache',
    },
  })
}
