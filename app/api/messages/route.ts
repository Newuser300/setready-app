import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/isAdmin'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')
  const unreadOnly = searchParams.get('unread') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 30
  const offset = (page - 1) * limit

  // Fetch direct messages to this user
  let directQuery = supabaseAdmin
    .from('messages')
    .select('*')
    .eq('recipient_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (typeFilter) directQuery = directQuery.eq('message_type', typeFilter)
  if (unreadOnly) directQuery = directQuery.eq('is_read', false)

  // Fetch broadcast messages (all_performers, all_users)
  let broadcastQuery = supabaseAdmin
    .from('messages')
    .select('*')
    .in('recipient_type', ['all_performers', 'all_users'])
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (typeFilter) broadcastQuery = broadcastQuery.eq('message_type', typeFilter)

  const [{ data: directMsgs }, { data: broadcastMsgs }, { data: readReceipts }] = await Promise.all([
    directQuery,
    broadcastQuery,
    supabaseAdmin
      .from('message_read_receipts')
      .select('message_id')
      .eq('reader_id', user.id),
  ])

  const readReceiptIds = new Set((readReceipts || []).map((r: any) => r.message_id))

  // Merge: for broadcast messages, derive is_read from read receipts
  const allMessages = [
    ...(directMsgs || []),
    ...(broadcastMsgs || []).map((m: any) => ({
      ...m,
      is_read: readReceiptIds.has(m.id),
    })),
  ]

  // Deduplicate by id (in case a broadcast was also sent directly)
  const seen = new Set<string>()
  const deduplicated = allMessages.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })

  // Sort by created_at desc
  deduplicated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Apply unread filter after merge for broadcasts
  const filtered = unreadOnly ? deduplicated.filter(m => !m.is_read) : deduplicated

  const paginated = filtered.slice(offset, offset + limit)
  const unreadCount = deduplicated.filter(m => !m.is_read).length

  return NextResponse.json({ messages: paginated, unread_count: unreadCount, total: filtered.length })
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (body.all) {
    // Mark all direct messages as read
    await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    // For broadcasts: get all unread broadcast IDs and insert read receipts
    const { data: broadcasts } = await supabaseAdmin
      .from('messages')
      .select('id')
      .in('recipient_type', ['all_performers', 'all_users'])
      .eq('is_deleted', false)

    if (broadcasts?.length) {
      const { data: existing } = await supabaseAdmin
        .from('message_read_receipts')
        .select('message_id')
        .eq('reader_id', user.id)

      const existingIds = new Set((existing || []).map((r: any) => r.message_id))
      const toInsert = broadcasts
        .filter(m => !existingIds.has(m.id))
        .map(m => ({ message_id: m.id, reader_id: user.id, reader_type: 'performer' }))

      if (toInsert.length) {
        await supabaseAdmin.from('message_read_receipts').insert(toInsert)
      }
    }

    return NextResponse.json({ success: true })
  }

  if (body.messageId) {
    // Check if this is a broadcast message
    const { data: msg } = await supabaseAdmin
      .from('messages')
      .select('id, recipient_type, recipient_id')
      .eq('id', body.messageId)
      .single()

    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isBroadcast = ['all_performers', 'all_users'].includes(msg.recipient_type)

    if (isBroadcast) {
      await supabaseAdmin.from('message_read_receipts').upsert(
        { message_id: body.messageId, reader_id: user.id, reader_type: 'performer' },
        { onConflict: 'message_id,reader_id' }
      )
    } else {
      if (msg.recipient_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      await supabaseAdmin
        .from('messages')
        .update({ is_read: true })
        .eq('id', body.messageId)
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Missing messageId or all flag' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })

  // Only allow deleting own direct messages
  const { data: msg } = await supabaseAdmin
    .from('messages')
    .select('id, recipient_id, recipient_type')
    .eq('id', body.messageId)
    .single()

  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isBroadcast = ['all_performers', 'all_users'].includes(msg.recipient_type)
  if (!isBroadcast && msg.recipient_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isBroadcast) {
    await supabaseAdmin
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', body.messageId)
  }

  return NextResponse.json({ success: true })
}
