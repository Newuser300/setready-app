import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { randomBytes } from 'crypto'

export async function POST(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, shootDate, locationName } = await req.json()
  if (!shootDate) return NextResponse.json({ error: 'shootDate required' }, { status: 400 })

  const qrToken = randomBytes(20).toString('hex')
  const expiresAt = new Date(shootDate)
  expiresAt.setDate(expiresAt.getDate() + 1) // expires day after shoot

  const { data, error } = await supabaseAdmin
    .from('production_signin_sessions')
    .insert({
      casting_director_id: session.accountId,
      request_id: requestId || null,
      shoot_date: shootDate,
      qr_token: qrToken,
      is_active: true,
      location_name: locationName || null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data, qrToken, url: `/signin/${qrToken}` })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { data: signinSession } = await supabaseAdmin
    .from('production_signin_sessions')
    .select(`
      *,
      casting_requests:request_id (production_name, performers_needed)
    `)
    .eq('qr_token', token)
    .single()

  if (!signinSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Confirmed performers for this request
  let confirmedPerformers: any[] = []
  if (signinSession.request_id) {
    const { data: subs } = await supabaseAdmin
      .from('casting_submissions')
      .select(`
        performer_id,
        users:performer_id (email, raw_user_meta_data),
        performer_profiles:performer_id (headshot_url, union_status)
      `)
      .eq('casting_request_id', signinSession.request_id)
      .eq('status', 'confirmed')

    confirmedPerformers = subs || []
  }

  // Who has signed in
  const { data: signins } = await supabaseAdmin
    .from('performer_signins')
    .select('performer_user_id, signed_in_at, method')
    .eq('session_id', signinSession.id)

  const signedInIds = new Set((signins || []).map((s: any) => s.performer_user_id))
  const signedInMap: Record<string, any> = {}
  ;(signins || []).forEach((s: any) => { signedInMap[s.performer_user_id] = s })

  const list = confirmedPerformers.map((p: any) => ({
    performer_id: p.performer_id,
    name: (p.users as any)?.raw_user_meta_data?.full_name || (p.users as any)?.email?.split('@')[0] || 'Performer',
    email: (p.users as any)?.email,
    headshot_url: (p.performer_profiles as any)?.headshot_url,
    union_status: (p.performer_profiles as any)?.union_status,
    signed_in: signedInIds.has(p.performer_id),
    signed_in_at: signedInMap[p.performer_id]?.signed_in_at || null,
  }))

  return NextResponse.json({
    session: signinSession,
    performers: list,
    totalSignedIn: signedInIds.size,
    totalConfirmed: confirmedPerformers.length,
  })
}
