import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/casting-auth'

export async function POST(req: Request) {
  const { token, performerId, performerName } = await req.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { data: session } = await supabaseAdmin
    .from('production_signin_sessions')
    .select('id, is_active, expires_at')
    .eq('qr_token', token)
    .single()

  if (!session) return NextResponse.json({ error: 'Invalid sign-in code' }, { status: 404 })
  if (!session.is_active) return NextResponse.json({ error: 'Sign-in session is closed' }, { status: 400 })
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Sign-in session has expired' }, { status: 400 })
  }

  let resolvedPerformerId = performerId

  // If no ID provided but a name/email search was done, look up
  if (!resolvedPerformerId && performerName) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`email.ilike.%${performerName}%,raw_user_meta_data->>full_name.ilike.%${performerName}%`)
      .limit(1)
      .single()
    resolvedPerformerId = user?.id
  }

  if (!resolvedPerformerId) {
    return NextResponse.json({ error: 'Performer not found' }, { status: 404 })
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
