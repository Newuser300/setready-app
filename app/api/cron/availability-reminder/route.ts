import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, buildAvailabilityReminderEmail } from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = nextMonthDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

  // Fetch all active performers with email addresses
  const { data: performers, error } = await supabaseAdmin
    .from('users')
    .select('id, email, raw_user_meta_data')
    .not('email', 'is', null)

  if (error) {
    console.error('[availability-reminder] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const user of performers || []) {
    try {
      const performerName = user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name || user.email?.split('@')[0] || 'Performer'
      await sendEmail({
        to: user.email,
        subject: `📅 Update your ${nextMonth} availability on SetReady`,
        html: buildAvailabilityReminderEmail({ performerName, nextMonth }),
      })
      sent++
    } catch (err) {
      console.error(`[availability-reminder] failed for ${user.email}:`, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed, nextMonth })
}
