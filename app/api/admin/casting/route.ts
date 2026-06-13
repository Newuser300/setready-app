import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value
  if (!token) return false
  try {
    const secret = new TextEncoder().encode(process.env.ADMIN_SECRET || 'admin-secret-change-me')
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'pending'

  if (type === 'pending') {
    const [{ data: pendingCDs }, { data: pendingAgencies }] = await Promise.all([
      supabaseAdmin
        .from('casting_directors')
        .select('id, name, company, email, phone, heard_from, description, created_at')
        .eq('is_verified', false)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('agencies')
        .select('id, name, contact_name, email, phone, city, website, created_at')
        .eq('is_approved', false)
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      castingDirectors: pendingCDs || [],
      agencies: pendingAgencies || [],
    })
  }

  if (type === 'stats') {
    const [
      { count: totalCDs },
      { count: totalAgencies },
      { count: totalRequests },
      { count: totalSubmissions },
      { count: totalPerformers },
    ] = await Promise.all([
      supabaseAdmin.from('casting_directors').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      supabaseAdmin.from('agencies').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabaseAdmin.from('casting_requests').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('casting_submissions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('performer_profiles').select('*', { count: 'exact', head: true }).eq('is_public', true),
    ])

    return NextResponse.json({
      totalCDs: totalCDs || 0,
      totalAgencies: totalAgencies || 0,
      totalRequests: totalRequests || 0,
      totalSubmissions: totalSubmissions || 0,
      totalPerformers: totalPerformers || 0,
    })
  }

  if (type === 'requests') {
    const { data } = await supabaseAdmin
      .from('casting_requests')
      .select(`
        id, production_name, project_type, shoot_date, role_type,
        performers_needed, filled_count, status, created_at,
        casting_directors:casting_director_id (name, company, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json(data || [])
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function POST(req: Request) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, id, entityType } = body

  if (action === 'approve') {
    if (entityType === 'casting_director') {
      await supabaseAdmin
        .from('casting_directors')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', id)
    } else if (entityType === 'agency') {
      await supabaseAdmin
        .from('agencies')
        .update({ is_approved: true, approved_at: new Date().toISOString() })
        .eq('id', id)
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    const { reason } = body
    if (entityType === 'casting_director') {
      await supabaseAdmin.from('casting_directors').delete().eq('id', id)
    } else if (entityType === 'agency') {
      await supabaseAdmin.from('agencies').delete().eq('id', id)
    }
    return NextResponse.json({ success: true, reason })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
