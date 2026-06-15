import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { notify } from '@/lib/casting-notify'

export async function PATCH(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { submissionId, status } = await req.json()
  if (!submissionId || !status) return NextResponse.json({ error: 'submissionId and status required' }, { status: 400 })

  const VALID = ['submitted', 'in_review', 'shortlisted', 'confirmed', 'rejected', 'waitlisted']
  if (!VALID.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const { data: sub, error: fetchErr } = await supabaseAdmin
    .from('casting_submissions')
    .select('id, performer_id, casting_request_id, casting_requests(production_name, shoot_date, casting_director_id)')
    .eq('id', submissionId)
    .single()

  if (fetchErr || !sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('casting_submissions')
    .update({ status, is_waitlisted: status === 'waitlisted' })
    .eq('id', submissionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify performer when confirmed
  if (status === 'confirmed') {
    const req_data = sub.casting_requests as any
    await notify({
      recipientType: 'performer',
      recipientId: sub.performer_id,
      type: 'booking_confirmed',
      title: `You've been confirmed!`,
      message: `You are confirmed for "${req_data?.production_name || 'a production'}" on ${req_data?.shoot_date || 'the shoot date'}.`,
      actionUrl: '/messages',
      relatedRequestId: sub.casting_request_id,
    })
  }

  return NextResponse.json({ success: true })
}
