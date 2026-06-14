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

  const url = new URL(req.url)
  const moduleIds = url.searchParams.get('moduleIds')

  let query = supabaseAdmin
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)

  if (moduleIds) {
    query = query.in('module_id', moduleIds.split(',').map(Number))
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
