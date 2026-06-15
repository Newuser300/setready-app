import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('casting_shortlists')
    .select(`
      id,
      performer_id,
      notes,
      created_at,
      performer_profiles:performer_id (
        headshot_url, union_status, union_priority, gender, height_cm
      ),
      users:performer_id (
        email, raw_user_meta_data
      )
    `)
    .eq('request_id', requestId)
    .eq('casting_director_id', session.accountId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, performerId, notes } = await req.json()
  if (!requestId || !performerId) return NextResponse.json({ error: 'requestId and performerId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('casting_shortlists')
    .upsert({
      casting_director_id: session.accountId,
      request_id: requestId,
      performer_id: performerId,
      notes: notes || null,
    }, { onConflict: 'request_id,performer_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, performerId } = await req.json()

  const { error } = await supabaseAdmin
    .from('casting_shortlists')
    .delete()
    .eq('request_id', requestId)
    .eq('performer_id', performerId)
    .eq('casting_director_id', session.accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
