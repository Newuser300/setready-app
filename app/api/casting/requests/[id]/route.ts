import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: request, error } = await supabaseAdmin
    .from('casting_requests')
    .select('*')
    .eq('id', id)
    .eq('casting_director_id', session.accountId)
    .single()

  if (error || !request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch submissions — bare columns only; no FK embeds on casting_submissions
  const { data: submissions, error: subError } = await supabaseAdmin
    .from('casting_submissions')
    .select('id, status, notes, submitted_at, performer_id, agency_id')
    .eq('casting_request_id', id)
    .order('submitted_at', { ascending: true })

  if (subError) console.error('submissions fetch error:', subError.message)

  // Stitch performer_profiles, users, agencies separately (same pattern as performers route)
  let stitchedSubs: any[] = []
  if (submissions && submissions.length > 0) {
    const perfIds = [...new Set(submissions.map((s: any) => s.performer_id).filter(Boolean))]
    const agIds   = [...new Set(submissions.map((s: any) => s.agency_id).filter(Boolean))]

    const [{ data: profiles }, { data: userRows }, { data: agencyRows }] = await Promise.all([
      supabaseAdmin.from('performer_profiles')
        .select('user_id, headshot_url, union_status, union_priority, height_cm, hair_color, eye_color, gender, special_skills')
        .in('user_id', perfIds),
      supabaseAdmin.from('users').select('id, email, name').in('id', perfIds),
      agIds.length > 0
        ? supabaseAdmin.from('agencies').select('id, name').in('id', agIds)
        : Promise.resolve({ data: [] }),
    ])

    const profilesMap: Record<string, any> = {}
    const usersMap:    Record<string, any> = {}
    const agenciesMap: Record<string, any> = {}

    ;(profiles   || []).forEach((p: any) => { profilesMap[p.user_id] = p })
    ;(userRows   || []).forEach((u: any) => {
      usersMap[u.id] = { id: u.id, email: u.email, raw_user_meta_data: { full_name: u.name || '' } }
    })
    ;(agencyRows || []).forEach((a: any) => { agenciesMap[a.id] = a })

    stitchedSubs = submissions.map((s: any) => ({
      ...s,
      performer_profiles: s.performer_id ? (profilesMap[s.performer_id] || null) : null,
      users:              s.performer_id ? (usersMap[s.performer_id]    || null) : null,
      agencies:           s.agency_id    ? (agenciesMap[s.agency_id]   || null) : null,
    }))
  }

  return NextResponse.json({ ...request, submissions: stitchedSubs })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('casting_requests')
    .select('id')
    .eq('id', id)
    .eq('casting_director_id', session.accountId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['status', 'description', 'rate', 'wardrobe_notes', 'performers_needed', 'filled_count']
  const update: Record<string, unknown> = {}
  allowed.forEach(k => { if (body[k] !== undefined) update[k] = body[k] })
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('casting_requests')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
