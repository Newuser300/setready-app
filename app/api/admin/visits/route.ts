import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'

export const runtime = 'nodejs'

// Returns visit counts for the admin dashboard. Admin-only.
export async function GET(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const since = (ms: number) => new Date(now - ms).toISOString()

  async function countSince(iso?: string) {
    let q = supabaseAdmin.from('site_visits').select('*', { count: 'exact', head: true })
    if (iso) q = q.gte('created_at', iso)
    const { count } = await q
    return count ?? 0
  }

  try {
    const [lastHour, last24h, last7d, last30d, total] = await Promise.all([
      countSince(since(60 * 60 * 1000)),
      countSince(since(24 * 60 * 60 * 1000)),
      countSince(since(7 * 24 * 60 * 60 * 1000)),
      countSince(since(30 * 24 * 60 * 60 * 1000)),
      countSince(),
    ])
    return NextResponse.json({ lastHour, last24h, last7d, last30d, total })
  } catch {
    return NextResponse.json({ lastHour: 0, last24h: 0, last7d: 0, last30d: 0, total: 0 })
  }
}
