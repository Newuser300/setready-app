import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createSession, getCastingSession, deleteSession, supabaseAdmin } from '@/lib/casting-auth'
import { sendEmail } from '@/lib/email'

export async function GET() {
  const session = await getCastingSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cd } = await supabaseAdmin
    .from('casting_directors')
    .select('id, name, email, company, is_verified, is_active')
    .eq('id', session.accountId)
    .single()

  if (!cd) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ name: cd.name, email: cd.email, company: cd.company, isVerified: cd.is_verified })
}

export async function POST(req: Request) {
  const { action, email, password, name, company, phone, heardFrom, description } = await req.json()

  if (action === 'login') {
    const { data: cd } = await supabaseAdmin
      .from('casting_directors')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (!cd) return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )

    const valid = await bcrypt.compare(password, cd.password_hash)
    if (!valid) return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )

    if (!cd.is_verified) return NextResponse.json(
      { error: 'Account pending approval. We will email you when approved.' },
      { status: 403 }
    )

    if (cd.is_active === false) return NextResponse.json(
      { error: 'Your account has been suspended. Please contact setready@mail.com.' },
      { status: 403 }
    )

    const token = await createSession(cd.id, 'casting_director', cd.email, cd.name)

    await supabaseAdmin
      .from('casting_directors')
      .update({ last_login: new Date().toISOString() })
      .eq('id', cd.id)

    const response = NextResponse.json({
      success: true,
      name: cd.name,
      email: cd.email,
      plan: cd.plan
    })
    response.cookies.set('casting_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    return response
  }

  if (action === 'register') {
    const existing = await supabaseAdmin
      .from('casting_directors')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing.data) return NextResponse.json(
      { error: 'Email already registered' },
      { status: 400 }
    )

    const hash = await bcrypt.hash(password, 12)
    const { error } = await supabaseAdmin
      .from('casting_directors')
      .insert({
        name,
        email: email.toLowerCase(),
        company,
        phone,
        heard_from: heardFrom || null,
        description: description || null,
        password_hash: hash,
        is_verified: false,
        plan: 'basic'
      })

    if (error) return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )

    await supabaseAdmin
      .from('casting_notifications')
      .insert({
        recipient_type: 'admin',
        recipient_id: '00000000-0000-0000-0000-000000000000',
        type: 'new_cd_application',
        title: 'New Casting Director Application',
        message: `${name} from ${company} has applied for casting director access.`,
        action_url: '/admin'
      })

    // Email the admin(s) so a pending application isn't missed
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `New casting director application: ${name}`,
        html: `<p>A new casting director has applied and is awaiting approval.</p><p><strong>Name:</strong> ${name}<br/><strong>Company:</strong> ${company || '—'}<br/><strong>Email:</strong> ${email.toLowerCase()}${phone ? `<br/><strong>Phone:</strong> ${phone}` : ''}</p><p>Review under Casting → Pending Applications: <a href="https://setready.site/admin">setready.site/admin</a></p>`,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted. You will receive an email when approved, usually within 24 hours.'
    })
  }

  if (action === 'logout') {
    const cookieStore = await cookies()
    const token = cookieStore.get('casting_session')?.value
    if (token) await deleteSession(token)
    const response = NextResponse.json({ success: true })
    response.cookies.delete('casting_session')
    return response
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  )
}
