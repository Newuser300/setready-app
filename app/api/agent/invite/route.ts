import { NextRequest, NextResponse } from 'next/server'
import { getAgentSession, supabaseAdmin } from '@/lib/casting-auth'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: invite } = await supabaseAdmin
    .from('agency_invites')
    .select('*, agencies(name)')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  if (invite.is_used) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })

  return NextResponse.json({
    valid: true,
    agencyName: (invite.agencies as any)?.name || '',
    invitedEmail: invite.invited_email,
    agencyId: invite.agency_id,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'create') {
    const session = await getAgentSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: account } = await supabaseAdmin
      .from('agent_accounts')
      .select('agency_id, role')
      .eq('id', session.accountId)
      .maybeSingle()

    if (!account?.agency_id) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    if (account.role !== 'owner' && account.role !== 'admin') {
      return NextResponse.json({ error: 'Only agency owners can send invites' }, { status: 403 })
    }

    const { invitedEmail } = body
    if (!invitedEmail?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Check if email already has an account in this agency
    const { data: existing } = await supabaseAdmin
      .from('agent_accounts')
      .select('id')
      .eq('email', invitedEmail.toLowerCase().trim())
      .eq('agency_id', account.agency_id)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'That email already belongs to a team member' }, { status: 409 })

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('agency_invites').insert({
      agency_id: account.agency_id,
      invited_email: invitedEmail.toLowerCase().trim(),
      token,
      invited_by: session.accountId,
      expires_at: expiresAt,
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://setready.ca'}/agent/join?token=${token}`

    return NextResponse.json({ success: true, inviteUrl, token })
  }

  if (action === 'join') {
    const { token, name, password } = body
    if (!token || !name || !password) {
      return NextResponse.json({ error: 'token, name, and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const { data: invite } = await supabaseAdmin
      .from('agency_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    if (invite.is_used) return NextResponse.json({ error: 'Invite already used' }, { status: 410 })
    if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 })

    // Check email not already in agency
    const { data: existingAccount } = await supabaseAdmin
      .from('agent_accounts')
      .select('id')
      .eq('email', invite.invited_email)
      .maybeSingle()

    if (existingAccount) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

    const hash = await bcrypt.hash(password, 12)

    const { data: newAccount, error: insertErr } = await supabaseAdmin
      .from('agent_accounts')
      .insert({
        agency_id: invite.agency_id,
        name: name.trim(),
        email: invite.invited_email,
        password_hash: hash,
        role: 'member',
      })
      .select()
      .single()

    if (insertErr) return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })

    await supabaseAdmin
      .from('agency_invites')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({ success: true, email: invite.invited_email })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
