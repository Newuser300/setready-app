import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

// POST /api/games/set-crashers/score
// Body: { handle, careerScore, totalStars, levelsCleared, bestCombo }
// Auth: Authorization: Bearer <accessToken>
// Upserts the user's row, keeping the HIGHER career score (never lowers it).

function isoWeekKey(d = new Date()): string {
  // ISO week, e.g. "2026-W26"
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const careerScore = Math.max(0, Math.floor(Number(body?.careerScore) || 0))
    const totalStars = Math.max(0, Math.floor(Number(body?.totalStars) || 0))
    const levelsCleared = Math.max(0, Math.floor(Number(body?.levelsCleared) || 0))
    const bestCombo = Math.max(0, Math.floor(Number(body?.bestCombo) || 0))
    let handle = String(body?.handle || 'Player').trim().slice(0, 20)
    if (!handle) handle = 'Player'

    const weekKey = isoWeekKey()

    // Read existing to keep the best (and reset weekly score on a new week).
    const { data: existing } = await supabaseAdmin
      .from('set_crashers_scores')
      .select('career_score, week_key, week_score')
      .eq('user_id', user.id)
      .maybeSingle()

    const newCareer = existing ? Math.max(existing.career_score, careerScore) : careerScore
    // weekly: if same week, keep higher; if new week, this becomes the week's score
    const sameWeek = existing && existing.week_key === weekKey
    const newWeek = sameWeek ? Math.max(existing.week_score, careerScore) : careerScore

    const { error: upErr } = await supabaseAdmin
      .from('set_crashers_scores')
      .upsert({
        user_id: user.id,
        handle,
        career_score: newCareer,
        total_stars: totalStars,
        levels_cleared: levelsCleared,
        best_combo: bestCombo,
        week_key: weekKey,
        week_score: newWeek,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upErr) return NextResponse.json({ error: 'Could not save score' }, { status: 500 })
    return NextResponse.json({ ok: true, careerScore: newCareer })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
