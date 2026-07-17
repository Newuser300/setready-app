import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/utils/isAdmin'
import { sendEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bgready.site'

function tableFor(type: string) {
  if (type === 'agent') return 'agent_accounts'
  if (type === 'casting') return 'casting_directors'
  return null
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  // ── Request a reset link ──
  if (action === 'request') {
    const { email, accountType } = body
    const table = tableFor(accountType)
    if (!email || !table) {
      return NextResponse.json({ error: 'Email and account type required' }, { status: 400 })
    }

    const { data: account } = await supabaseAdmin
      .from(table)
      .select('id, email, name')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    // Always return success (do not reveal whether the email exists)
    if (account) {
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

      await supabaseAdmin.from('password_reset_tokens').insert({
        token,
        account_type: accountType,
        account_id: account.id,
        email: account.email,
        expires_at: expiresAt,
      })

      const resetUrl = `${APP_URL}/auth/reset-password?token=${token}&type=${accountType}`
      await sendEmail({
        to: account.email,
        subject: 'Reset your BGReady password',
        html: `<p>Hi ${account.name || 'there'},</p>
<p>We received a request to reset your BGReady password. Click the link below to choose a new one. This link expires in 1 hour.</p>
<p><a href="${resetUrl}" style="display:inline-block;background:#F59E0B;color:#1a1a2e;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Reset Password</a></p>
<p style="color:#888;font-size:12px;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
<p style="color:#888;font-size:12px;">Or paste this link into your browser:<br/>${resetUrl}</p>`,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  }

  // ── Confirm the reset ──
  if (action === 'reset') {
    const { token, password } = body
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const { data: row } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (!row) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    if (row.used) return NextResponse.json({ error: 'This reset link has already been used' }, { status: 400 })
    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })
    }

    const table = tableFor(row.account_type)
    if (!table) return NextResponse.json({ error: 'Invalid account type' }, { status: 400 })

    const hash = await bcrypt.hash(password, 12)
    const { error: updateErr } = await supabaseAdmin
      .from(table)
      .update({ password_hash: hash })
      .eq('id', row.account_id)

    if (updateErr) return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', row.id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
