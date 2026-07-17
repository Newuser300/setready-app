import { NextRequest, NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'
import { sendMessage, buildMessageEmailHtml } from '@/lib/messages'
import { sendEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')
  const unreadOnly = searchParams.get('unread') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 30
  const offset = (page - 1) * limit

  // Direct messages to this agent
  let directQuery = supabaseAdmin
    .from('messages')
    .select('*')
    .eq('recipient_type', 'agent')
    .eq('recipient_id', session.accountId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (typeFilter) directQuery = directQuery.eq('message_type', typeFilter)
  if (unreadOnly) directQuery = directQuery.eq('is_read', false)

  // Broadcast messages for agents
  let broadcastQuery = supabaseAdmin
    .from('messages')
    .select('*')
    .in('recipient_type', ['all_agents', 'all_users'])
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (typeFilter) broadcastQuery = broadcastQuery.eq('message_type', typeFilter)

  const [{ data: directMsgs }, { data: broadcastMsgs }, { data: readReceipts }] = await Promise.all([
    directQuery,
    broadcastQuery,
    supabaseAdmin
      .from('message_read_receipts')
      .select('message_id')
      .eq('reader_id', session.accountId),
  ])

  const readReceiptIds = new Set((readReceipts || []).map((r: any) => r.message_id))

  const allMessages = [
    ...(directMsgs || []),
    ...(broadcastMsgs || []).map((m: any) => ({
      ...m,
      is_read: readReceiptIds.has(m.id),
    })),
  ]

  const seen = new Set<string>()
  const deduplicated = allMessages.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })

  deduplicated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filtered = unreadOnly ? deduplicated.filter(m => !m.is_read) : deduplicated
  const paginated = filtered.slice(offset, offset + limit)
  const unreadCount = deduplicated.filter(m => !m.is_read).length

  return NextResponse.json({ messages: paginated, unread_count: unreadCount, total: filtered.length })
}

export async function POST(request: NextRequest) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: setting } = await supabaseAdmin
    .from('admin_settings')
    .select('value')
    .eq('key', 'agents_can_message')
    .maybeSingle()

  if (setting?.value === 'false') {
    return NextResponse.json({ error: 'Messaging is currently restricted by the platform administrator.' }, { status: 403 })
  }

  const body = await request.json()
  const { recipientType, recipientId, recipientEmail, subject, messageBody } = body

  if (!subject?.trim() || !messageBody?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  // Auto-look-up performer email when not provided by client
  let resolvedEmail: string | undefined = recipientEmail || undefined
  if (!resolvedEmail && recipientType === 'performer' && recipientId) {
    const { data: user } = await supabaseAdmin.from('users').select('email').eq('id', recipientId).single()
    resolvedEmail = user?.email ?? undefined
  }

  const message = await sendMessage({
    senderType: 'agent',
    senderId: session.accountId,
    senderName: session.name,
    recipientType: recipientType || 'performer',
    recipientId: recipientId || undefined,
    subject: subject.trim(),
    body: messageBody.trim(),
    messageType: 'general',
    sendEmailNotification: false, // handled below with custom body
  })

  if (!message) return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })

  // Email notification with "reply in BGReady" instruction — fire and forget
  if (resolvedEmail) {
    const emailBody = `${messageBody.trim()}\n\n---\nPlease reply to this message through BGReady, not by replying to this email.`
    sendEmail({
      to: resolvedEmail,
      subject: subject.trim(),
      html: buildMessageEmailHtml({
        subject: subject.trim(),
        body: emailBody,
        senderName: session.name,
        actionUrl: 'https://www.bgready.site/messages',
        actionLabel: 'Reply in BGReady →',
      }),
    }).catch((e: Error) => console.error('[agent/messages] email notification failed:', e))
  }

  return NextResponse.json({ success: true, message })
}

export async function PATCH(request: NextRequest) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (body.messageId) {
    const { data: msg } = await supabaseAdmin
      .from('messages')
      .select('id, recipient_type, recipient_id')
      .eq('id', body.messageId)
      .single()

    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isBroadcast = ['all_agents', 'all_users'].includes(msg.recipient_type)

    if (isBroadcast) {
      await supabaseAdmin.from('message_read_receipts').upsert(
        { message_id: body.messageId, reader_id: session.accountId, reader_type: 'agent' },
        { onConflict: 'message_id,reader_id' }
      )
    } else {
      await supabaseAdmin
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', body.messageId)
        .eq('recipient_id', session.accountId)
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })

  await supabaseAdmin
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', body.messageId)
    .eq('recipient_id', session.accountId)
    .eq('recipient_type', 'agent')

  return NextResponse.json({ success: true })
}
