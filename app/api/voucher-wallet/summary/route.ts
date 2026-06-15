import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/casting-auth'
import { getUnionRules, calculateQualifyingDays } from '@/lib/union-rules'

async function getAuthUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7))
  if (error || !data.user) return null
  return data.user
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('raw_user_meta_data')
    .eq('id', user.id)
    .maybeSingle()

  const province = profile?.raw_user_meta_data?.province || 'ON'

  const { data: vouchers } = await supabaseAdmin
    .from('union_vouchers')
    .select('shoot_date, is_qualifying, days_worked')
    .eq('user_id', user.id)

  const { data: unreadNotif } = await supabaseAdmin
    .from('union_notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_read', false)
    .limit(1)

  const rule = getUnionRules(province)

  if (!rule) return NextResponse.json({ totalVouchers: 0, qualifyingDays: 0, daysRequired: 15, percentComplete: 0, isQualified: false, unionName: 'ACTRA', hasUnreadMilestone: false })

  const calc = calculateQualifyingDays(vouchers || [], rule)

  return NextResponse.json({
    totalVouchers: (vouchers || []).length,
    qualifyingDays: calc.qualifyingDays,
    daysRequired: rule.qualifyingDaysRequired,
    percentComplete: calc.percentComplete,
    isQualified: calc.isQualified,
    unionName: rule.unionShortName,
    hasUnreadMilestone: (unreadNotif || []).length > 0,
  })
}
