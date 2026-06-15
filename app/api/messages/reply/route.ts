import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/isAdmin'
import { replyToMessage } from '@/lib/messages'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { parentMessageId, body: replyBody, recipientType, recipientId } = body

  if (!parentMessageId || !replyBody?.trim()) {
    return NextResponse.json({ error: 'parentMessageId and body required' }, { status: 400 })
  }

  // Verify the user actually received this message
  const { data: parent } = await supabaseAdmin
    .from('messages')
    .select('id, recipient_id, recipient_type, sender_type, sender_id')
    .eq('id', parentMessageId)
    .single()

  if (!parent) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  const isBroadcast = ['all_performers', 'all_users'].includes(parent.recipient_type)
  if (!isBroadcast && parent.recipient_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single()

  const senderName = userData?.name || userData?.email || 'Performer'

  const reply = await replyToMessage({
    parentMessageId,
    senderType: 'performer',
    senderId: user.id,
    senderName,
    body: replyBody.trim(),
    recipientType: recipientType || parent.sender_type || 'admin',
    recipientId: recipientId || parent.sender_id || '',
  })

  if (!reply) return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })

  return NextResponse.json({ success: true, reply })
}
