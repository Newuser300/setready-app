import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('casting_notifications')
    .select('*')
    .eq('recipient_type', 'casting_director')
    .eq('recipient_id', session.accountId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH() {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin
    .from('casting_notifications')
    .update({ is_read: true })
    .eq('recipient_type', 'casting_director')
    .eq('recipient_id', session.accountId)
    .eq('is_read', false)

  return NextResponse.json({ success: true })
}
