import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getAgentSession } from '@/lib/casting-auth'
import { sendEmail, rosterInviteEmailHtml } from '@/lib/email'
import { supabaseAdmin } from '@/utils/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://setready.ca'

type ImportRow = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  gender?: string
  date_of_birth?: string
  height_cm?: string
  hair_color?: string
  eye_color?: string
  union_status?: string
  special_skills?: string
}

type SkippedRow = { email: string; reason: string }

export async function POST(req: Request) {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve agency details
  const { data: account, error: accountErr } = await supabaseAdmin
    .from('agent_accounts')
    .select('agency_id, agencies(name)')
    .eq('id', session.accountId)
    .single()

  if (accountErr || !account?.agency_id) {
    return NextResponse.json({ error: 'Agent account not found' }, { status: 403 })
  }

  const agencyId: string = account.agency_id
  const agencyName: string = (account as any).agencies?.name || 'Your Agency'

  // Parse body
  let rows: ImportRow[]
  try {
    const body = await req.json()
    rows = body.rows
    if (!Array.isArray(rows)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Pre-load lookup sets (one round-trip each, not N) ─────────────────────

  // All users by email → id
  const { data: allUsers } = await supabaseAdmin
    .from('users')
    .select('id, email')

  const userByEmail = new Map<string, string>(
    (allUsers || [])
      .filter((u: { email: string | null }) => u.email)
      .map((u: { id: string; email: string }) => [u.email.toLowerCase().trim(), u.id])
  )

  // Existing agency_roster entries for this agency (any status, to block re-import of existing rows)
  const { data: rosterRows } = await supabaseAdmin
    .from('agency_roster')
    .select('user_id')
    .eq('agency_id', agencyId)

  const alreadyOnRoster = new Set<string>(
    (rosterRows || []).map((r: { user_id: string }) => r.user_id)
  )

  // Existing pending performer_claims for this agency (not yet used/expired)
  const { data: claimRows } = await supabaseAdmin
    .from('performer_claims')
    .select('invited_email')
    .eq('agency_id', agencyId)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())

  const alreadyInvited = new Set<string>(
    (claimRows || []).map((c: { invited_email: string }) => c.invited_email.toLowerCase().trim())
  )

  // ── Process rows ───────────────────────────────────────────────────────────

  let imported = 0
  let invited = 0
  const skippedRows: SkippedRow[] = []

  for (const row of rows) {
    const email = row.email?.trim()
    if (!email) {
      skippedRows.push({ email: '(blank)', reason: 'No email address' })
      continue
    }

    const emailNorm = email.toLowerCase()
    const existingUserId = userByEmail.get(emailNorm)

    if (existingUserId) {
      // ── Performer has a SetReady account — link via agency_roster ──────────

      if (alreadyOnRoster.has(existingUserId)) {
        skippedRows.push({ email, reason: 'Already linked to this agency\'s roster' })
        continue
      }

      const { error: rosterErr } = await supabaseAdmin
        .from('agency_roster')
        .insert({
          agency_id: agencyId,
          user_id: existingUserId,         // canonical column name confirmed
          status: 'pending',               // existing status column
          invite_status: 'invited',        // new column from migration
          invited_email: email,
          added_by: session.accountId,
        })

      if (rosterErr) {
        skippedRows.push({ email, reason: 'Database error: ' + rosterErr.message })
        continue
      }

      alreadyOnRoster.add(existingUserId)
      imported++
      // No claim email for existing users — they see it via in-app notifications.
      // is_public is never touched here.

    } else {
      // ── No account yet — create performer_claims row and send invite ───────

      if (alreadyInvited.has(emailNorm)) {
        skippedRows.push({ email, reason: 'Invite already sent to this email' })
        continue
      }

      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      let heightCm: number | null = null
      if (row.height_cm?.trim()) {
        const n = parseFloat(row.height_cm.trim())
        if (!isNaN(n)) heightCm = n
      }

      // prefilled_data stores everything the agent uploaded — read at claim time
      // is_public is NOT set here; it defaults to false and is only set when the
      // performer actively claims and confirms their profile.
      const prefilledData = {
        first_name:    row.first_name?.trim()    || null,
        last_name:     row.last_name?.trim()     || null,
        phone:         row.phone?.trim()         || null,
        gender:        row.gender?.trim()        || null,
        date_of_birth: row.date_of_birth?.trim() || null,
        height_cm:     heightCm,
        hair_color:    row.hair_color?.trim()    || null,
        eye_color:     row.eye_color?.trim()     || null,
        union_status:  row.union_status?.trim()  || null,
        special_skills: row.special_skills?.trim() || null,
      }

      const { error: claimErr } = await supabaseAdmin
        .from('performer_claims')
        .insert({
          agency_id:     agencyId,
          invited_email: emailNorm,
          token,
          prefilled_data: prefilledData,
          invited_by:    session.accountId,
          expires_at:    expiresAt,
        })

      if (claimErr) {
        skippedRows.push({ email, reason: 'Database error: ' + claimErr.message })
        continue
      }

      alreadyInvited.add(emailNorm)
      imported++

      const claimUrl = `${APP_URL}/claim?token=${token}`
      const firstName = row.first_name?.trim() || 'there'

      const emailResult = await sendEmail({
        to: email,
        subject: `${agencyName} invited you to join SetReady`,
        html: rosterInviteEmailHtml({ firstName, agencyName, claimUrl }),
      })

      if (emailResult.success) invited++
    }
  }

  return NextResponse.json({
    imported,
    invited,
    skipped: skippedRows.length,
    skippedRows,
  })
}
