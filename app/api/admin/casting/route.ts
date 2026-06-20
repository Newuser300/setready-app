import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin'
import { notifyAllAgents, notifyIndependentPerformers } from '@/lib/casting-notify'

export async function GET(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'pending'

  if (type === 'pending') {
    const [{ data: pendingCDs }, { data: pendingAgencies }, { data: pendingRequests }] = await Promise.all([
      supabaseAdmin
        .from('casting_directors')
        .select('id, name, company, email, phone, heard_from, description, created_at')
        .eq('is_verified', false)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('agencies')
        .select('id, name, contact_name, email, phone, city, province, website, created_at')
        .eq('is_approved', false)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('casting_requests')
        .select('id, production_name, shoot_date, role_type, performers_needed, created_at, casting_directors(name, company, email)')
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      castingDirectors: pendingCDs || [],
      agencies: pendingAgencies || [],
      pendingRequests: pendingRequests || [],
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
        performers_needed, filled_count, status, moderation_status, created_at,
        casting_directors:casting_director_id (name, company, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json(data || [])
  }

  if (type === 'agents') {
    const { data: agencies } = await supabaseAdmin
      .from('agencies')
      .select(`
        id, name, email, phone, city, province, licence_number,
        is_approved, is_suspended, can_receive_requests, created_at,
        agent_accounts(name, email, role)
      `)
      .eq('is_approved', true)
      .order('name')

    const result = (agencies || []).map((ag: any) => {
      const accounts: any[] = Array.isArray(ag.agent_accounts) ? ag.agent_accounts : ag.agent_accounts ? [ag.agent_accounts] : []
      const owner = accounts.find((a: any) => a.role === 'owner') || accounts[0]
      return {
        id: ag.id,
        agency_name: ag.name,
        owner_name: owner?.name || '',
        owner_email: owner?.email || ag.email,
        city: ag.city,
        province: ag.province || 'BC',
        licence_number: ag.licence_number || null,
        is_suspended: ag.is_suspended || false,
        can_receive_requests: ag.can_receive_requests !== false,
      }
    })

    return NextResponse.json(result)
  }

  if (type === 'casting_directors') {
    const { data: directors } = await supabaseAdmin
      .from('casting_directors')
      .select('id, name, company, email, phone, is_active, auto_approve, created_at')
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
    return NextResponse.json(directors || [])
  }

  if (type === 'castings') {
    const { data: subs } = await supabaseAdmin
      .from('casting_submissions')
      .select('id, performer_user_id, casting_request_id, updated_at, casting_requests:casting_request_id (production_name, shoot_date)')
      .eq('status', 'confirmed')
      .order('updated_at', { ascending: false })

    if (!subs?.length) return NextResponse.json([])

    const userIds = [...new Set(subs.map((s: any) => s.performer_user_id).filter(Boolean))]
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', userIds)
    const userMap: Record<string, { email: string; name: string | null }> = {}
    ;(users || []).forEach((u: any) => { userMap[u.id] = { email: u.email, name: u.name } })

    const result = subs.map((s: any) => ({
      id: s.id,
      performer_name: userMap[s.performer_user_id]?.name || userMap[s.performer_user_id]?.email || 'Unknown',
      performer_email: userMap[s.performer_user_id]?.email || '',
      production_name: (s.casting_requests as any)?.production_name || '—',
      shoot_date: (s.casting_requests as any)?.shoot_date || null,
    }))

    return NextResponse.json(result)
  }

  if (type === 'reports') {
    const { data: reports } = await supabaseAdmin
      .from('casting_request_reports')
      .select('id, casting_request_id, reason, created_at, casting_requests:casting_request_id (production_name, role_type, shoot_date, status, moderation_status, casting_directors:casting_director_id (name, company))')
      .order('created_at', { ascending: false })
    return NextResponse.json(reports || [])
  }

  if (type === 'performers') {
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth()
    const thisMonthStart = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01`
    const thisMonthEnd = new Date(thisYear, thisMonth + 1, 0).toISOString().slice(0, 10)
    const nextMonthDate = new Date(thisYear, thisMonth + 1, 1)
    const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonthEnd = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).toISOString().slice(0, 10)

    const [{ data: performers }, { data: availability }, { data: rosterData }] = await Promise.all([
      supabaseAdmin
        .from('performer_profiles')
        .select('id, union_status, union_priority')
        .eq('is_public', true)
        .order('union_priority', { ascending: true }),
      supabaseAdmin
        .from('performer_availability')
        .select('user_id, date')
        .eq('status', 'available')
        .gte('date', thisMonthStart)
        .lte('date', nextMonthEnd),
      supabaseAdmin
        .from('agency_roster')
        .select('user_id, agencies(name)')
        .eq('status', 'active'),
    ])

    if (!performers?.length) return NextResponse.json([])

    const userIds = performers.map((p: any) => p.id)
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', userIds)

    const userMap: Record<string, { email: string; name: string | null }> = {}
    ;(users || []).forEach((u: any) => { userMap[u.id] = { email: u.email, name: u.name } })

    const thisMonthCounts: Record<string, number> = {}
    const nextMonthCounts: Record<string, number> = {}
    ;(availability || []).forEach((a: any) => {
      if (a.date >= thisMonthStart && a.date <= thisMonthEnd) {
        thisMonthCounts[a.user_id] = (thisMonthCounts[a.user_id] || 0) + 1
      } else if (a.date >= nextMonthStart && a.date <= nextMonthEnd) {
        nextMonthCounts[a.user_id] = (nextMonthCounts[a.user_id] || 0) + 1
      }
    })

    const agencyMap: Record<string, string> = {}
    ;(rosterData || []).forEach((r: any) => {
      if (!agencyMap[r.user_id]) {
        agencyMap[r.user_id] = (r.agencies as any)?.name || ''
      }
    })

    const result = performers.map((p: any) => ({
      id: p.id,
      name: userMap[p.id]?.name || null,
      email: userMap[p.id]?.email || '',
      union_status: p.union_status,
      union_priority: p.union_priority ?? 4,
      this_month_available: thisMonthCounts[p.id] || 0,
      next_month_available: nextMonthCounts[p.id] || 0,
      agency_name: agencyMap[p.id] || null,
    }))

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, id, entityType } = body

  if (action === 'approve') {
    if (entityType === 'casting_director') {
      const { data: cd } = await supabaseAdmin
        .from('casting_directors')
        .select('name, email, company')
        .eq('id', id)
        .single()
      await supabaseAdmin
        .from('casting_directors')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', id)
      if (cd?.email) {
        await sendEmail({
          to: cd.email,
          subject: 'Your SetReady Casting Director Access Has Been Approved',
          html: `<p>Hi ${cd.name || 'there'},</p><p>Your casting director account for <strong>${cd.company || 'your company'}</strong> has been approved on SetReady Casting.</p><p>You can now log in at <a href="https://setready.site/casting/login">setready.site/casting/login</a> and begin posting casting requests.</p><p>— The SetReady Team</p>`,
        }).catch(() => {})
      }
    } else if (entityType === 'agency') {
      const { data: ag } = await supabaseAdmin
        .from('agencies')
        .select('name, email')
        .eq('id', id)
        .single()
      await supabaseAdmin
        .from('agencies')
        .update({ is_approved: true, approved_at: new Date().toISOString() })
        .eq('id', id)
      if (ag?.email) {
        await sendEmail({
          to: ag.email,
          subject: 'Your SetReady Agency Application Has Been Approved',
          html: `<p>Congratulations!</p><p>Your agency <strong>${ag.name}</strong> has been approved on SetReady Casting.</p><p>You can now log in at <a href="https://setready.site/agent/login">setready.site/agent/login</a> and begin building your roster.</p><p>— The SetReady Team</p>`,
        }).catch(() => {})
      }
    } else if (entityType === 'casting_request') {
      const { data: cr } = await supabaseAdmin
        .from('casting_requests')
        .select('id, production_name, shoot_date, location, role_type, performers_needed, description, rate, casting_director_id, casting_directors(email, name)')
        .eq('id', id)
        .single()
      await supabaseAdmin
        .from('casting_requests')
        .update({ moderation_status: 'approved', moderated_at: new Date().toISOString() })
        .eq('id', id)
      if (cr) {
        const { data: settingsRows } = await supabaseAdmin
          .from('admin_settings')
          .select('key, value')
          .in('key', ['email_agents_on_request', 'notify_independent_performers', 'email_independent_performers'])
        const settingsMap: Record<string, string> = {}
        ;(settingsRows || []).forEach((row: any) => { settingsMap[row.key] = row.value })
        await notifyAllAgents(
          'new_casting_request',
          `New Casting Request: ${cr.production_name}`,
          `${cr.role_type} needed for ${cr.shoot_date}${cr.location ? ` in ${cr.location}` : ''}. ${cr.performers_needed || 1} performer${(cr.performers_needed || 1) > 1 ? 's' : ''} needed.`,
          `/agent/dashboard`,
          cr.id,
          cr,
          settingsMap['email_agents_on_request'] === 'true'
        )
        if (settingsMap['notify_independent_performers'] === 'true') {
          try { await notifyIndependentPerformers(cr, settingsMap['email_independent_performers'] === 'true') } catch {}
        }
        const cdEmail = (cr.casting_directors as any)?.email
        const cdName = (cr.casting_directors as any)?.name
        if (cdEmail) {
          await sendEmail({
            to: cdEmail,
            subject: `Your casting request "${cr.production_name}" has been approved`,
            html: `<p>Hi ${cdName || 'there'},</p><p>Your casting request for <strong>${cr.production_name}</strong> has been approved and is now live. Agents will be notified.</p><p>— The SetReady Team</p>`,
          }).catch(() => {})
        }
      }
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    const { reason } = body
    if (entityType === 'casting_director') {
      const { data: cd } = await supabaseAdmin.from('casting_directors').select('name, email').eq('id', id).single()
      await supabaseAdmin.from('casting_directors').delete().eq('id', id)
      if (cd?.email) {
        await sendEmail({
          to: cd.email,
          subject: 'Update on Your SetReady Casting Director Application',
          html: `<p>Hi ${cd.name || 'there'},</p><p>After review, we are unable to approve your casting director application at this time.${reason ? ` Reason: ${reason}` : ''}</p><p>If you have questions, please contact us at setready@mail.com.</p><p>— The SetReady Team</p>`,
        }).catch(() => {})
      }
    } else if (entityType === 'agency') {
      const { data: ag } = await supabaseAdmin.from('agencies').select('name, email, contact_name').eq('id', id).single()
      await supabaseAdmin.from('agencies').delete().eq('id', id)
      if (ag?.email) {
        await sendEmail({
          to: ag.email,
          subject: 'Update on Your SetReady Agency Application',
          html: `<p>Hi ${ag.contact_name || 'there'},</p><p>After review, we are unable to approve your agency application for <strong>${ag.name}</strong> at this time.${reason ? ` Reason: ${reason}` : ''}</p><p>If you have questions, please contact us at setready@mail.com.</p><p>— The SetReady Team</p>`,
        }).catch(() => {})
      }
    } else if (entityType === 'casting_request') {
      const { data: cr } = await supabaseAdmin
        .from('casting_requests')
        .select('production_name, casting_directors(email, name)')
        .eq('id', id)
        .single()
      await supabaseAdmin
        .from('casting_requests')
        .update({ moderation_status: 'rejected', moderated_at: new Date().toISOString(), moderation_reason: reason || null })
        .eq('id', id)
      const cdEmail = (cr?.casting_directors as any)?.email
      const cdName = (cr?.casting_directors as any)?.name
      if (cdEmail) {
        await sendEmail({
          to: cdEmail,
          subject: `Update on your casting request "${cr?.production_name}"`,
          html: `<p>Hi ${cdName || 'there'},</p><p>Your casting request for <strong>${cr?.production_name}</strong> was not approved at this time.${reason ? ` Reason: ${reason}` : ''}</p><p>Please contact us at setready@mail.com if you have questions.</p><p>— The SetReady Team</p>`,
        }).catch(() => {})
      }
    }
    return NextResponse.json({ success: true, reason })
  }

  if (action === 'suspend_agent') {
    await supabaseAdmin
      .from('agencies')
      .update({ is_suspended: true, can_receive_requests: false })
      .eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'restore_agent') {
    await supabaseAdmin
      .from('agencies')
      .update({ is_suspended: false, can_receive_requests: true })
      .eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'suspend_cd') {
    await supabaseAdmin.from('casting_directors').update({ is_active: false }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'restore_cd') {
    await supabaseAdmin.from('casting_directors').update({ is_active: true }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  if (action === 'toggle_auto_approve') {
    await supabaseAdmin.from('casting_directors').update({ auto_approve: body.value === true }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
