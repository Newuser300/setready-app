import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('casting_notifications')
    .select('*')
    .eq('recipient_type', 'agent')
    .eq('recipient_id', session.accountId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data || [])
}

export async function PATCH() {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin
    .from('casting_notifications')
    .update({ is_read: true })
    .eq('recipient_type', 'agent')
    .eq('recipient_id', session.accountId)
    .eq('is_read', false)

  return NextResponse.json({ success: true })
}
