import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(req: NextRequest): Promise<{ ok: boolean; email?: string }> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return { ok: false }
  const token = auth.slice(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return { ok: false }
  const adminEmails = (process.env.ADMIN_EMAILS || 'mikebhangu@gmail.com').split(',').map(e => e.trim())
  if (adminEmails.includes(user.email || '')) return { ok: true, email: user.email }
  const { data } = await supabaseAdmin.from('admin_users').select('id').eq('email', user.email).maybeSingle()
  return { ok: !!data, email: user.email }
}

// GET — list exclusions OR search users
export async function GET(req: NextRequest) {
  const admin = await isAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')

  if (search) {
    // Search users by email or name
    const q = `%${search}%`
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .or(`email.ilike.${q},name.ilike.${q}`)
      .limit(10)
    return NextResponse.json({ users: users || [] })
  }

  // List current exclusions with user info
  const { data: excls } = await supabaseAdmin
    .from('casting_notification_exclusions')
    .select('id, user_id, reason, excluded_by, created_at')
    .order('created_at', { ascending: false })

  if (!excls?.length) return NextResponse.json([])

  const userIds = excls.map(e => e.user_id)
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .in('id', userIds)

  const userMap: Record<string, { email: string; name: string | null }> = {}
  ;(users || []).forEach((u: any) => { userMap[u.id] = { email: u.email, name: u.name } })

  const result = excls.map(e => ({
    ...e,
    user_email: userMap[e.user_id]?.email || null,
    user_name: userMap[e.user_id]?.name || null,
  }))

  return NextResponse.json(result)
}

// POST — add exclusion
export async function POST(req: NextRequest) {
  const admin = await isAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, reason } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('casting_notification_exclusions')
    .upsert({ user_id: userId, excluded_by: admin.email || 'admin', reason: reason || null }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove exclusion
export async function DELETE(req: NextRequest) {
  const admin = await isAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('casting_notification_exclusions')
    .delete()
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
