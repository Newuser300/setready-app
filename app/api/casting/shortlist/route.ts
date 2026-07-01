import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

  const { data: rows, error } = await supabaseAdmin
    .from('casting_shortlists')
    .select('id, performer_id, notes, created_at')
    .eq('request_id', requestId)
    .eq('casting_director_id', session.accountId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result: any[] = []
  if (rows && rows.length > 0) {
    const perfIds = [...new Set(rows.map((r: any) => r.performer_id))]
    const [{ data: userRows }, { data: profileRows }] = await Promise.all([
      supabaseAdmin.from('users').select('id, email, name').in('id', perfIds as string[]),
      supabaseAdmin.from('performer_profiles').select('user_id, headshot_url, union_status, union_priority, gender, height_cm').in('user_id', perfIds as string[]),
    ])
    const usersMap: Record<string, any> = {}
    const profilesMap: Record<string, any> = {}
    ;(userRows || []).forEach((u: any) => {
      usersMap[u.id] = { id: u.id, email: u.email, raw_user_meta_data: { full_name: u.name || '' } }
    })
    ;(profileRows || []).forEach((pr: any) => { profilesMap[pr.user_id] = pr })
    result = rows.map((r: any) => ({
      ...r,
      users: usersMap[r.performer_id] || null,
      performer_profiles: profilesMap[r.performer_id] || null,
    }))
  } else {
    result = rows || []
  }

  return NextResponse.json(result)
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
