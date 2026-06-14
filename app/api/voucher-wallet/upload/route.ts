import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/casting-auth'

async function getAuthUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7))
  if (error || !data.user) return null
  return data.user
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const voucherId = formData.get('voucherId') as string | null

  if (!file || !voucherId) {
    return NextResponse.json({ error: 'file and voucherId required' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('union_vouchers')
    .select('id')
    .eq('id', voucherId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })

  const ext = file.name.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const path = `${user.id}/${voucherId}_${timestamp}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabaseAdmin.storage
    .from('union-vouchers')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signedData } = await supabaseAdmin.storage
    .from('union-vouchers')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  await supabaseAdmin
    .from('union_vouchers')
    .update({ photo_url: path, photo_filename: file.name, updated_at: new Date().toISOString() })
    .eq('id', voucherId)
    .eq('user_id', user.id)

  return NextResponse.json({ photoUrl: path, signedUrl: signedData?.signedUrl })
}
