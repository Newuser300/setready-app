import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'

export async function GET(request: NextRequest) {
  const admin = await verifyAdminRequest(request)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()

  if (!search) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .order('created_at', { ascending: false })
      .limit(20)
    return NextResponse.json(data || [])
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    .limit(10)

  return NextResponse.json(data || [])
}
