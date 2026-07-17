import { supabaseAdmin } from '@/utils/supabase/admin'
import { sendEmail } from '@/lib/email'

export async function sendMessage({
  senderType,
  senderId,
  senderName,
  recipientType,
  recipientId,
  subject,
  body,
  messageType = 'general',
  priority = 'normal',
  actionUrl,
  actionLabel,
  relatedId,
  sendEmailNotification = false,
  recipientEmail,
  metadata,
}: {
  senderType: string
  senderId?: string
  senderName: string
  recipientType: string
  recipientId?: string
  subject: string
  body: string
  messageType?: string
  priority?: string
  actionUrl?: string
  actionLabel?: string
  relatedId?: string
  sendEmailNotification?: boolean
  recipientEmail?: string
  metadata?: any
}) {
  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      recipient_type: recipientType,
      recipient_id: recipientId,
      subject,
      body,
      message_type: messageType,
      priority,
      action_url: actionUrl,
      action_label: actionLabel,
      related_id: relatedId,
      metadata,
      email_to: recipientEmail,
    })
    .select()
    .single()

  if (error) {
    console.error('Message send error:', error)
    return null
  }

  if (sendEmailNotification && recipientEmail) {
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject,
      html: buildMessageEmailHtml({ subject, body, senderName, actionUrl, actionLabel, priority }),
    })

    if (emailResult.success) {
      await supabaseAdmin
        .from('messages')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', message.id)
    }
  }

  return message
}

export async function broadcastMessage({
  senderName,
  recipientType,
  subject,
  body,
  messageType = 'announcement',
  priority = 'normal',
  actionUrl,
  actionLabel,
  sendEmailNotification = false,
}: {
  senderName: string
  recipientType: 'all_performers' | 'all_agents' | 'all_casting_directors' | 'all_users'
  subject: string
  body: string
  messageType?: string
  priority?: string
  actionUrl?: string
  actionLabel?: string
  sendEmailNotification?: boolean
}) {
  const { data: message } = await supabaseAdmin
    .from('messages')
    .insert({
      sender_type: 'admin',
      sender_name: senderName,
      recipient_type: recipientType,
      subject,
      body,
      message_type: messageType,
      priority,
      action_url: actionUrl,
      action_label: actionLabel,
    })
    .select()
    .single()

  if (sendEmailNotification) {
    let users: any[] = []

    if (recipientType === 'all_performers' || recipientType === 'all_users') {
      const { data } = await supabaseAdmin.from('users').select('email, name').not('email', 'is', null)
      users = [...users, ...(data || [])]
    }

    if (recipientType === 'all_agents' || recipientType === 'all_users') {
      const { data } = await supabaseAdmin.from('agent_accounts').select('email, name').eq('is_active', true)
      users = [...users, ...(data || [])]
    }

    if (recipientType === 'all_casting_directors' || recipientType === 'all_users') {
      const { data } = await supabaseAdmin.from('casting_directors').select('email, name').eq('is_active', true)
      users = [...users, ...(data || [])]
    }

    const batchSize = 50
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      await Promise.all(
        batch.map(user =>
          sendEmail({
            to: user.email,
            subject,
            html: buildMessageEmailHtml({ subject, body, senderName, actionUrl, actionLabel, priority }),
          })
        )
      )
      if (i + batchSize < users.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    await supabaseAdmin
      .from('messages')
      .update({ email_sent: true, email_sent_at: new Date().toISOString(), metadata: { email_count: users.length } })
      .eq('id', message?.id)
  }

  return message
}

export async function replyToMessage({
  parentMessageId,
  senderType,
  senderId,
  senderName,
  body,
  recipientType,
  recipientId,
  recipientEmail,
  sendEmailNotification = false,
}: {
  parentMessageId: string
  senderType: string
  senderId: string
  senderName: string
  body: string
  recipientType: string
  recipientId: string
  recipientEmail?: string
  sendEmailNotification?: boolean
}) {
  const { data: parent } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('id', parentMessageId)
    .single()

  if (!parent) return null

  const threadId = parent.thread_id || parent.id

  const { data: reply } = await supabaseAdmin
    .from('messages')
    .insert({
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      recipient_type: recipientType,
      recipient_id: recipientId || null,
      subject: `Re: ${parent.subject}`,
      body,
      message_type: parent.message_type,
      parent_message_id: parentMessageId,
      thread_id: threadId,
      is_reply: true,
      email_to: recipientEmail,
    })
    .select()
    .single()

  await supabaseAdmin
    .from('messages')
    .update({ reply_count: (parent.reply_count || 0) + 1 })
    .eq('id', parentMessageId)

  if (sendEmailNotification && recipientEmail) {
    await sendEmail({
      to: recipientEmail,
      subject: `Re: ${parent.subject}`,
      html: buildMessageEmailHtml({
        subject: `Re: ${parent.subject}`,
        body,
        senderName,
        actionUrl: '/messages',
        actionLabel: 'View Reply',
        priority: 'normal',
      }),
    })
  }

  return reply
}

export function buildMessageEmailHtml({
  subject,
  body,
  senderName,
  actionUrl,
  actionLabel,
  priority,
}: {
  subject: string
  body: string
  senderName: string
  actionUrl?: string
  actionLabel?: string
  priority?: string
}) {
  const priorityBanner =
    priority === 'urgent'
      ? `<tr><td style="background:#DC2626;padding:8px 32px;font-size:12px;color:white;font-weight:700;letter-spacing:0.1em;">🚨 URGENT MESSAGE</td></tr>`
      : priority === 'high'
      ? `<tr><td style="background:#F59E0B;padding:8px 32px;font-size:12px;color:#1a1a2e;font-weight:700;letter-spacing:0.1em;">⚡ IMPORTANT MESSAGE</td></tr>`
      : ''

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#1a1a2e;padding:24px 32px;">
              <div style="width:40px;height:40px;background:#F59E0B;border-radius:50%;display:inline-block;text-align:center;line-height:40px;font-weight:900;font-size:15px;color:#1a1a2e;vertical-align:middle;">BG</div>
              <span style="color:white;font-size:20px;font-weight:700;vertical-align:middle;margin-left:10px;">BGReady</span>
            </td>
          </tr>
          ${priorityBanner}
          <tr><td style="background:#F59E0B;height:4px;"></td></tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:13px;color:#9ca3af;margin:0 0 8px;">Message from ${senderName}</p>
              <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 24px;font-family:Georgia,serif;line-height:1.3;">${subject}</h1>
              <div style="font-size:15px;color:#374151;line-height:1.7;white-space:pre-wrap;">${body}</div>
              ${
                actionUrl
                  ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td>
                    <a href="${actionUrl}" style="display:inline-block;background:#F59E0B;color:#1a1a2e;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
                      ${actionLabel || 'View Details'}
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
              BGReady — Canada's Background Performer Platform<br/>
              <a href="https://www.bgready.site" style="color:#F59E0B;text-decoration:none;">bgready.site</a>
              &nbsp;·&nbsp;
              <a href="mailto:support@setready.site" style="color:#9ca3af;text-decoration:none;">support@setready.site</a>
              <br/><br/>
              <span style="font-size:11px;color:#d1d5db;">You received this because you have a BGReady account.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
