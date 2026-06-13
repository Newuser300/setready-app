import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createSession, getAgentSession, supabaseAdmin } from '@/lib/casting-auth'

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
  const { action, email, password, name, agencyName, phone, city, website } =
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

    return NextResponse.json({
      success: true,
      message: 'Agency application submitted. We will review and approve within 24 hours.'
    })
  }

  if (action === 'logout') {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('agent_session')
    return response
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  )
}
