import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id')
    .eq('id', session.accountId)
    .single()
  if (!agent?.agency_id) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Logo must be under 2 MB' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${agent.agency_id}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('agency-logos')
    .upload(path, buffer, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from('agency-logos').getPublicUrl(path)
  // cache-bust so an updated logo shows immediately
  const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { error: dbError } = await supabaseAdmin
    .from('agencies')
    .update({ logo_url: logoUrl })
    .eq('id', agent.agency_id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true, logo_url: logoUrl })
}
