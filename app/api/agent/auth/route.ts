import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createSession, getAgentSession, deleteSession, supabaseAdmin } from '@/lib/casting-auth'
import { sendEmail } from '@/lib/email'

export async function GET() {
  const session = await getAgentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agent } = await supabaseAdmin
    .from('agent_accounts')
    .select('name, agency_id, agencies(name)')
    .eq('id', session.accountId)
    .single()

  return NextResponse.json({
    name: agent?.name || session.name,
    agencyName: (agent?.agencies as any)?.name || '',
    agencyId: agent?.agency_id,
  })
}

export async function POST(req: Request) {
  const { action, email, password, name, agencyName, phone, city, province, licenceNumber, website, currentPassword, newPassword } =
    await req.json()

  if (action === 'login') {
    const { data: agent } = await supabaseAdmin
      .from('agent_accounts')
      .select('*, agencies(*)')
      .eq('email', email.toLowerCase())
      .single()

    if (!agent) return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )

    const valid = await bcrypt.compare(password, agent.password_hash)
    if (!valid) return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )

    if (!agent.agencies?.is_approved) return NextResponse.json(
      { error: 'Agency pending approval.' },
      { status: 403 }
    )

    const token = await createSession(agent.id, 'agent', agent.email, agent.name)

    await supabaseAdmin
      .from('agent_accounts')
      .update({ last_login: new Date().toISOString() })
      .eq('id', agent.id)

    const response = NextResponse.json({
      success: true,
      name: agent.name,
      agencyName: agent.agencies?.name,
      agencyId: agent.agency_id,
      plan: agent.agencies?.plan
    })
    response.cookies.set('agent_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    return response
  }

  if (action === 'register') {
    const hash = await bcrypt.hash(password, 12)

    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .insert({
        name: agencyName,
        email: email.toLowerCase(),
        phone,
        city,
        province: province || 'BC',
        licence_number: licenceNumber || null,
        website,
        password_hash: hash,
        is_approved: false,
        plan: 'basic'
      })
      .select()
      .single()

    if (agencyError) return NextResponse.json(
      { error: 'Registration failed. Email may already exist.' },
      { status: 400 }
    )

    await supabaseAdmin
      .from('agent_accounts')
      .insert({
        agency_id: agency.id,
        name,
        email: email.toLowerCase(),
        password_hash: hash,
        role: 'owner'
      })

    await supabaseAdmin
      .from('casting_notifications')
      .insert({
        recipient_type: 'admin',
        recipient_id: '00000000-0000-0000-0000-000000000000',
        type: 'new_agency_application',
        title: 'New Agency Application',
        message: `${agencyName} has applied to join SetReady Casting.`,
        action_url: '/admin'
      })

    // Email the admin(s) so a pending application isn't missed
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `New agency application: ${agencyName}`,
        html: `<p>A new agency has applied and is awaiting approval.</p><p><strong>Agency:</strong> ${agencyName}<br/><strong>Contact:</strong> ${name}<br/><strong>Email:</strong> ${email.toLowerCase()}${phone ? `<br/><strong>Phone:</strong> ${phone}` : ''}${city ? `<br/><strong>City:</strong> ${city}, ${province || 'BC'}` : ''}${licenceNumber ? `<br/><strong>Licence:</strong> ${licenceNumber}` : ''}</p><p>Review under Casting → Pending Applications: <a href="https://setready.site/admin">setready.site/admin</a></p>`,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: 'Agency application submitted. We will review and approve within 24 hours.'
    })
  }

  if (action === 'update_profile') {
    const session = await getAgentSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const newName = (name || '').trim()
    if (!newName) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    await supabaseAdmin.from('agent_accounts').update({ name: newName }).eq('id', session.accountId)
    return NextResponse.json({ success: true, name: newName })
  }

  if (action === 'change_password') {
    const session = await getAgentSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
    if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })

    const { data: acct } = await supabaseAdmin
      .from('agent_accounts')
      .select('password_hash')
      .eq('id', session.accountId)
      .single()
    if (!acct) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, acct.password_hash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const hash = await bcrypt.hash(newPassword, 12)
    await supabaseAdmin.from('agent_accounts').update({ password_hash: hash }).eq('id', session.accountId)
    return NextResponse.json({ success: true })
  }

  if (action === 'logout') {
    const cookieStore = await cookies()
    const token = cookieStore.get('agent_session')?.value
    if (token) await deleteSession(token)
    const response = NextResponse.json({ success: true })
    response.cookies.delete('agent_session')
    return response
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  )
}
