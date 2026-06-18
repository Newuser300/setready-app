import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
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
    .select('ical_token')
    .eq('id', user.id)
    .single()

  // Return existing token or generate a new one
  let token = data?.ical_token
  if (!token) {
    token = randomBytes(32).toString('hex')
    await supabaseAdmin
      .from('users')
      .update({ ical_token: token })
      .eq('id', user.id)
  }

  return NextResponse.json({ token })
}
