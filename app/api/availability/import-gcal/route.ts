import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Validate it looks like a Google Calendar iCal URL
  if (!url.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let icsText: string
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    icsText = await res.text()
  } catch (err: any) {
    console.error('GCal fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch calendar. Check the URL and try again.' }, { status: 400 })
  }

  // Parse iCal using node-ical dynamically (avoids build issues with ESM/CJS)
  let ical: any
  try {
    ical = await import('node-ical')
  } catch {
    return NextResponse.json({ error: 'Calendar parser unavailable' }, { status: 500 })
  }

  const parsed = ical.default ? ical.default.parseICS(icsText) : ical.parseICS(icsText)
  const today = new Date().toISOString().slice(0, 10)

  const busyDates = new Set<string>()

  for (const event of Object.values(parsed) as any[]) {
    if (event.type !== 'VEVENT') continue
    if (!event.start) continue

    // Convert start to date string
    const start = new Date(event.start)
    const end = event.end ? new Date(event.end) : new Date(start)

    // Iterate all days the event spans
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)

    while (cur <= endDay) {
      const dateStr = cur.toISOString().slice(0, 10)
      if (dateStr >= today) busyDates.add(dateStr)
      cur.setDate(cur.getDate() + 1)
    }
  }

  if (busyDates.size === 0) {
    return NextResponse.json({ imported: 0, message: 'No future busy events found in this calendar.' })
  }

  const dates = Array.from(busyDates)
  const records = dates.map(date => ({
    user_id: user.id,
    date,
    status: 'unavailable',
    notes: 'Imported from Google Calendar',
    is_public: true,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin
    .from('performer_availability')
    .upsert(records, { onConflict: 'user_id,date', ignoreDuplicates: false })

  if (error) {
    console.error('Import upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ imported: dates.length })
}
