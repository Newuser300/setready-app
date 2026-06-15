import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ canMessage: false }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('admin_settings')
    .select('value')
    .eq('key', 'agents_can_message')
    .maybeSingle()

  return NextResponse.json({ canMessage: data?.value !== 'false' })
}
