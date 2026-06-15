import { createClient } from '@supabase/supabase-js'
import {
  sendEmail,
  castingRequestEmailHtml,
  submissionConfirmedEmailHtml,
  agentConfirmationEmailHtml,
} from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function writeMessages(records: any[]) {
  if (!records.length) return
  await supabaseAdmin.from('messages').insert(records)
}

// ── Single-recipient in-app notification ─────────────────────────────────────

export async function notify({
  recipientType,
  recipientId,
  type,
  title,
  message,
  actionUrl,
  relatedRequestId,
  relatedSubmissionId,
}: {
  recipientType: 'performer' | 'agent' | 'casting_director' | 'admin'
  recipientId: string
  type: string
  title: string
  message: string
  actionUrl?: string
  relatedRequestId?: string
  relatedSubmissionId?: string
}) {
  await supabaseAdmin.from('casting_notifications').insert({
    recipient_type: recipientType,
    recipient_id: recipientId,
    type,
    title,
    message,
    action_url: actionUrl,
    related_request_id: relatedRequestId,
    related_submission_id: relatedSubmissionId,
  })
}

// ── Notify all agents (in-app + optional email) ──────────────────────────────

export async function notifyAllAgents(
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  relatedRequestId?: string,
  castingRequestData?: any,
  sendEmailNotification = false
) {
  const { data: agents } = await supabaseAdmin
    .from('agent_accounts')
    .select('id, email, name, agency_id, agencies(name)')
    .eq('is_active', true)

  if (!agents?.length) return

  const notifications = agents.map(agent => ({
    recipient_type: 'agent' as const,
    recipient_id: agent.id,
    type,
    title,
    message,
    action_url: actionUrl,
    related_request_id: relatedRequestId,
  }))

  await supabaseAdmin.from('casting_notifications').insert(notifications)

  // Mirror to messages table
  await writeMessages(
    agents.map(agent => ({
      sender_type: 'system',
      sender_name: 'SetReady Casting',
      recipient_type: 'agent',
      recipient_id: agent.id,
      subject: title,
      body: message,
      message_type: 'casting_request',
      action_url: actionUrl,
      action_label: 'View Request',
      related_id: relatedRequestId || null,
    }))
  )

  if (sendEmailNotification && castingRequestData) {
    for (const agent of agents) {
      if (!agent.email) continue
      await sendEmail({
        to: agent.email,
        subject: `New Casting Request: ${castingRequestData.production_name}`,
        html: castingRequestEmailHtml({
          productionName: castingRequestData.production_name,
          shootDate: castingRequestData.shoot_date,
          location: castingRequestData.location,
          roleType: castingRequestData.role_type,
          sceneDescription: castingRequestData.description,
          rate: castingRequestData.rate,
          numberNeeded: castingRequestData.performers_needed,
          recipientName: agent.name || 'Agent',
          recipientType: 'agent',
        }),
      })
    }
  }
}

// ── Notify independent performers (in-app + optional email) ──────────────────

export async function notifyIndependentPerformers(
  castingRequestData: any,
  sendEmailToPerformers: boolean
) {
  const { data: setting } = await supabaseAdmin
    .from('admin_settings')
    .select('value')
    .eq('key', 'notify_independent_performers')
    .maybeSingle()

  if (setting?.value !== 'true') return

  const [{ data: rosterData }, { data: exclusionData }] = await Promise.all([
    supabaseAdmin.from('agency_roster').select('user_id').eq('status', 'active'),
    supabaseAdmin.from('casting_notification_exclusions').select('user_id'),
  ])

  const agencyIds = new Set((rosterData || []).map((r: any) => r.user_id))
  const excludedIds = new Set((exclusionData || []).map((e: any) => e.user_id))

  const { data: performers } = await supabaseAdmin
    .from('performer_profiles')
    .select('id')
    .eq('is_public', true)

  const independentIds = (performers || [])
    .map((p: any) => p.id)
    .filter((id: string) => !agencyIds.has(id) && !excludedIds.has(id))

  if (!independentIds.length) return

  // In-app notifications
  const notifications = independentIds.map((userId: string) => ({
    recipient_type: 'performer' as const,
    recipient_id: userId,
    type: 'new_casting_request',
    title: `New Casting: ${castingRequestData.production_name}`,
    message: `A casting request has been posted for ${castingRequestData.shoot_date}. As a self-represented performer, you may be contacted directly.`,
    action_url: '/casting-portal',
    related_request_id: castingRequestData.id,
  }))

  await supabaseAdmin.from('casting_notifications').insert(notifications)

  // Mirror to messages table
  await writeMessages(
    independentIds.map((userId: string) => ({
      sender_type: 'system',
      sender_name: 'SetReady Casting',
      recipient_type: 'performer',
      recipient_id: userId,
      subject: `New Casting: ${castingRequestData.production_name}`,
      body: `A casting request has been posted for ${castingRequestData.shoot_date}. As a self-represented performer, you may be contacted directly.`,
      message_type: 'casting_request',
      action_url: '/casting-portal',
      action_label: 'View Request',
      related_id: castingRequestData.id,
    }))
  )

  // Emails (only if enabled)
  if (!sendEmailToPerformers) return

  // Fetch user emails in one query
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .in('id', independentIds)

  for (const user of users || []) {
    if (!user.email) continue
    await sendEmail({
      to: user.email,
      subject: `New Casting Request: ${castingRequestData.production_name}`,
      html: castingRequestEmailHtml({
        productionName: castingRequestData.production_name,
        shootDate: castingRequestData.shoot_date,
        location: castingRequestData.location,
        roleType: castingRequestData.role_type,
        sceneDescription: castingRequestData.description,
        rate: castingRequestData.rate,
        numberNeeded: castingRequestData.performers_needed,
        recipientName: user.name || 'Performer',
        recipientType: 'performer',
      }),
    })
  }
}

