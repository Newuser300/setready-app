import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('users')
    .select('active_booking_mode, ical_token')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    active_booking_mode: data?.active_booking_mode ?? false,
    ical_token: data?.ical_token ?? null,
  })
}
