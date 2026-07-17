import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'
import { sendMessage, broadcastMessage } from '@/lib/messages'

export async function GET(request: NextRequest) {
  const admin = await verifyAdminRequest(request)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'sent'

  if (view === 'sent') {
    const { data } = await supabaseAdmin
      .from('messages')
      .select('*')
      .in('sender_type', ['admin', 'system'])
      .order('created_at', { ascending: false })
      .limit(100)

    return NextResponse.json({ messages: data || [] })
  }

  if (view === 'all') {
    const typeFilter = searchParams.get('type')
    const recipientFilter = searchParams.get('recipient_type')
    const readFilter = searchParams.get('read')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    let query = supabaseAdmin
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (typeFilter) query = query.eq('message_type', typeFilter)
    if (recipientFilter) query = query.eq('recipient_type', recipientFilter)
    if (readFilter === 'true') query = query.eq('is_read', true)
    if (readFilter === 'false') query = query.eq('is_read', false)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data } = await query
    return NextResponse.json({ messages: data || [] })
  }

  if (view === 'stats') {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: totalMessages },
      { count: weekMessages },
      { data: emailData },
      { data: readData },
      { data: typeData },
    ] = await Promise.all([
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabaseAdmin.from('messages').select('email_sent').not('email_to', 'is', null),
      supabaseAdmin.from('messages').select('is_read').eq('is_deleted', false),
      supabaseAdmin.from('messages').select('message_type').order('created_at', { ascending: false }).limit(500),
    ])

    const emailSent = (emailData || []).filter((m: any) => m.email_sent).length
    const emailTotal = (emailData || []).length
    const emailRate = emailTotal > 0 ? Math.round((emailSent / emailTotal) * 100) : 0

    const readCount = (readData || []).filter((m: any) => m.is_read).length
    const readTotal = (readData || []).length
    const readRate = readTotal > 0 ? Math.round((readCount / readTotal) * 100) : 0

    const typeCounts: Record<string, number> = {}
    ;(typeData || []).forEach((m: any) => {
      typeCounts[m.message_type] = (typeCounts[m.message_type] || 0) + 1
    })
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general'

    // Daily messages over last 30 days
    const { data: dailyData } = await supabaseAdmin
      .from('messages')
      .select('created_at')
      .gte('created_at', monthAgo)
      .order('created_at', { ascending: true })

    const dailyCounts: Record<string, number> = {}
    ;(dailyData || []).forEach((m: any) => {
      const day = m.created_at.slice(0, 10)
      dailyCounts[day] = (dailyCounts[day] || 0) + 1
    })

    return NextResponse.json({
      totalMessages: totalMessages || 0,
      weekMessages: weekMessages || 0,
      emailDeliveryRate: emailRate,
      averageReadRate: readRate,
      topMessageType: topType,
      dailyCounts,
    })
  }

  return NextResponse.json({ error: 'Invalid view' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminRequest(request)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const {
    recipientType,
    recipientIds,
    subject,
    body: msgBody,
    messageType = 'general',
    priority = 'normal',
    actionUrl,
    actionLabel,
    sendEmail: doSendEmail = false,
  } = body

  if (!subject?.trim() || !msgBody?.trim()) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  const broadcastTypes = ['all_performers', 'all_agents', 'all_casting_directors', 'all_users']

  if (broadcastTypes.includes(recipientType)) {
    const message = await broadcastMessage({
      senderName: 'BGReady Admin',
      recipientType,
      subject,
      body: msgBody,
      messageType,
      priority,
      actionUrl: actionUrl || undefined,
      actionLabel: actionLabel || undefined,
      sendEmailNotification: doSendEmail,
    })
    return NextResponse.json({ success: true, message, count: 1, emailCount: doSendEmail ? 1 : 0 })
  }

  // Specific recipients
  if (!recipientIds?.length) {
    return NextResponse.json({ error: 'No recipients specified' }, { status: 400 })
  }

  // Look up each recipient's email and type
  const results = []
  let emailCount = 0

  for (const recipient of recipientIds) {
    const { id: recipientId, type: rType, email: recipientEmail } = recipient

    const message = await sendMessage({
      senderType: 'admin',
      senderName: 'BGReady Admin',
      recipientType: rType || 'performer',
      recipientId,
      subject,
      body: msgBody,
      messageType,
      priority,
      actionUrl: actionUrl || undefined,
      actionLabel: actionLabel || undefined,
      sendEmailNotification: doSendEmail && !!recipientEmail,
      recipientEmail: recipientEmail || undefined,
    })

    if (message) {
      results.push(message)
      if (doSendEmail && recipientEmail) emailCount++
    }
  }

  return NextResponse.json({ success: true, count: results.length, emailCount })
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdminRequest(request)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  if (!body.messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })

  await supabaseAdmin.from('messages').update({ is_deleted: true }).eq('id', body.messageId)

  return NextResponse.json({ success: true })
}
