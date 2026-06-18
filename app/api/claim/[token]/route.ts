import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: invite, error } = await supabaseAdmin
    .from('roster_import_invites')
    .select('first_name, last_name, email, phone, gender, date_of_birth, height_cm, hair_color, eye_color, union_status, special_skills, agency_id, agencies(name)')
    .eq('claim_token', token)
    .eq('is_claimed', false)
    .single()

  if (error || !invite) {
    return NextResponse.json(
      { error: 'This invite link is invalid or has already been used.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    invite: {
      ...invite,
      agency_name: (invite as any).agencies?.name || 'Your Agency',
    },
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    password,
    first_name, last_name,
    phone, gender, date_of_birth,
    height_cm, hair_color, eye_color,
    union_status, special_skills,
    bio,
  } = body as Record<string, string | number | string[] | null | undefined>

  if (!password || String(password).length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  // Re-validate the token
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from('roster_import_invites')
    .select('*')
    .eq('claim_token', token)
    .eq('is_claimed', false)
    .single()

  if (inviteErr || !invite) {
    return NextResponse.json(
      { error: 'This invite link is invalid or has already been used.' },
      { status: 404 }
    )
  }

  const email: string = invite.email
  const fullName = [
    String(first_name || invite.first_name || ''),
    String(last_name || invite.last_name || ''),
  ].filter(Boolean).join(' ')

  // Create Supabase Auth user — email_confirm: true skips verification since
  // the performer's email was confirmed when they clicked the invite link
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: String(password),
    email_confirm: true,
    user_metadata: { name: fullName },
  })

  if (authErr || !authData.user) {
    const msg = authErr?.message || ''
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: msg || 'Failed to create account' }, { status: 500 })
  }

  const userId = authData.user.id

  // Parse skills — invite stores comma-separated text, performer_profiles expects text[]
  const skillsArray: string[] = Array.isArray(special_skills)
    ? (special_skills as string[]).filter(Boolean)
    : invite.special_skills
      ? String(invite.special_skills).split(',').map((s: string) => s.trim()).filter(Boolean)
      : []

  const [usersRes, profileRes] = await Promise.all([
    supabaseAdmin.from('users').upsert(
      { id: userId, email, name: fullName, subscription_status: 'inactive' },
      { onConflict: 'id' }
    ),
    supabaseAdmin.from('performer_profiles').upsert(
      {
        user_id: userId,
        phone: phone || invite.phone || null,
        gender: gender || invite.gender || null,
        date_of_birth: date_of_birth || invite.date_of_birth || null,
        height_cm: height_cm != null ? Number(height_cm) : (invite.height_cm ?? null),
        hair_color: hair_color || invite.hair_color || null,
        eye_color: eye_color || invite.eye_color || null,
        union_status: union_status || invite.union_status || null,
        special_skills: skillsArray.length > 0 ? skillsArray : null,
        bio: bio || null,
        is_public: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    ),
  ])

  if (usersRes.error) console.error('[claim] users upsert:', usersRes.error.message)
  if (profileRes.error) console.error('[claim] performer_profiles upsert:', profileRes.error.message)

  // Add to agency_roster (ignore if duplicate constraint fires)
  const { error: rosterErr } = await supabaseAdmin.from('agency_roster').insert({
    agency_id: invite.agency_id,
    user_id: userId,
    status: 'active',
    added_by: invite.agent_account_id,
  })
  if (rosterErr && !rosterErr.message.includes('duplicate')) {
    console.error('[claim] agency_roster insert:', rosterErr.message)
  }

  // Mark invite as claimed
  await supabaseAdmin
    .from('roster_import_invites')
    .update({ is_claimed: true, claimed_at: new Date().toISOString(), status: 'active', user_id: userId })
    .eq('claim_token', token)

  return NextResponse.json({ success: true, email })
}
