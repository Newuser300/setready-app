import { NextRequest, NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'
import { replyToMessage, buildMessageEmailHtml } from '@/lib/messages'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { parentMessageId, body, performerId } = await request.json()

  if (!parentMessageId || !body?.trim() || !performerId) {
    return NextResponse.json({ error: 'parentMessageId, body, and performerId are required' }, { status: 400 })
  }

  // Look up performer email for the notification
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('id', performerId)
    .single()

  const reply = await replyToMessage({
    parentMessageId,
    senderType: 'agent',
    senderId: session.accountId,
    senderName: session.name,
    body: body.trim(),
    recipientType: 'performer',
    recipientId: performerId,
    sendEmailNotification: false,
  })

  if (!reply) return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })

  // Email notification — fire and forget so a send failure doesn't fail the in-app reply
  if (user?.email) {
    const emailBody = `${body.trim()}\n\n---\nPlease reply to this message through SetReady, not by replying to this email.`
    sendEmail({
      to: user.email,
      subject: reply.subject,
      html: buildMessageEmailHtml({
        subject: reply.subject,
        body: emailBody,
        senderName: session.name,
        actionUrl: 'https://www.setready.site/messages',
        actionLabel: 'Reply in SetReady →',
      }),
    }).catch((e: Error) => console.error('[agent/reply] email notification failed:', e))
  }

  return NextResponse.json({ success: true, reply })
}
