import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

export const runtime = 'nodejs'

// Records one page view. Public (no auth) so we capture logged-out visitors.
// Server-side insert via service role; the table is not exposed to the client.
export async function POST(req: Request) {
  try {
    const ua = req.headers.get('user-agent') || ''
    // Skip obvious bots/crawlers/link-preview fetchers so counts reflect people.
    if (/bot|crawler|spider|crawl|slurp|facebookexternalhit|preview|headless|monitor|lighthouse/i.test(ua)) {
      return NextResponse.json({ ok: true, skipped: 'bot' })
    }

    const body = await req.json().catch(() => ({} as any))
    const path = typeof body?.path === 'string' ? body.path.slice(0, 300) : null

    await supabaseAdmin.from('site_visits').insert({ path })
    return NextResponse.json({ ok: true })
  } catch {
    // Never let tracking break a page load
    return NextResponse.json({ ok: false })
  }
}
