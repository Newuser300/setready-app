import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { notify } from '@/lib/casting-notify'

export async function PATCH(req: Request) {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { submissionId, status, notes } = body

  if (!submissionId || !status) {
    return NextResponse.json({ error: 'submissionId and status required' }, { status: 400 })
  }

  const validStatuses = ['submitted', 'shortlisted', 'confirmed', 'rejected']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Fetch submission with request ownership check
  const { data: submission } = await supabaseAdmin
    .from('casting_submissions')
    .select(`
      id,
      status,
      performer_id,
      agency_id,
      casting_request_id,
      casting_requests:casting_request_id (
        production_name,
        shoot_date,
        role_type,
        casting_director_id,
        performers_needed,
        filled_count
      )
    `)
    .eq('id', submissionId)
    .single()

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  const request = submission.casting_requests as any
  if (!request || request.casting_director_id !== session.accountId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (notes !== undefined) update.notes = notes

  const { data: updated, error } = await supabaseAdmin
    .from('casting_submissions')
    .update(update)
    .eq('id', submissionId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Increment filled_count when confirming
  if (status === 'confirmed' && submission.status !== 'confirmed') {
    await supabaseAdmin
      .from('casting_requests')
      .update({ filled_count: (request.filled_count || 0) + 1 })
      .eq('id', submission.casting_request_id)

    // Notify agent
    if (submission.agency_id) {
      await notify({
        recipientType: 'agent',
        recipientId: submission.agency_id,
        type: 'submission_confirmed',
        title: `Performer Confirmed: ${request.production_name}`,
        message: `A performer you submitted has been confirmed for ${request.role_type} on ${request.shoot_date}.`,
        actionUrl: `/agent/dashboard`,
        relatedRequestId: submission.casting_request_id,
        relatedSubmissionId: submissionId,
      })
    }

    // Notify performer
    if (submission.performer_id) {
      await notify({
        recipientType: 'performer',
        recipientId: submission.performer_id,
        type: 'submission_confirmed',
        title: `You've been confirmed!`,
        message: `You've been confirmed for ${request.role_type} on ${request.production_name} (${request.shoot_date}).`,
        actionUrl: `/dashboard`,
        relatedRequestId: submission.casting_request_id,
        relatedSubmissionId: submissionId,
      })
    }
  }

  // Notify agent when shortlisted
  if (status === 'shortlisted' && submission.status !== 'shortlisted') {
    if (submission.agency_id) {
      await notify({
        recipientType: 'agent',
        recipientId: submission.agency_id,
        type: 'submission_shortlisted',
        title: `Performer Shortlisted: ${request.production_name}`,
        message: `A performer you submitted has been shortlisted for ${request.role_type} on ${request.shoot_date}.`,
        actionUrl: `/agent/dashboard`,
        relatedRequestId: submission.casting_request_id,
        relatedSubmissionId: submissionId,
      })
    }
  }

  return NextResponse.json({ success: true, submission: updated })
}
