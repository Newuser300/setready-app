import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ canMessage: false }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('admin_settings')
    .select('value')
    .eq('key', 'casting_directors_can_message')
    .maybeSingle()

  return NextResponse.json({ canMessage: data?.value !== 'false' })
}
