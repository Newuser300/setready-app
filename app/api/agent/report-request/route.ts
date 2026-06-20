import { NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as any
  const requestId = body?.requestId
  const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : null
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('casting_request_reports')
    .insert({
      casting_request_id: requestId,
      reporter_type: 'agent',
      reporter_id: session.accountId,
      reason,
    })

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ success: true, alreadyReported: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