// ── Notify agent when their performer is confirmed ───────────────────────────

export async function notifyAgentOfConfirmation(
  agentId: string,
  performerName: string,
  castingRequestData: any
) {
  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('email, name')
    .eq('id', agentId)
    .single()

  if (!agent) return

  await supabaseAdmin.from('casting_notifications').insert({
    recipient_type: 'agent',
    recipient_id: agentId,
    type: 'performer_confirmed',
    title: `${performerName} Confirmed`,
    message: `${performerName} has been confirmed for ${castingRequestData.production_name}`,
    action_url: '/agent/dashboard',
    related_request_id: castingRequestData.id,
  })

  // Mirror to messages table
  await writeMessages([{
    sender_type: 'system',
    sender_name: 'SetReady Casting',
    recipient_type: 'agent',
    recipient_id: agentId,
    subject: `${performerName} Confirmed`,
    body: `${performerName} has been confirmed for ${castingRequestData.production_name}.`,
    message_type: 'booking_confirmed',
    action_url: '/agent/dashboard',
    action_label: 'View Dashboard',
    related_id: castingRequestData.id,
  }])

  if (agent.email) {
    await sendEmail({
      to: agent.email,
      subject: `✅ ${performerName} confirmed for ${castingRequestData.production_name}`,
      html: agentConfirmationEmailHtml({
        agentName: agent.name || 'Agent',
        performerName,
        productionName: castingRequestData.production_name,
        shootDate: castingRequestData.shoot_date,
      }),
    })
  }
}

// ── Notify performer when confirmed ─────────────────────────────────────────

export async function notifyPerformerOfConfirmation(
  performerUserId: string,
  castingRequestData: any,
  agencyName: string
) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', performerUserId)
    .single()

  if (!user) return

  await supabaseAdmin.from('casting_notifications').insert({
    recipient_type: 'performer',
    recipient_id: performerUserId,
    type: 'booking_confirmed',
    title: "🎉 You've been confirmed!",
    message: `You have been confirmed for ${castingRequestData.production_name} on ${castingRequestData.shoot_date}. Your agency will be in touch.`,
    action_url: '/dashboard',
    related_request_id: castingRequestData.id,
  })

  // Mirror to messages table
  await writeMessages([{
    sender_type: 'system',
    sender_name: 'SetReady Casting',
    recipient_type: 'performer',
    recipient_id: performerUserId,
    subject: `🎉 You've been confirmed for ${castingRequestData.production_name}!`,
    body: `Congratulations! You have been confirmed for ${castingRequestData.production_name} on ${castingRequestData.shoot_date}. Your agency will be in touch with further details.`,
    message_type: 'booking_confirmed',
    action_url: '/dashboard',
    action_label: 'View Dashboard',
    related_id: castingRequestData.id,
  }])

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: `🎉 You're confirmed for ${castingRequestData.production_name}!`,
      html: submissionConfirmedEmailHtml({
        performerName: user.name || 'Performer',
        productionName: castingRequestData.production_name,
        shootDate: castingRequestData.shoot_date,
        location: castingRequestData.location,
        callTime: castingRequestData.call_time,
        agencyName,
      }),
    })
  }
}
