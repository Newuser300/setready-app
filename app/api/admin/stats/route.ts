import { NextResponse } from 'next/server';
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin';

const MODULE_NAMES: Record<number, string> = {
  1: 'Film Set Terminology',
  2: 'Background Acting Terms & Performance',
  3: 'Set Etiquette & Professional Conduct',
  4: 'Safety on Set',
  5: 'Industry Standards, Pay & Career Advancement',
  6: 'Foundation',
  7: 'Audition Technique',
  8: 'Scene Study',
  9: 'Advanced Technique',
};

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [
    usersCountResult,
    activeSubsResult,
    section2Result,
    certsCountResult,
    pendingPayoutsResult,
    recentUsersResult,
    allProgressResult,
    modulesResult,
    certsByModuleResult,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('section2_unlocked', true),
    supabaseAdmin.from('certificates').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('referral_payout_requests').select('id, amount').eq('status', 'pending'),
    supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_status, section2_unlocked, referral_code, referred_by, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin.from('user_progress').select('user_id, module_id, score').eq('completed', true),
    supabaseAdmin.from('modules').select('id, module_number, title').order('module_number'),
    supabaseAdmin.from('certificates').select('module_id').eq('certificate_type', 'module'),
  ]);

  const pendingPayouts = pendingPayoutsResult.data || [];
  const pendingPayoutAmount = pendingPayouts.reduce((sum, r) => sum + (r.amount || 0), 0);

  const allProgress = allProgressResult.data || [];
  const modules = modulesResult.data || [];

  // Per-user completed module count for the Progress column
  const progressByUserId: Record<string, number> = {};
  allProgress.forEach((p: { user_id: string; module_id: string; score: number }) => {
    if (p.user_id) progressByUserId[p.user_id] = (progressByUserId[p.user_id] || 0) + 1;
  });

  // Look up referrer emails for the Referred By column
  const referrerIds = (recentUsersResult.data || [])
    .filter(u => u.referred_by)
    .map(u => u.referred_by as string);

  const referrerEmailMap: Record<string, string> = {};
  if (referrerIds.length > 0) {
    const { data: referrers } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('id', referrerIds);
    (referrers || []).forEach((r: { id: string; email: string }) => {
      referrerEmailMap[r.id] = r.email;
    });
  }

  const recentUsersEnriched = (recentUsersResult.data || []).map(u => ({
    ...u,
    referrer_email: u.referred_by ? (referrerEmailMap[u.referred_by] || null) : null,
    progress_count: progressByUserId[u.id] || 0,
  }));

  const certCountByModuleNumber: Record<number, number> = {};
  (certsByModuleResult.data || []).forEach((c: { module_id: number }) => {
    if (c.module_id != null) {
      certCountByModuleNumber[c.module_id] = (certCountByModuleNumber[c.module_id] || 0) + 1;
    }
  });

  const progressByModuleId: Record<string, { count: number; totalScore: number }> = {};
  allProgress.forEach((p: { user_id: string; module_id: string; score: number }) => {
    if (!progressByModuleId[p.module_id]) progressByModuleId[p.module_id] = { count: 0, totalScore: 0 };
    progressByModuleId[p.module_id].count++;
    progressByModuleId[p.module_id].totalScore += p.score || 0;
  });

  const moduleStats = modules.map((mod: { id: string; module_number: number; title: string }) => {
    const prog = progressByModuleId[mod.id] || { count: 0, totalScore: 0 };
    const num = mod.module_number;
    return {
      moduleNumber: num,
      title: MODULE_NAMES[num] || mod.title,
      completions: prog.count,
      avgScore: prog.count > 0 ? Math.round(prog.totalScore / prog.count) : 0,
      certificates: certCountByModuleNumber[num] || 0,
    };
  });

  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const stripeMode = stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';

  return NextResponse.json({
    stats: {
      totalUsers: usersCountResult.count ?? 0,
      activeSubscribers: activeSubsResult.count ?? 0,
      section2Purchases: section2Result.count ?? 0,
      totalCertificates: certsCountResult.count ?? 0,
      pendingPayouts: pendingPayouts.length,
      pendingPayoutAmount,
    },
    recentUsers: recentUsersEnriched,
    moduleStats,
    systemInfo: {
      stripeMode,
      vercelEnv: process.env.VERCEL_ENV || 'local',
    },
  });
}
