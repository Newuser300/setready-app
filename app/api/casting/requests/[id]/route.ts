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

  // Fetch all submissions with performer data
  const { data: submissions } = await supabaseAdmin
    .from('casting_submissions')
    .select(`
      id,
      status,
      notes,
      submitted_at,
      performer_id,
      agency_id,
      performer_profiles:performer_id (
        headshot_url,
        union_status,
        height_cm,
        hair_color,
        eye_color,
        gender,
        age_min,
        special_skills
      ),
      users:performer_id (
        id,
        email,
        raw_user_meta_data
      ),
      agencies:agency_id (
        id,
        name
      )
    `)
    .eq('casting_request_id', id)
    .order('submitted_at', { ascending: true })

  return NextResponse.json({ ...request, submissions: submissions || [] })
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
