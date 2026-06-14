import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return false
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  if (adminEmails.includes(user.email || '')) return true
  const { data } = await supabaseAdmin.from('admin_users').select('id').eq('email', user.email).maybeSingle()
  return !!data
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'codes'

  if (type === 'codes') {
    const { data } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    return NextResponse.json(data || [])
  }

  if (type === 'uses') {
    const codeId = searchParams.get('codeId')
    let query = supabaseAdmin
      .from('promo_code_uses')
      .select('*, promo_codes(code, type)')
      .order('used_at', { ascending: false })
      .limit(100)
    if (codeId) query = query.eq('code_id', codeId)
    const { data } = await query
    return NextResponse.json(data || [])
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = req.headers.get('authorization')!
  const { data: { user } } = await supabaseAdmin.auth.getUser(auth.slice(7))

  const body = await req.json()
  const { code, type, description, maxUses, expiresAt, discountPercent } = body

  if (!code || !type) {
    return NextResponse.json({ error: 'code and type are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .insert({
      code: code.toUpperCase().trim(),
      type,
      description: description || null,
      max_uses: maxUses || null,
      expires_at: expiresAt || null,
      discount_percent: discountPercent ?? 100,
      created_by: user?.email || 'admin',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await supabaseAdmin.from('promo_codes').update({ is_active }).eq('id', id)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await supabaseAdmin.from('promo_codes').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
