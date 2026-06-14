import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET() {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cd } = await supabaseAdmin
    .from('casting_directors')
    .select('is_pro, pro_expires_at')
    .eq('id', session.accountId)
    .maybeSingle()

  const isPro = !!(cd?.is_pro && (!cd.pro_expires_at || new Date(cd.pro_expires_at) > new Date()))

  return NextResponse.json({
    isPro,
    proExpiresAt: cd?.pro_expires_at || null,
  })
}
