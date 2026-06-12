import { NextResponse } from 'next/server';
import { verifyAdminRequest, supabaseAdmin } from '@/utils/isAdmin';

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [certsResult, progressResult] = await Promise.all([
    supabaseAdmin
      .from('certificates')
      .select('id, user_id, certificate_type, module_id, module_name, section_name, score, issued_at')
      .order('issued_at', { ascending: false }),
    supabaseAdmin
      .from('user_progress')
      .select('user_id, module_id')
      .eq('completed', true),
  ]);

  const certs = certsResult.data || [];
  const progress = progressResult.data || [];

  // Collect all relevant user IDs
  const certUserIds = certs.map(c => c.user_id);
  const progressUserIds = progress.map(p => p.user_id);
  const allUserIds = [...new Set([...certUserIds, ...progressUserIds])];

  const userMap: Record<string, { email: string; name: string | null }> = {};
  if (allUserIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', allUserIds);
    (users || []).forEach((u: { id: string; email: string; name: string | null }) => {
      userMap[u.id] = { email: u.email, name: u.name };
    });
  }

  const issuedCerts = certs.map(c => ({
    id: c.id,
    user_id: c.user_id,
    user_email: userMap[c.user_id]?.email || 'Unknown',
    user_name: userMap[c.user_id]?.name || null,
    certificate_type: c.certificate_type,
    module_id: c.module_id,
    module_name: c.module_name || c.section_name || null,
    score: c.score,
    issued_at: c.issued_at,
  }));

  // Module cert count per user (module type only)
  const certCountByUser: Record<string, number> = {};
  certs.filter(c => c.certificate_type === 'module').forEach(c => {
    certCountByUser[c.user_id] = (certCountByUser[c.user_id] || 0) + 1;
  });

  // Completed module count per user
  const progressByUser: Record<string, Set<string>> = {};
  progress.forEach(p => {
    if (!progressByUser[p.user_id]) progressByUser[p.user_id] = new Set();
    progressByUser[p.user_id].add(p.module_id);
  });

  // In-progress: has at least 1 completed module but fewer than 9
  const inProgress = Object.entries(progressByUser)
    .map(([userId, moduleSet]) => ({
      user_id: userId,
      email: userMap[userId]?.email || 'Unknown',
      name: userMap[userId]?.name || null,
      completed_count: moduleSet.size,
      cert_count: certCountByUser[userId] || 0,
    }))
    .filter(u => u.completed_count < 9 && u.completed_count > 0)
    .sort((a, b) => b.completed_count - a.completed_count);

  return NextResponse.json({ issuedCerts, inProgress });
}
