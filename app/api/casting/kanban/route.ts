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

  // Core action: update the status. Nothing else can block this.
  const { error } = await supabaseAdmin
    .from('casting_submissions')
    .update({ status })
    .eq('id', submissionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify performer on confirm — two plain queries, no embeds.
  // Wrapped so any failure here cannot fail the response.
  if (status === 'confirmed') {
    try {
      const { data: sub } = await supabaseAdmin
        .from('casting_submissions')
        .select('performer_user_id, casting_request_id')
        .eq('id', submissionId)
        .single()

      if (sub?.performer_user_id) {
        const { data: request } = await supabaseAdmin
          .from('casting_requests')
          .select('production_name, shoot_date')
          .eq('id', sub.casting_request_id)
          .single()

        await notify({
          recipientType: 'performer',
          recipientId: sub.performer_user_id,
          type: 'booking_confirmed',
          title: `You've been confirmed!`,
          message: `You are confirmed for "${request?.production_name || 'a production'}" on ${request?.shoot_date || 'the shoot date'}.`,
          actionUrl: '/messages',
          relatedRequestId: sub.casting_request_id,
        })
      }
    } catch {
      // notify failure must not fail the status update
    }
  }

  return NextResponse.json({ success: true })
}
