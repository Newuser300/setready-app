import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/isAdmin'

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  return error ? null : user
}

export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('work_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('work_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, user_id: _uid, ...rest } = body

  let result
  if (id) {
    result = await supabaseAdmin
      .from('work_logs')
      .update(rest)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
  } else {
    result = await supabaseAdmin
      .from('work_logs')
      .insert([{ ...rest, user_id: user.id }])
      .select()
      .single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function DELETE(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('work_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
