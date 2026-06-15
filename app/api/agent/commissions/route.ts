import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function GET(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabaseAdmin
    .from('agency_commissions')
    .select(`
      *,
      users:performer_id (email, raw_user_meta_data)
    `)
    .eq('agency_id', agent.agency_id)
    .order('shoot_date', { ascending: false })

  if (from) query = query.gte('shoot_date', from)
  if (to) query = query.lte('shoot_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const body = await req.json()
  const { performerId, productionName, shootDate, grossPay, commissionRate, notes } = body

  const rate = commissionRate || 10.00
  const commissionAmount = parseFloat(grossPay) * (rate / 100)

  const { data, error } = await supabaseAdmin
    .from('agency_commissions')
    .insert({
      agency_id: agent.agency_id,
      performer_id: performerId || null,
      production_name: productionName,
      shoot_date: shootDate,
      gross_pay: parseFloat(grossPay),
      commission_rate: rate,
      commission_amount: commissionAmount,
      notes: notes || null,
      is_paid: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_paid } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('agency_commissions')
    .update({ is_paid })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
