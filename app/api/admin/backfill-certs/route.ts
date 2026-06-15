import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/utils/isAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const admin = await verifyAdminRequest(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, moduleIds } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single()

  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: completedProgress } = await supabaseAdmin
    .from('user_progress')
    .select('module_id, score, completed_at')
    .eq('user_id', userId)
    .eq('completed', true)

  if (!completedProgress?.length) {
    return NextResponse.json({
      success: true,
      userId,
      userEmail: targetUser.email,
      results: [],
      errors: [],
      summary: '0 certificates created, 0 already existed',
    })
  }

  const moduleUuids = completedProgress.map(p => p.module_id)
  const { data: modules } = await supabaseAdmin
    .from('modules')
    .select('id, module_number, title, section')
    .in('id', moduleUuids)

  const filteredModules = moduleIds
    ? (modules || []).filter(m => moduleIds.includes(m.id))
    : (modules || [])

  const results: { module: string; status: string }[] = []
  const errors: { module: string; error: string }[] = []

  for (const progress of completedProgress) {
    const mod = filteredModules.find(m => m.id === progress.module_id)
    if (!mod) continue

    const moduleName = `Module ${mod.module_number}: ${mod.title}`

    const { data: existing } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', mod.module_number)
      .eq('certificate_type', 'module')
      .maybeSingle()

    if (existing) {
      results.push({ module: moduleName, status: 'already exists' })
      continue
    }

    const { error } = await supabaseAdmin.from('certificates').insert({
      user_id: userId,
      certificate_type: 'module',
      module_id: mod.module_number,
      module_name: moduleName,
      section_name: null,
      score: progress.score ?? 100,
      certificate_hash: `backfill-${userId.slice(0, 8)}-mod${mod.module_number}-${Date.now()}`,
    })

    if (error) {
      errors.push({ module: moduleName, error: error.message })
    } else {
      await supabaseAdmin
        .from('user_progress')
        .upsert(
          { user_id: userId, module_id: progress.module_id, completed: true, score: progress.score ?? 100 },
          { onConflict: 'user_id,module_id' }
        )
      results.push({ module: moduleName, status: 'created' })
    }
  }

  const created = results.filter(r => r.status === 'created').length
  const existed = results.filter(r => r.status === 'already exists').length

  return NextResponse.json({
    success: true,
    userId,
    userEmail: targetUser.email,
    results,
    errors,
    summary: `${created} certificates created, ${existed} already existed`,
  })
}
