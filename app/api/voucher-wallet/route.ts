import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/casting-auth'
import { getUnionRules, calculateQualifyingDays, getMilestoneMessage, MILESTONE_THRESHOLDS } from '@/lib/union-rules'

async function getAuthUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7))
  if (error || !data.user) return null
  return data.user
}

async function checkAndCreateMilestone(userId: string, qualifyingDays: number, unionName: string, tierName: string, daysRequired: number) {
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (qualifyingDays >= threshold) {
      const milestoneType = threshold >= daysRequired ? 'qualified' : `milestone_${threshold}`
      const existing = await supabaseAdmin
        .from('union_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', milestoneType)
        .maybeSingle()
      if (!existing.data) {
        const msg = getMilestoneMessage(qualifyingDays, unionName, tierName, daysRequired)
        if (msg) {
          await supabaseAdmin.from('union_notifications').insert({
            user_id: userId,
            type: msg.type,
            title: msg.title,
            message: msg.message,
          })
        }
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('province')
    .eq('id', user.id)
    .maybeSingle()

  console.log('Voucher wallet province fetch (GET):', { userId: user.id, userData, userError })
  const userProvince = (userData?.province || 'BC').trim()
  console.log('Province code used:', userProvince)

  const { data: vouchers, error } = await supabaseAdmin
    .from('union_vouchers')
    .select('*')
    .eq('user_id', user.id)
    .order('shoot_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rules = getUnionRules(userProvince)
  console.log('Union rules:', { province: userProvince, union: rules.unionShortName, entryTier: rules.entryTierName })

  const progress = {
    rule: rules,
    ...calculateQualifyingDays(vouchers || [], rules),
  }

  return NextResponse.json({
    vouchers: vouchers || [],
    progress,
    rules,
    province: rules.provinceCode,
    provinceName: rules.provinceName,
    unionName: rules.unionShortName,
    unionOrganization: rules.unionOrganization,
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    productionName, productionType, shootDate, roleType,
    unionType, isQualifying, daysWorked, voucherNumber, notes,
  } = body

  if (!productionName || !shootDate) {
    return NextResponse.json({ error: 'productionName and shootDate are required' }, { status: 400 })
  }

  const { data: voucher, error } = await supabaseAdmin
    .from('union_vouchers')
    .insert({
      user_id: user.id,
      production_name: productionName,
      production_type: productionType || null,
      shoot_date: shootDate,
      role_type: roleType || null,
      union_type: unionType || null,
      is_qualifying: isQualifying !== false && unionType !== 'non-union',
      days_worked: daysWorked || 1,
      voucher_number: voucherNumber || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: postUserData } = await supabaseAdmin
    .from('users')
    .select('province')
    .eq('id', user.id)
    .maybeSingle()

  console.log('Voucher wallet province fetch (POST):', { userId: user.id, postUserData })
  const province = postUserData?.province || 'BC'
  const { data: allVouchers } = await supabaseAdmin
    .from('union_vouchers')
    .select('*')
    .eq('user_id', user.id)

  const rules = getUnionRules(province)
  const calc = calculateQualifyingDays(allVouchers || [], rules)
  await checkAndCreateMilestone(user.id, calc.qualifyingDays, rules.unionShortName, rules.entryTierName, rules.qualifyingDaysRequired)

  const { data: latestNotif } = await supabaseAdmin
    .from('union_notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ voucher, milestone: latestNotif || null })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed: Record<string, any> = {}
  const map: Record<string, string> = {
    productionName: 'production_name', productionType: 'production_type',
    shootDate: 'shoot_date', roleType: 'role_type', unionType: 'union_type',
    isQualifying: 'is_qualifying', daysWorked: 'days_worked',
    voucherNumber: 'voucher_number', notes: 'notes',
  }
  for (const [k, col] of Object.entries(map)) {
    if (k in fields) allowed[col] = fields[k]
  }
  allowed.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('union_vouchers')
    .update(allowed)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ voucher: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('union_vouchers')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
