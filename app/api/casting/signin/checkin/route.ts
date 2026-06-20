import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/casting-auth'

export async function POST(req: Request) {
  const { token, performerId } = await req.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { data: session } = await supabaseAdmin
    .from('production_signin_sessions')
    .select('id, request_id, is_active, expires_at')
    .eq('qr_token', token)
    .single()

  if (!session) return NextResponse.json({ error: 'Invalid sign-in code' }, { status: 404 })
  if (!session.is_active) return NextResponse.json({ error: 'Sign-in session is closed' }, { status: 400 })
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Sign-in session has expired' }, { status: 400 })
  }

  if (!performerId) {
    return NextResponse.json({ error: 'performerId required' }, { status: 400 })
  }
  const resolvedPerformerId = performerId

  // Whitelist: the performer must be a CONFIRMED submission on this session's request.
  // Standalone sessions (no request_id) have no roster, so check-in is not allowed.
  if (!session.request_id) {
    return NextResponse.json({ error: 'This sign-in session has no confirmed roster' }, { status: 403 })
  }
  const { data: confirmedSub } = await supabaseAdmin
    .from('casting_submissions')
    .select('id')
    .eq('casting_request_id', session.request_id)
    .eq('performer_id', resolvedPerformerId)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (!confirmedSub) {
    return NextResponse.json({ error: 'Performer is not on the confirmed list for this session' }, { status: 403 })
  }

  // Check already signed in
  const { data: existing } = await supabaseAdmin
    .from('performer_signins')
    .select('id, signed_in_at')
    .eq('session_id', session.id)
    .eq('performer_user_id', resolvedPerformerId)
    .single()

  if (existing) {
    return NextResponse.json({ alreadySignedIn: true, signed_in_at: existing.signed_in_at })
  }

  const { data: signin, error } = await supabaseAdmin
    .from('performer_signins')
    .insert({
      session_id: session.id,
      performer_user_id: resolvedPerformerId,
      method: 'qr',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch name for confirmation
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('email, raw_user_meta_data')
    .eq('id', resolvedPerformerId)
    .single()

  const name = (userData as any)?.raw_user_meta_data?.full_name || (userData as any)?.email?.split('@')[0] || 'Performer'

  return NextResponse.json({ success: true, name, signed_in_at: signin.signed_in_at })
}
