import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const startDate = `${month}-01`
  const endDate = new Date(
    new Date(startDate).getFullYear(),
    new Date(startDate).getMonth() + 1,
    0
  ).toISOString().slice(0, 10)

  const { data } = await supabaseAdmin
    .from('performer_availability')
    .select('date')
    .eq('status', 'available')
    .gte('date', startDate)
    .lte('date', endDate)

  // Count per date
  const counts: Record<string, number> = {}
  ;(data || []).forEach(row => {
    counts[row.date] = (counts[row.date] || 0) + 1
  })

  const result = Object.entries(counts).map(([date, count]) => ({ date, count }))
  return NextResponse.json(result)
}
