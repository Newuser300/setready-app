import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

// GET /api/games/set-crashers/leaderboard?mode=all|week
// Returns: { top: [...], you: { rank, ...row } | null, mode }
// Auth optional: if a Bearer token is sent, the response includes the caller's own rank.

function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  try {
    const mode = req.nextUrl.searchParams.get('mode') === 'week' ? 'week' : 'all'
    const weekKey = isoWeekKey()

    const scoreCol = mode === 'week' ? 'week_score' : 'career_score'

    let query = supabaseAdmin
      .from('set_crashers_scores')
      .select('user_id, handle, career_score, week_score, total_stars, levels_cleared, best_combo')
      .order(scoreCol, { ascending: false })
      .limit(100)
    if (mode === 'week') query = query.eq('week_key', weekKey)

    const { data: rows, error } = await query
    if (error) return NextResponse.json({ error: 'Could not load leaderboard' }, { status: 500 })

    const top = (rows || []).map((r: any, i: number) => ({
      rank: i + 1,
      handle: r.handle,
      score: mode === 'week' ? r.week_score : r.career_score,
      totalStars: r.total_stars,
      levelsCleared: r.levels_cleared,
      bestCombo: r.best_combo,
      userId: r.user_id,
    }))

    // Caller's own rank (if signed in and present)
    let you: any = null
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      if (user) {
        const inTop = top.find((t: any) => t.userId === user.id)
        if (inTop) {
          you = inTop
        } else {
          const { data: mine } = await supabaseAdmin
            .from('set_crashers_scores')
            .select('handle, career_score, week_score, total_stars, levels_cleared, best_combo, week_key')
            .eq('user_id', user.id)
            .maybeSingle()
          if (mine && !(mode === 'week' && mine.week_key !== weekKey)) {
            const myScore = mode === 'week' ? mine.week_score : mine.career_score
            // count how many beat me
            let countQuery = supabaseAdmin
              .from('set_crashers_scores')
              .select('user_id', { count: 'exact', head: true })
              .gt(scoreCol, myScore)
            if (mode === 'week') countQuery = countQuery.eq('week_key', weekKey)
            const { count } = await countQuery
            you = {
              rank: (count ?? 0) + 1,
              handle: mine.handle,
              score: myScore,
              totalStars: mine.total_stars,
              levelsCleared: mine.levels_cleared,
              bestCombo: mine.best_combo,
              userId: user.id,
            }
          }
        }
      }
    }

    return NextResponse.json({ mode, top, you })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
