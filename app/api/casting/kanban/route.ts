import { NextResponse } from 'next/server'
import { getCastingSession, supabaseAdmin } from '@/lib/casting-auth'
import { notify } from '@/lib/casting-notify'
import { sendEmail, submissionConfirmedEmailHtml } from '@/lib/email'

const CANCEL_STATUSES = new Set(['submitted', 'in_review', 'rejected', 'waitlisted'])

function shortlistedEmailHtml({
  performerName,
  productionName,
  shootDate,
}: {
  performerName: string
  productionName: string
  shootDate: string
}) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" style="background:white;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#1a1a2e;padding:24px 32px;"><span style="color:white;font-size:20px;font-weight:700;">🎬 SetReady Casting</span></td></tr>
          <tr><td style="background:#F59E0B;height:4px;"></td></tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#1a1a2e;font-family:Georgia,serif;margin:0 0 8px;">⭐ You've Been Shortlisted!</h1>
              <p style="color:#6b7280;margin:0 0 24px;">Hi ${performerName},</p>
              <table width="100%" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:18px;">${productionName}</h2>
                    <p style="margin:4px 0;font-size:14px;color:#374151;">📅 ${shootDate}</p>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px;color:#6b7280;line-height:1.6;">A tentative hold has been placed on your availability calendar for this date. You'll receive a follow-up if you're confirmed.</p>
              <a href="https://setready.site/availability" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#F59E0B;color:#1a1a2e;border-radius:8px;text-decoration:none;font-weight:700;">View Calendar</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

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

  // Booking sync + notify + email — all wrapped so any failure cannot fail the status update.
  try {
    const { data: sub } = await supabaseAdmin
      .from('casting_submissions')
      .select('performer_user_id, casting_request_id')
      .eq('id', submissionId)
      .single()

    if (!sub?.performer_user_id) return NextResponse.json({ success: true })

    const { data: request } = await supabaseAdmin
      .from('casting_requests')
      .select('production_name, shoot_date, location, call_time')
      .eq('id', sub.casting_request_id)
      .single()

    const performerId = sub.performer_user_id
    const shootDate = request?.shoot_date ?? null
    const productionName = request?.production_name ?? 'a production'

    // ── Booking upsert/cancel ────────────────────────────────────────────────
    if (shootDate) {
      // Idempotency: find any booking this CD placed for this performer on this shoot date.
      const { data: existingBooking } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('performer_id', performerId)
        .eq('created_by_id', session.accountId)
        .eq('start_date', shootDate)
        .eq('created_by_type', 'casting')
        .maybeSingle()

      if (status === 'confirmed' || status === 'shortlisted') {
        const bookingStatus = status === 'confirmed' ? 'confirmed' : 'pending'
        if (existingBooking) {
          await supabaseAdmin
            .from('bookings')
            .update({ status: bookingStatus, production: productionName, updated_at: new Date().toISOString() })
            .eq('id', existingBooking.id)
        } else {
          await supabaseAdmin
            .from('bookings')
            .insert({
              performer_id: performerId,
              created_by_id: session.accountId,
              created_by_type: 'casting',
              created_by_name: session.name || null,
              start_date: shootDate,
              end_date: shootDate,
              status: bookingStatus,
              production: productionName,
            })
        }
      } else if (CANCEL_STATUSES.has(status)) {
        if (existingBooking) {
          await supabaseAdmin
            .from('bookings')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', existingBooking.id)
        }
      }
    }

    // ── In-app notify ────────────────────────────────────────────────────────
    if (status === 'confirmed') {
      await notify({
        recipientType: 'performer',
        recipientId: performerId,
        type: 'booking_confirmed',
        title: `🎉 You've been booked!`,
        message: `You've been confirmed for "${productionName}" on ${shootDate || 'the shoot date'}.`,
        actionUrl: '/availability',
        relatedRequestId: sub.casting_request_id,
      })
    } else if (status === 'shortlisted') {
      await notify({
        recipientType: 'performer',
        recipientId: performerId,
        type: 'shortlisted',
        title: `⭐ You've been shortlisted!`,
        message: `You've been shortlisted for "${productionName}" on ${shootDate || 'the shoot date'}. A hold has been placed on your calendar.`,
        actionUrl: '/availability',
        relatedRequestId: sub.casting_request_id,
      })
    }

    // ── Email ────────────────────────────────────────────────────────────────
    if (status === 'confirmed' || status === 'shortlisted') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, name')
        .eq('id', performerId)
        .single()

      if (user?.email) {
        if (status === 'confirmed') {
          await sendEmail({
            to: user.email,
            subject: `🎉 You're confirmed for ${productionName}!`,
            html: submissionConfirmedEmailHtml({
              performerName: user.name || 'Performer',
              productionName,
              shootDate: shootDate || '',
              location: request?.location ?? undefined,
              callTime: request?.call_time ?? undefined,
            }),
          })
        } else {
          await sendEmail({
            to: user.email,
            subject: `⭐ You've been shortlisted for ${productionName}`,
            html: shortlistedEmailHtml({
              performerName: user.name || 'Performer',
              productionName,
              shootDate: shootDate || '',
            }),
          })
        }
      }
    }
  } catch {
    // booking/notify/email failures must not fail the status update
  }

  return NextResponse.json({ success: true })
}
