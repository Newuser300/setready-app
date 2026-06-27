import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'

// ── Admin: full detail + edit for a single casting director ──
// SECURITY: every method calls verifyAdminRequest(req) FIRST and returns 401 on failure.
// Same keystone as every other admin route. password_hash and stripe ids are never selected.

async function writeAudit(adminId: string, adminEmail: string, action: string, target: string, detail: any) {
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: adminId, admin_email: adminEmail, action, target_id: target,
      detail: detail ? JSON.stringify(detail) : null,
    })
  } catch { /* audit table optional; ignore */ }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cdId = searchParams.get('cdId')
  if (!cdId) return NextResponse.json({ error: 'cdId required' }, { status: 400 })

  // Full CD record — explicit column list; OMITS password_hash and stripe_customer_id.
  const { data: cd, error } = await supabaseAdmin
    .from('casting_directors')
    .select('id, name, company, email, phone, bio, description, heard_from, is_active, is_verified, auto_approve, is_pro, pro_expires_at, plan, plan_expires_at, created_at, verified_at, last_login')
    .eq('id', cdId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cd) return NextResponse.json({ error: 'Casting director not found' }, { status: 404 })

  // Their casting requests (activity).
  const { data: requests } = await supabaseAdmin
    .from('casting_requests')
    .select('id, production_name, project_type, shoot_date, role_type, number_needed, filled_count, status, moderation_status, created_at')
    .eq('casting_director_id', cdId)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ castingDirector: cd, requests: requests || [] })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, cdId } = body
  if (!cdId) return NextResponse.json({ error: 'cdId required' }, { status: 400 })

  // Edit CD fields (whitelist — never password_hash / stripe ids)
  if (action === 'update_cd') {
    const allowed = ['name', 'company', 'email', 'phone', 'bio', 'description', 'is_active', 'auto_approve', 'is_pro']
    const updates: Record<string, any> = {}
    for (const k of allowed) if (k in body) updates[k] = body[k]
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    const { error } = await supabaseAdmin.from('casting_directors').update(updates).eq('id', cdId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit(admin.id, admin.email, 'update_cd', cdId, updates)
    return NextResponse.json({ success: true })
  }

  // Suspend / restore (mirrors existing casting route: is_active flag)
  if (action === 'suspend' || action === 'restore') {
    const active = action === 'restore'
    const { error } = await supabaseAdmin.from('casting_directors').update({ is_active: active }).eq('id', cdId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit(admin.id, admin.email, action + '_cd', cdId, null)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
