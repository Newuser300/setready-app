import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('finance_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { entry_type, category, amount, description, entry_date } = body

  if (!entry_type || !category || amount == null || !entry_date) {
    return NextResponse.json({ error: 'entry_type, category, amount, and entry_date are required' }, { status: 400 })
  }
  if (!['revenue', 'expense'].includes(entry_type)) {
    return NextResponse.json({ error: 'entry_type must be revenue or expense' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('finance_entries')
    .insert({ entry_type, category, amount: Number(amount), description: description || null, entry_date, created_by: admin.email })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, entry_type, category, amount, description, entry_date } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('finance_entries')
    .update({ entry_type, category, amount: Number(amount), description: description || null, entry_date })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('finance_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
