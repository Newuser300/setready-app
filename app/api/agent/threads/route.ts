import { NextRequest, NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(request: NextRequest) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const threadId = searchParams.get('threadId')

  if (threadId) {
    // Full thread: root message + all replies sharing the same thread_id
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('id, sender_type, sender_id, sender_name, recipient_type, recipient_id, subject, body, created_at, is_read, thread_id, is_reply, parent_message_id')
      .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const isParticipant = (messages || []).some(m =>
      (m.sender_type === 'agent' && m.sender_id === session.accountId) ||
      (m.recipient_type === 'agent' && m.recipient_id === session.accountId)
    )
    if (!isParticipant && (messages || []).length > 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark unread messages received by this agent as read
    const unreadIds = (messages || [])
      .filter(m => m.recipient_type === 'agent' && m.recipient_id === session.accountId && !m.is_read)
      .map(m => m.id)
    if (unreadIds.length > 0) {
      await supabaseAdmin
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)
    }

    return NextResponse.json({ messages: messages || [] })
  }

  // Conversation list: messages between this agent and performers
  const [{ data: sent }, { data: received }] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('id, sender_type, sender_id, sender_name, recipient_type, recipient_id, subject, body, created_at, is_read, thread_id, is_reply')
      .eq('sender_type', 'agent')
      .eq('sender_id', session.accountId)
      .eq('recipient_type', 'performer')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('messages')
      .select('id, sender_type, sender_id, sender_name, recipient_type, recipient_id, subject, body, created_at, is_read, thread_id, is_reply')
      .eq('recipient_type', 'agent')
      .eq('recipient_id', session.accountId)
      .eq('sender_type', 'performer')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
  ])

  const all = [...(sent || []), ...(received || [])]

  const performerIds = [...new Set(all.map(m =>
    m.sender_type === 'performer' ? m.sender_id : m.recipient_id
  ).filter(Boolean))]

  const [{ data: users }, { data: profiles }] = await Promise.all([
    performerIds.length > 0
      ? supabaseAdmin.from('users').select('id, email, name').in('id', performerIds)
      : Promise.resolve({ data: [] as any[] }),
    performerIds.length > 0
      ? supabaseAdmin.from('performer_profiles').select('user_id, headshot_url').in('user_id', performerIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const usersById = Object.fromEntries((users || []).map((u: any) => [u.id, u]))
  const profilesById = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]))

  // Group by thread key: thread_id for replies, message id for root messages
  const threadMap = new Map<string, any>()

  all.forEach(m => {
    const key = m.thread_id ?? m.id
    const performerId = m.sender_type === 'performer' ? m.sender_id : m.recipient_id
    const existing = threadMap.get(key)

    if (!existing) {
      const u = performerId ? usersById[performerId] : null
      threadMap.set(key, {
        threadId: key,
        performerId,
        performer: u ? { id: u.id, email: u.email, name: u.name, headshot_url: profilesById[performerId]?.headshot_url ?? null } : null,
        subject: m.is_reply ? m.subject.replace(/^Re:\s*/i, '') : m.subject,
        lastMessage: m,
        unread: m.recipient_type === 'agent' && m.recipient_id === session.accountId && !m.is_read,
      })
    } else {
      if (new Date(m.created_at) > new Date(existing.lastMessage.created_at)) {
        existing.lastMessage = m
      }
      if (m.recipient_type === 'agent' && m.recipient_id === session.accountId && !m.is_read) {
        existing.unread = true
      }
    }
  })

  const threads = [...threadMap.values()]
  threads.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime())

  return NextResponse.json({ threads })
}
