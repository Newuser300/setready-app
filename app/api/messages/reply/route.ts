import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/isAdmin'
import { replyToMessage } from '@/lib/messages'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { parentMessageId, body: replyBody, recipientType, recipientId } = body

  if (!parentMessageId || !replyBody?.trim()) {
    return NextResponse.json({ error: 'parentMessageId and body required' }, { status: 400 })
  }

  const { data: parent } = await supabaseAdmin
    .from('messages')
    .select('id, recipient_id, recipient_type, sender_type, sender_id, subject')
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
  const senderEmail = userData?.email || user.email || 'no email on file'

  // If replying to a system/admin message, route to admin so it does not dead-letter
  const isToAdmin = parent.sender_type === 'system' || parent.sender_type === 'admin'
  const finalRecipientType = isToAdmin ? 'admin' : (recipientType || parent.sender_type || 'admin')
  const finalRecipientId = isToAdmin ? '' : (recipientId || parent.sender_id || '')

  const reply = await replyToMessage({
    parentMessageId,
    senderType: 'performer',
    senderId: user.id,
    senderName,
    body: replyBody.trim(),
    recipientType: finalRecipientType,
    recipientId: finalRecipientId,
  })

  if (!reply) return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })

  // Email the admin when the reply is directed to admin
  if (isToAdmin) {
    const adminEmail = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)[0] || null
    if (adminEmail) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `Performer reply from ${senderName}`,
          html: `<p>A performer replied to "${parent.subject || 'a message'}".</p>
<p><strong>From:</strong> ${senderName} (${senderEmail})</p>
<p><strong>Message:</strong></p>
<p style="white-space:pre-wrap;border-left:3px solid #F59E0B;padding-left:12px;">${replyBody.trim().replace(/</g, '&lt;')}</p>
<p style="color:#888;font-size:12px;">Reply directly to ${senderEmail} to respond.</p>`,
        })
      } catch {
        // email failure should not block the reply
      }
    }
  }

  return NextResponse.json({ success: true, reply })
}
