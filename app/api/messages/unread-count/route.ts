import { NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/isAdmin'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ count: 0 })

  // Direct unread messages
  const { count: directCount } = await supabaseAdmin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
    .eq('is_deleted', false)

  // Broadcast messages not yet read by this user
  const { data: broadcasts } = await supabaseAdmin
    .from('messages')
    .select('id')
    .in('recipient_type', ['all_performers', 'all_users'])
    .eq('is_deleted', false)

  const broadcastIds = (broadcasts || []).map((m: any) => m.id)

  let broadcastUnread = 0
  if (broadcastIds.length > 0) {
    const { data: receipts } = await supabaseAdmin
      .from('message_read_receipts')
      .select('message_id')
      .eq('reader_id', user.id)
      .in('message_id', broadcastIds)

    const readIds = new Set((receipts || []).map((r: any) => r.message_id))
    broadcastUnread = broadcastIds.filter((id: string) => !readIds.has(id)).length
  }

  return NextResponse.json({ count: (directCount || 0) + broadcastUnread })
}
