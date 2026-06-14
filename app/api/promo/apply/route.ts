import { NextRequest, NextResponse } from 'next/server'
import { applyPromoCode } from '@/lib/promo'
import { getAgentSession, getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function POST(req: NextRequest) {
  const { code, userType } = await req.json()
  if (!code || !userType) {
    return NextResponse.json({ error: 'code and userType are required' }, { status: 400 })
  }

  let entityId: string | null = null

  if (userType === 'performer') {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: { user } } = await supabaseAdmin.auth.getUser(auth.slice(7))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    entityId = user.id

  } else if (userType === 'agent') {
    const session = await getAgentSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // accountId is agent_accounts.id — look up agency_id
    const { data: account } = await supabaseAdmin
      .from('agent_accounts')
      .select('agency_id')
      .eq('id', session.accountId)
      .maybeSingle()
    if (!account?.agency_id) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    entityId = account.agency_id

  } else if (userType === 'casting_director') {
    const session = await getCastingSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    entityId = session.accountId

  } else {
    return NextResponse.json({ error: 'Invalid userType' }, { status: 400 })
  }

  const result = await applyPromoCode(code, entityId, userType)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
