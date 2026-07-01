import { NextRequest, NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(request: NextRequest) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const [profilesResp, agentsResp] = await Promise.all([
    supabaseAdmin
      .from('performer_profiles')
      .select('user_id')
      .eq('is_public', true)
      .limit(20),
    supabaseAdmin
      .from('agent_accounts')
      .select('id, name, email')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),
  ])

  const profileList = profilesResp.data || []
  let stitchedProfiles: any[] = []
  if (profileList.length > 0) {
    const uids = profileList.map((p: any) => p.user_id)
    const { data: userRows } = await supabaseAdmin.from('users').select('id, email, name').in('id', uids)
    const usersMap: Record<string, any> = {}
    ;(userRows || []).forEach((u: any) => {
      usersMap[u.id] = { id: u.id, email: u.email, raw_user_meta_data: { full_name: u.name || '' } }
    })
    stitchedProfiles = profileList.map((p: any) => ({ ...p, users: usersMap[p.user_id] || null }))
  }

  const qLower = q.toLowerCase()

  const performerResults = stitchedProfiles
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
    ...(agentsResp.data || []).map((a: any) => ({ id: a.id, name: a.name, email: a.email, type: 'agent' })),
  ]

  return NextResponse.json({ results })
}
