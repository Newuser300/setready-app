import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

// GET ?token= → validate, return prefilled data + agency name
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: claim, error } = await supabaseAdmin
    .from('performer_claims')
    .select('invited_email, prefilled_data, expires_at, agency_id')
    .eq('token', token)
    .eq('is_used', false)
    .single()

  if (error || !claim) {
    return NextResponse.json(
      { error: 'This invite link is invalid or has already been used.' },
      { status: 404 }
    )
  }

  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This invite link has expired. Please contact your agency to send a new one.' },
      { status: 410 }
    )
  }

  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('name')
    .eq('id', claim.agency_id)
    .single()

  return NextResponse.json({
    invited_email: claim.invited_email,
    prefilled_data: claim.prefilled_data || {},
    agency_name: agency?.name || 'Your Agency',
  })
}

// POST — create account + performer_profiles + roster link + mark claim used
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { token, password, ...fields } = body as Record<string, unknown>

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  if (!password || String(password).length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  // Re-validate token
  const { data: claim, error: claimErr } = await supabaseAdmin
    .from('performer_claims')
    .select('invited_email, prefilled_data, expires_at, agency_id, invited_by')
    .eq('token', String(token))
    .eq('is_used', false)
    .single()

  if (claimErr || !claim) {
    return NextResponse.json(
      { error: 'This invite link is invalid or has already been used.' },
      { status: 404 }
    )
  }

  if (new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired.' }, { status: 410 })
  }

  const email: string = claim.invited_email
  const pf = (claim.prefilled_data || {}) as Record<string, unknown>

  const firstName = String(fields.first_name || pf.first_name || '')
  const lastName  = String(fields.last_name  || pf.last_name  || '')
  const fullName  = [firstName, lastName].filter(Boolean).join(' ')

  // Create auth user — email_confirm:true because they proved email by clicking the invite link
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

  function toArray(v: unknown): string[] {
    if (Array.isArray(v)) return (v as string[]).filter(Boolean)
    if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean)
    return []
  }

  const skillsArray   = toArray(fields.special_skills ?? pf.special_skills)
  const languagesArr  = toArray(fields.languages)
  const accentsArr    = toArray(fields.accents)

  const province = String(fields.province || '').trim() || null

  const [usersRes, profileRes] = await Promise.all([
    supabaseAdmin.from('users').upsert(
      { id: userId, email, name: fullName, subscription_status: 'inactive', province },
      { onConflict: 'id' }
    ),
    supabaseAdmin.from('performer_profiles').upsert(
      {
        user_id:          userId,
        phone:            fields.phone            || pf.phone            || null,
        gender:           fields.gender           || pf.gender           || null,
        date_of_birth:    fields.date_of_birth    || pf.date_of_birth    || null,
        height_cm:        fields.height_cm != null
                            ? Number(fields.height_cm)
                            : pf.height_cm != null ? Number(pf.height_cm) : null,
        hair_color:       fields.hair_color       || pf.hair_color       || null,
        eye_color:        fields.eye_color        || pf.eye_color        || null,
        body_type:        fields.body_type                               || null,
        ethnicity:        fields.ethnicity                               || null,
        union_status:     fields.union_status     || pf.union_status     || null,
        bio:              fields.bio                                     || null,
        acting_experience: fields.acting_experience                      || null,
        special_skills:   skillsArray.length  > 0 ? skillsArray  : null,
        languages:        languagesArr.length > 0 ? languagesArr : null,
        accents:          accentsArr.length   > 0 ? accentsArr   : null,
        is_public:        true,   // consent granted — performer confirmed their profile
        updated_at:       new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    ),
  ])

  if (usersRes.error)  console.error('[claim] users:', usersRes.error.message)
  if (profileRes.error) console.error('[claim] profiles:', profileRes.error.message)

  // Link to agency roster
  const { error: rosterErr } = await supabaseAdmin.from('agency_roster').insert({
    agency_id:    claim.agency_id,
    user_id:      userId,
    status:       'active',
    invite_status: 'claimed',
    invited_email: email,
    added_by:     claim.invited_by,
  })
  if (rosterErr && !rosterErr.message.includes('duplicate')) {
    console.error('[claim] roster:', rosterErr.message)
  }

  // Mark claim used
  await supabaseAdmin
    .from('performer_claims')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('token', String(token))

  return NextResponse.json({ success: true, email })
}
