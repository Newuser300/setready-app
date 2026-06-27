import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'

// ── Admin: full detail + edit for a single agency and its roster ──
// SECURITY: every method calls verifyAdminRequest(req) FIRST and returns 401 on failure.
// This is the same keystone every other admin route uses (Bearer token → Supabase-verified
// user → admin-email allowlist/table). No data is touched before the gate passes.

async function writeAudit(adminId: string, adminEmail: string, action: string, target: string, detail: any) {
  // Best-effort audit trail. Never blocks the operation if the table is absent.
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
  const agencyId = searchParams.get('agencyId')
  if (!agencyId) return NextResponse.json({ error: 'agencyId required' }, { status: 400 })

  // 1) Full agency record (operational + contact). Excludes password_hash explicitly.
  const { data: agency, error: agErr } = await supabaseAdmin
    .from('agencies')
    .select('id, name, contact_name, email, phone, city, province, website, licence_number, description, is_approved, is_suspended, is_pro, pro_expires_at, can_receive_requests, plan, plan_expires_at, stripe_customer_id, created_at, approved_at, logo_url')
    .eq('id', agencyId)
    .maybeSingle()
  if (agErr) return NextResponse.json({ error: agErr.message }, { status: 500 })
  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

  // 2) Agent accounts under this agency (staff logins). Excludes password_hash.
  const { data: agents } = await supabaseAdmin
    .from('agent_accounts')
    .select('id, name, email, role, created_at, last_login')
    .eq('agency_id', agencyId)
    .order('role')

  // 3) Full roster — every performer this agency has added, with profile + user data.
  const { data: roster } = await supabaseAdmin
    .from('agency_roster')
    .select('id, status, joined_at, notes, performer_user_id')
    .eq('agency_id', agencyId)
    .order('joined_at', { ascending: false })

  const userIds = (roster || []).map(r => r.performer_user_id).filter(Boolean)
  let usersMap: Record<string, any> = {}
  let profilesMap: Record<string, any> = {}
  if (userIds.length) {
    const [{ data: users }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from('users').select('id, email, name, home_city, home_region_code').in('id', userIds),
      supabaseAdmin.from('performer_profiles').select('user_id, headshot_url, union_status, gender, agency_id, is_public, verified_badge').in('user_id', userIds),
    ])
    ;(users || []).forEach((u: any) => { usersMap[u.id] = u })
    ;(profiles || []).forEach((p: any) => { profilesMap[p.user_id] = p })
  }

  const rosterFull = (roster || []).map(r => ({
    rosterId: r.id,
    status: r.status,
    joined_at: r.joined_at,
    notes: r.notes || null, // private agent note — admin can see for moderation
    user_id: r.performer_user_id,
    name: usersMap[r.performer_user_id]?.name || null,
    email: usersMap[r.performer_user_id]?.email || null,
    city: usersMap[r.performer_user_id]?.home_city || null,
    headshot_url: profilesMap[r.performer_user_id]?.headshot_url || null,
    union_status: profilesMap[r.performer_user_id]?.union_status || null,
    is_public: profilesMap[r.performer_user_id]?.is_public ?? null,
    profile_agency_id: profilesMap[r.performer_user_id]?.agency_id || null,
  }))

  return NextResponse.json({ agency, agents: agents || [], roster: rosterFull })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, agencyId } = body
  if (!agencyId) return NextResponse.json({ error: 'agencyId required' }, { status: 400 })

  // Edit agency operational/contact fields (whitelist — never password_hash/stripe ids)
  if (action === 'update_agency') {
    const allowed = ['name', 'contact_name', 'email', 'phone', 'city', 'province', 'website', 'licence_number', 'description', 'can_receive_requests', 'is_pro']
    const updates: Record<string, any> = {}
    for (const k of allowed) if (k in body) updates[k] = body[k]
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    const { error } = await supabaseAdmin.from('agencies').update(updates).eq('id', agencyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit(admin.id, admin.email, 'update_agency', agencyId, updates)
    return NextResponse.json({ success: true })
  }

  // Remove a performer from this agency's roster (and clear their profile link if it matched)
  if (action === 'remove_roster') {
    const { rosterId } = body
    if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })
    const { data: row } = await supabaseAdmin.from('agency_roster').select('performer_user_id').eq('id', rosterId).eq('agency_id', agencyId).maybeSingle()
    const { error } = await supabaseAdmin.from('agency_roster').delete().eq('id', rosterId).eq('agency_id', agencyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (row?.performer_user_id) {
      await supabaseAdmin.from('performer_profiles').update({ agency_id: null }).eq('user_id', row.performer_user_id).eq('agency_id', agencyId)
    }
    await writeAudit(admin.id, admin.email, 'remove_roster', agencyId, { rosterId, performer: row?.performer_user_id })
    return NextResponse.json({ success: true })
  }

  // Add a performer to this agency's roster by email (admin override; instant active)
  if (action === 'add_roster') {
    const { email } = body
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    const { data: found } = await supabaseAdmin.from('users').select('id').eq('email', String(email).toLowerCase().trim()).maybeSingle()
    if (!found) return NextResponse.json({ error: 'No user with that email' }, { status: 404 })
    const { data: existing } = await supabaseAdmin.from('agency_roster').select('id').eq('agency_id', agencyId).eq('performer_user_id', found.id).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already on roster' }, { status: 409 })
    const { error } = await supabaseAdmin.from('agency_roster').insert({ agency_id: agencyId, performer_user_id: found.id, status: 'active' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await supabaseAdmin.from('performer_profiles').update({ agency_id: agencyId }).eq('user_id', found.id)
    await writeAudit(admin.id, admin.email, 'add_roster', agencyId, { email, performer: found.id })
    return NextResponse.json({ success: true })
  }

  // Suspend / restore agency (mirrors existing casting route semantics)
  if (action === 'suspend' || action === 'restore') {
    const suspend = action === 'suspend'
    const { error } = await supabaseAdmin.from('agencies').update({ is_suspended: suspend, can_receive_requests: !suspend }).eq('id', agencyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit(admin.id, admin.email, action, agencyId, null)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
