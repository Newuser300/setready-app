import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/casting-auth'

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

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  if (!path.startsWith(user.id + '/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin.storage
    .from('union-vouchers')
    .createSignedUrl(path, 60 * 60 * 2)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}
