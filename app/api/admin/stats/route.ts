import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

async function verifyAdmin(request: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;
  if (!getAdminEmails().includes(user.email.toLowerCase())) return null;
  return { id: user.id, email: user.email };
}

const MODULE_NAMES: Record<number, string> = {
  1: 'Film Set Terminology',
  2: 'Background Acting Terms & Performance',
  3: 'Set Etiquette & Professional Conduct',
  4: 'Safety on Set',
  5: 'Industry Standards, Pay & Career Advancement',
  6: 'Foundation (Stanislavski)',
  7: 'Audition Technique (Shurtleff)',
  8: 'Scene Study (Hagen)',
  9: 'Advanced Technique (Meisner, Adler)',
};

export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
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
    supabaseAdmin.from('user_progress').select('module_id, score').eq('completed', true),
    supabaseAdmin.from('modules').select('id, module_number, title').order('module_number'),
    supabaseAdmin.from('certificates').select('module_id').eq('certificate_type', 'module'),
  ]);

  // Pending payout totals
  const pendingPayouts = pendingPayoutsResult.data || [];
  const pendingPayoutAmount = pendingPayouts.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Module stats: group completed progress by module_id
  const allProgress = allProgressResult.data || [];
  const modules = modulesResult.data || [];

  const certCountByModuleNumber: Record<number, number> = {};
  (certsByModuleResult.data || []).forEach((c: { module_id: number }) => {
    if (c.module_id != null) {
      certCountByModuleNumber[c.module_id] = (certCountByModuleNumber[c.module_id] || 0) + 1;
    }
  });

  const progressByModuleId: Record<string, { count: number; totalScore: number }> = {};
  allProgress.forEach((p: { module_id: string; score: number }) => {
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
    recentUsers: recentUsersResult.data || [],
    moduleStats,
    systemInfo: {
      stripeMode,
      vercelEnv: process.env.VERCEL_ENV || 'local',
    },
  });
}
