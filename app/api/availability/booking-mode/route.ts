import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { active } = await req.json()

  const updates: Record<string, unknown> = {
    active_booking_mode: !!active,
  }

  if (active) {
    // Set expiry 60 days from now
    const until = new Date()
    until.setDate(until.getDate() + 60)
    updates.active_booking_mode_until = until.toISOString()
  } else {
    updates.active_booking_mode_until = null
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, active_booking_mode: !!active })
}
