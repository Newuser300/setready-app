import { NextRequest, NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(request: NextRequest) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const [{ data: profiles }, { data: agents }] = await Promise.all([
    // Search performers via performer_profiles joined to users
    supabaseAdmin
      .from('performer_profiles')
      .select('user_id, users:user_id (id, email, raw_user_meta_data)')
      .eq('is_public', true)
      .limit(20),
    supabaseAdmin
      .from('agent_accounts')
      .select('id, name, email')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),
  ])

  const qLower = q.toLowerCase()

  const performerResults = (profiles || [])
    .map((p: any) => {
      const user = p.users
      const name: string = user?.raw_user_meta_data?.full_name || user?.email?.split('@')[0] || ''
      const email: string = user?.email || ''
      return { id: user?.id, name, email, type: 'performer' }
    })
    .filter(p => p.name.toLowerCase().includes(qLower) || p.email.toLowerCase().includes(qLower))
    .slice(0, 8)

  const results = [
    ...performerResults,
    ...(agents || []).map((a: any) => ({ id: a.id, name: a.name, email: a.email, type: 'agent' })),
  ]

  return NextResponse.json({ results })
}
