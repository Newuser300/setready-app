import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { getAgentSession } from '@/lib/casting-auth'
import { sendEmail } from '@/lib/email'
import { rosterInviteEmailHtml } from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  // Resolve agency_id from agent_accounts
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
    if (!Array.isArray(rows)) throw new Error('rows must be array')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  let imported = 0
  let invited = 0
  const skippedRows: SkippedRow[] = []

  // Pre-load existing invite emails for this agency (for de-dupe)
  const { data: existingInvites } = await supabaseAdmin
    .from('roster_import_invites')
    .select('email')
    .eq('agency_id', agencyId)

  const alreadyInvited = new Set<string>(
    (existingInvites || []).map((r: { email: string }) => r.email.toLowerCase().trim())
  )

  // Load existing user emails for de-dupe
  const { data: existingUsers } = await supabaseAdmin
    .from('users')
    .select('email')

  const alreadyUsers = new Set<string>(
    (existingUsers || [])
      .filter((u: { email: string | null }) => u.email)
      .map((u: { email: string }) => u.email.toLowerCase().trim())
  )

  for (const row of rows) {
    const email = row.email?.trim()
    if (!email) {
      skippedRows.push({ email: '(blank)', reason: 'No email address' })
      continue
    }

    const emailNorm = email.toLowerCase()

    // De-dupe: already an active user
    if (alreadyUsers.has(emailNorm)) {
      skippedRows.push({ email, reason: 'Already has a SetReady account' })
      continue
    }

    // De-dupe: already invited by this agency
    if (alreadyInvited.has(emailNorm)) {
      skippedRows.push({ email, reason: 'Already invited by this agency' })
      continue
    }

    // Generate claim token
    const claimToken = randomBytes(32).toString('hex')

    // Sanitize numeric fields
    let heightCm: number | null = null
    if (row.height_cm?.trim()) {
      const n = parseFloat(row.height_cm.trim())
      if (!isNaN(n)) heightCm = n
    }

    // Insert into staging table
    const { error: insertErr } = await supabaseAdmin
      .from('roster_import_invites')
      .insert({
        agency_id: agencyId,
        agent_account_id: session.accountId,
        first_name: row.first_name?.trim() || null,
        last_name: row.last_name?.trim() || null,
        email,
        phone: row.phone?.trim() || null,
        gender: row.gender?.trim() || null,
        date_of_birth: row.date_of_birth?.trim() || null,
        height_cm: heightCm,
        hair_color: row.hair_color?.trim() || null,
        eye_color: row.eye_color?.trim() || null,
        union_status: row.union_status?.trim() || null,
        special_skills: row.special_skills?.trim() || null,
        claim_token: claimToken,
        status: 'invited',
      })

    if (insertErr) {
      skippedRows.push({ email, reason: 'Database error: ' + insertErr.message })
      continue
    }

    imported++
    alreadyInvited.add(emailNorm)

    // Send invite email
    const firstName = row.first_name?.trim() || 'Performer'
    const claimUrl = `${APP_URL}/performer/claim?token=${claimToken}`

    const emailResult = await sendEmail({
      to: email,
      subject: `${agencyName} invited you to join SetReady`,
      html: rosterInviteEmailHtml({ firstName, agencyName, claimUrl }),
    })

    if (emailResult.success) {
      invited++
      await supabaseAdmin
        .from('roster_import_invites')
        .update({ invite_email_sent: true })
        .eq('claim_token', claimToken)
    }
  }

  return NextResponse.json({
    imported,
    invited,
    skipped: skippedRows.length,
    skippedRows,
  })
}
