import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'BGReady <notifications@bgready.site>'

function isEmailEnabled() {
  return !!process.env.RESEND_API_KEY
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}) {
  if (!isEmailEnabled()) {
    console.log('[Email] Not configured. Would have sent to:', to, '| Subject:', subject)
    return { success: false, reason: 'not configured' }
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || subject,
    })
    return { success: true, data: result }
  } catch (err) {
    console.error('[Email] Send error:', err)
    return { success: false, error: err }
  }
}

// ── Email Templates ──────────────────────────────────────────────────────────

export function castingRequestEmailHtml({
  productionName,
  shootDate,
  location,
  roleType,
  sceneDescription,
  rate,
  numberNeeded,
  recipientName,
  recipientType,
}: {
  productionName: string
  shootDate: string
  location?: string
  roleType?: string
  sceneDescription?: string
  rate?: string
  numberNeeded?: number
  recipientName: string
  recipientType: 'agent' | 'performer'
}) {
  const dashboardUrl =
    recipientType === 'agent'
      ? 'https://www.bgready.site/agent/dashboard'
      : 'https://www.bgready.site/casting-portal'

  const ctaText =
    recipientType === 'agent'
      ? 'View Request and Submit Performers'
      : 'View Casting Request'

  const n = numberNeeded || 1
  const formattedDate = (() => {
    try {
      return new Date(shootDate).toLocaleDateString('en-CA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return shootDate
    }
  })()

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 32px;">
              <table><tr><td>
                <div style="width:44px;height:44px;background:#F59E0B;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#1a1a2e;vertical-align:middle;">BG</div>
                <span style="color:white;font-size:22px;font-weight:700;margin-left:12px;vertical-align:middle;">BGReady Casting</span>
              </td></tr></table>
            </td>
          </tr>

          <!-- Amber bar -->
          <tr><td style="background:#F59E0B;height:4px;"></td></tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <p style="font-size:14px;color:#6b7280;margin:0 0 8px;">Hello ${recipientName},</p>
              <h1 style="font-size:24px;font-weight:700;color:#1a1a2e;margin:0 0 24px;font-family:Georgia,serif;">New Casting Request</h1>

              <!-- Production card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 16px;">${productionName}</h2>
                    <table width="100%">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;width:140px;">📅 Shoot Date</td>
                        <td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:600;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">📍 Location</td>
                        <td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:600;">${location || 'TBD'}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">🎭 Role Type</td>
                        <td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:600;">${roleType || 'General Background'}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">👥 Performers Needed</td>
                        <td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:600;">${n} performer${n !== 1 ? 's' : ''}</td>
                      </tr>
                      ${rate ? `<tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">💰 Rate</td>
                        <td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:600;">${rate}</td>
                      </tr>` : ''}
                    </table>
                    ${sceneDescription ? `
                    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;">
                      <p style="font-size:12px;color:#6b7280;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">Scene Description</p>
                      <p style="font-size:14px;color:#374151;margin:0;line-height:1.6;">${sceneDescription}</p>
                    </div>` : ''}
                  </td>
                </tr>
              </table>

              ${recipientType === 'performer' ? `
              <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:16px;margin-bottom:24px;font-size:14px;color:#92400e;">
                <strong>📋 Self-Represented Performer:</strong> As an independent performer, the casting director may contact you directly using the contact information on your BGReady profile. Make sure your profile is complete and up to date.
              </div>` : ''}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background:#F59E0B;color:#1a1a2e;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">${ctaText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                BGReady — Canada's Background Performer Platform<br/>
                <a href="https://www.bgready.site" style="color:#F59E0B;">bgready.site</a>
                &nbsp;·&nbsp;
                <a href="mailto:support@bgready.site" style="color:#9ca3af;">support@bgready.site</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function submissionConfirmedEmailHtml({
  performerName,
  productionName,
  shootDate,
  location,
  callTime,
  agencyName,
}: {
  performerName: string
  productionName: string
  shootDate: string
  location?: string
  callTime?: string
  agencyName?: string
}) {
  const formattedDate = (() => {
    try {
      return new Date(shootDate).toLocaleDateString('en-CA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return shootDate
    }
  })()

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" style="background:white;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#1a1a2e;padding:24px 32px;">
              <span style="color:white;font-size:20px;font-weight:700;">🎬 BGReady Casting</span>
            </td>
          </tr>
          <tr><td style="background:#F59E0B;height:4px;"></td></tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#1a1a2e;font-family:Georgia,serif;margin:0 0 8px;">🎉 You've Been Confirmed!</h1>
              <p style="color:#6b7280;margin:0 0 24px;">Congratulations ${performerName}!</p>

              <table width="100%" style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:18px;">${productionName}</h2>
                    <p style="margin:4px 0;font-size:14px;color:#374151;">📅 ${formattedDate}</p>
                    <p style="margin:4px 0;font-size:14px;color:#374151;">📍 ${location || 'TBD'}</p>
                    ${callTime ? `<p style="margin:4px 0;font-size:14px;color:#374151;">⏰ Call Time: ${callTime}</p>` : ''}
                    ${agencyName ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Submitted by: ${agencyName}</p>` : ''}
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#6b7280;line-height:1.6;">Your agency will be in touch with further details. Please confirm your availability with them directly.</p>

              <a href="https://www.bgready.site/availability" style="display:inline-block;background:#F59E0B;color:#1a1a2e;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px;">Update Your Availability</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
              BGReady · <a href="https://www.bgready.site" style="color:#F59E0B;">bgready.site</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function agentConfirmationEmailHtml({
  agentName,
  performerName,
  productionName,
  shootDate,
}: {
  agentName: string
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
          <tr><td style="background:#1a1a2e;padding:24px 32px;"><span style="color:white;font-size:20px;font-weight:700;">🎬 BGReady Casting</span></td></tr>
          <tr><td style="background:#F59E0B;height:4px;"></td></tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#1a1a2e;font-family:Georgia,serif;margin:0 0 8px;">✅ Performer Confirmed</h1>
              <p style="color:#6b7280;margin:0 0 24px;">Hello ${agentName},</p>
              <p style="font-size:15px;color:#374151;line-height:1.6;">
                <strong>${performerName}</strong> has been confirmed by the casting director for <strong>${productionName}</strong> on ${shootDate}.
              </p>
              <p style="font-size:14px;color:#6b7280;line-height:1.6;margin-top:16px;">Please contact the performer to confirm their availability and provide call time details.</p>
              <a href="https://www.bgready.site/agent/dashboard" style="display:inline-block;background:#F59E0B;color:#1a1a2e;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:20px;">View Agent Dashboard</a>
            </td>
          </tr>
          <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">BGReady · <a href="https://www.bgready.site" style="color:#F59E0B;">bgready.site</a></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function bookingConfirmedPerformerEmailHtml({
  performerName,
  productionName,
  shootDate,
  callTime,
  location,
  roleType,
  rate,
}: {
  performerName: string
  productionName: string
  shootDate: string
  callTime?: string | null
  location?: string | null
  roleType?: string | null
  rate?: string | null
}) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" style="background:white;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#1a1a2e;padding:24px 32px;"><span style="color:white;font-size:20px;font-weight:700;">🎬 BGReady</span></td></tr>
          <tr><td style="background:#22c55e;height:4px;"></td></tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#1a1a2e;font-family:Georgia,serif;margin:0 0 8px;">✅ You're Booked!</h1>
              <p style="color:#6b7280;margin:0 0 20px;">Hello ${performerName},</p>
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
                Congratulations — your booking has been confirmed for <strong>${productionName}</strong>!
              </p>
              <table style="background:#f9fafb;border-radius:10px;padding:16px 20px;width:100%;border:1px solid #e5e7eb;border-collapse:separate;border-spacing:0;">
                <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;font-weight:600;">Production</td><td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:700;">${productionName}</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;font-weight:600;">Date</td><td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:700;">${shootDate}</td></tr>
                ${callTime ? `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;font-weight:600;">Call Time</td><td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:700;">${callTime}</td></tr>` : ''}
                ${location ? `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;font-weight:600;">Location</td><td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:700;">${location}</td></tr>` : ''}
                ${roleType ? `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;font-weight:600;">Role</td><td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:700;">${roleType}</td></tr>` : ''}
                ${rate ? `<tr><td style="padding:6px 0;font-size:13px;color:#6b7280;font-weight:600;">Rate</td><td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:700;">${rate}</td></tr>` : ''}
              </table>
              <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin-top:20px;">Your agent or the casting director will contact you with further details. Please ensure your availability is up to date.</p>
              <a href="https://www.bgready.site/dashboard" style="display:inline-block;background:#F59E0B;color:#1a1a2e;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:20px;">View Your Dashboard</a>
            </td>
          </tr>
          <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">BGReady · <a href="https://www.bgready.site" style="color:#F59E0B;">bgready.site</a></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function rosterInviteEmailHtml({
  firstName,
  agencyName,
  claimUrl,
}: {
  firstName: string
  agencyName: string
  claimUrl: string
}) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" style="background:white;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#1a1a2e;padding:24px 32px;"><span style="color:white;font-size:20px;font-weight:700;">🎬 BGReady</span></td></tr>
          <tr><td style="background:#F59E0B;height:4px;"></td></tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#1a1a2e;font-family:Georgia,serif;margin:0 0 8px;">You've been invited to BGReady</h1>
              <p style="color:#6b7280;margin:0 0 20px;">Hi ${firstName},</p>
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
                <strong>${agencyName}</strong> has added you to their roster on BGReady — Canada's platform for background performers and talent agents.
              </p>
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
                Click the button below to claim your profile, review the information added on your behalf, and set your own password. Your profile stays <strong>private</strong> until you confirm it — nothing is shared with casting until you do.
              </p>
              <a href="${claimUrl}" style="display:inline-block;background:#F59E0B;color:#1a1a2e;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Claim My BGReady Profile</a>
              <p style="font-size:13px;color:#9ca3af;margin:24px 0 0;line-height:1.6;">
                This invite link is unique to you and expires after use. If you don't know <strong>${agencyName}</strong> or weren't expecting this email, you can safely ignore it — no account will be created.
              </p>
            </td>
          </tr>
          <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
            BGReady · <a href="https://www.bgready.site" style="color:#F59E0B;">bgready.site</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Abandoned-cart recovery ──────────────────────────────────────────────────

export function abandonedCartEmailHtml({
  itemName,
  recoveryUrl,
}: {
  itemName: string
  recoveryUrl: string
}) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" style="background:white;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#1a1a2e;padding:24px 32px;"><span style="color:white;font-size:20px;font-weight:700;">🎬 BGReady</span></td></tr>
          <tr><td style="background:#F59E0B;height:4px;"></td></tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#1a1a2e;font-family:Georgia,serif;margin:0 0 8px;">You left something behind</h1>
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
                You started checking out for <strong>${itemName}</strong> but didn't finish. Your spot is still here — pick up right where you left off.
              </p>
              <a href="${recoveryUrl}" style="display:inline-block;background:#F59E0B;color:#1a1a2e;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Complete your purchase</a>
              <p style="font-size:13px;color:#9ca3af;margin:24px 0 0;line-height:1.6;">
                Changed your mind? No problem — you can ignore this email and nothing will be charged.
              </p>
            </td>
          </tr>
          <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
            BGReady · <a href="https://www.bgready.site" style="color:#F59E0B;">bgready.site</a><br/>
            You're receiving this because you started a purchase on BGReady.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendAbandonedCartEmail(to: string, itemName: string, recoveryUrl: string) {
  return sendEmail({
    to,
    subject: `You left ${itemName} behind — finish your BGReady purchase`,
    html: abandonedCartEmailHtml({ itemName, recoveryUrl }),
    text: `You started checking out for ${itemName} on BGReady but didn't finish. Complete it here: ${recoveryUrl}`,
  })
}
