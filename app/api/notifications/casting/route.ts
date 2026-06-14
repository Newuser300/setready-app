import { NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('casting_notifications')
    .select('id, type, title, message, is_read, created_at, action_url')
    .eq('recipient_type', 'performer')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json(data || [])
}

export async function PATCH() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin
    .from('casting_notifications')
    .update({ is_read: true })
    .eq('recipient_type', 'performer')
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  return NextResponse.json({ success: true })
}
