import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('photo_promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const code: string = (body.code ?? '').toString().trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

  // max_uses: how many distinct users may redeem this code.
  // Defaults to 1 (single-use) if not provided or invalid.
  const parsedMax = parseInt(body.max_uses, 10)
  const maxUses = Number.isFinite(parsedMax) && parsedMax >= 1 ? parsedMax : 1

  const allowedTypes = ['photo', 'insights', 'verified_badge']
  const codeType = allowedTypes.includes(body.type) ? body.type : 'photo'

  const { data, error } = await supabaseAdmin
    .from('photo_promo_codes')
    .insert({ code, is_used: false, use_count: 0, max_uses: maxUses, type: codeType, created_by: admin.email })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('photo_promo_codes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
