import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/isAdmin'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const messageId = searchParams.get('messageId')
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const { data: msg } = await supabaseAdmin
    .from('messages')
    .select('id, thread_id')
    .eq('id', messageId)
    .single()

  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const threadId = msg.thread_id || msg.id

  const { data: thread } = await supabaseAdmin
    .from('messages')
    .select('*')
    .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  // Only return messages this user can see
  const visible = (thread || []).filter((m: any) =>
    m.recipient_id === user.id ||
    ['all_performers', 'all_users'].includes(m.recipient_type) ||
    m.sender_id === user.id
  )

  return NextResponse.json({ thread: visible })
}
