import { NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/isAdmin'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ count: 0 })

  const { data } = await supabaseAdmin
    .from('messages')
    .select('id')
    .eq('recipient_id', user.id)
    .in('message_type', ['casting_request', 'booking_confirmed'])
    .eq('is_read', false)
    .eq('is_deleted', false)

  return NextResponse.json({ count: data?.length || 0 })
}
