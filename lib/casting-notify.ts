import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  await supabaseAdmin
    .from('casting_notifications')
    .insert({
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

export async function notifyAllAgents(
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  relatedRequestId?: string
) {
  const { data: agents } = await supabaseAdmin
    .from('agent_accounts')
    .select('id')
    .eq('is_active', true)

  if (!agents) return

  const notifications = agents.map(agent => ({
    recipient_type: 'agent' as const,
    recipient_id: agent.id,
    type,
    title,
    message,
    action_url: actionUrl,
    related_request_id: relatedRequestId,
  }))

  await supabaseAdmin
    .from('casting_notifications')
    .insert(notifications)
}
