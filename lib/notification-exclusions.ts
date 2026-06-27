import { supabaseAdmin } from '@/lib/casting-auth'

// Given a list of recipient user IDs, return only those NOT on the
// casting_notification_exclusions list. Used to filter bulk casting broadcasts.
export async function filterExcludedRecipients(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return []
  const { data, error } = await supabaseAdmin
    .from('casting_notification_exclusions')
    .select('user_id')
    .in('user_id', userIds)
  if (error) { console.error('Exclusion lookup failed (sending to all):', error); return userIds }
  const excluded = new Set((data || []).map(r => r.user_id))
  return userIds.filter(id => !excluded.has(id))
}
