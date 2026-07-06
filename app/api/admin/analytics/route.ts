import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/utils/isAdmin'

export const runtime = 'nodejs'

// Pulls Web Analytics data from Vercel's official API and returns it for the
// admin dashboard. Admin-only. Requires three env vars:
//   VERCEL_ANALYTICS_TOKEN  – a Vercel access token (Account Settings → Tokens)
//   VERCEL_PROJECT_ID       – e.g. prj_xxx
//   VERCEL_TEAM_ID          – e.g. team_xxx (omit for personal accounts)
const BASE = 'https://api.vercel.com/v1/query/web-analytics'

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.VERCEL_ANALYTICS_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID

  if (!token || !projectId) {
    return NextResponse.json(
      { configured: false, error: 'Analytics API not configured. Add VERCEL_ANALYTICS_TOKEN and VERCEL_PROJECT_ID.' },
      { status: 200 },
    )
  }

  // Date window (default: last 30 days)
  const url = new URL(req.url)
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 90)
  const until = new Date()
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000)

  const common = (params: Record<string, string>) => {
    const qs = new URLSearchParams({ projectId, ...(teamId ? { teamId } : {}), ...params })
    return qs.toString()
  }

  async function vfetch(path: string, params: Record<string, string>) {
    const res = await fetch(`${BASE}/${path}?${common(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Vercel API ${res.status}: ${body.slice(0, 300)}`)
    }
    return res.json()
  }

  try {
    const range = { since: ymd(since), until: ymd(until) }

    const [totals, daily, topPages, topReferrers, topCountries, devices] = await Promise.all([
      vfetch('visits/count', {}),
      vfetch('visits/aggregate', { ...range, by: 'day' }),
      vfetch('visits/aggregate', { ...range, by: 'route', limit: '10' }),
      vfetch('visits/aggregate', { ...range, by: 'referrerHostname', limit: '10' }),
      vfetch('visits/aggregate', { ...range, by: 'country', limit: '10' }),
      vfetch('visits/aggregate', { ...range, by: 'deviceType', limit: '6' }),
    ])

    return NextResponse.json({
      configured: true,
      days,
      totals: totals?.data ?? { pageviews: 0, visitors: 0 },
      daily: daily?.data ?? [],
      topPages: topPages?.data ?? [],
      topReferrers: topReferrers?.data ?? [],
      topCountries: topCountries?.data ?? [],
      devices: devices?.data ?? [],
    })
  } catch (e: any) {
    return NextResponse.json(
      { configured: true, error: e?.message || 'Failed to load Vercel analytics' },
      { status: 200 },
    )
  }
}
