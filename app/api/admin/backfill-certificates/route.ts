import { NextResponse } from 'next/server';
import { generateCertificatePDF } from '@/lib/certificate-generator';
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

// ── GET: debug info for a user ────────────────────────────────────────────────
// Usage: GET /api/admin/backfill-certificates?userId=<uuid>
//        GET /api/admin/backfill-certificates?email=user@example.com
export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let userId = searchParams.get('userId');
  const email = searchParams.get('email');

  if (!userId && !email) {
    return NextResponse.json({ error: 'userId or email query param required' }, { status: 400 });
  }

  if (!userId && email) {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const found = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) return NextResponse.json({ error: `No account found for: ${email}` }, { status: 404 });
    userId = found.id;
  }

  const { count: totalCerts, error: certCountErr } = await supabaseAdmin
    .from('certificates')
    .select('*', { count: 'exact', head: true });

  const { data: userCerts, error: userCertErr } = await supabaseAdmin
    .from('certificates')
    .select('id, module_id, certificate_type, score, created_at')
    .eq('user_id', userId);

  const { count: totalProgress, error: progressCountErr } = await supabaseAdmin
    .from('user_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: completedProgress, error: completedErr } = await supabaseAdmin
    .from('user_progress')
    .select('module_id, completed, score')
    .eq('user_id', userId)
    .eq('completed', true);

  const moduleIds = (completedProgress || []).map(p => p.module_id);
  const { data: modules, error: modulesErr } = await supabaseAdmin
    .from('modules')
    .select('id, module_number, title, section')
    .in('id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000']);

  const enrichedCompleted = (completedProgress || []).map(p => {
    const mod = modules?.find(m => m.id === p.module_id);
    return {
      progress_module_id: p.module_id,
      module_number: mod?.module_number ?? null,
      title: mod?.title ?? null,
      section: mod?.section ?? null,
      score: p.score,
    };
  });

  return NextResponse.json({
    userId,
    debug: {
      totalCertificatesInTable: totalCerts ?? 0,
      certificatesForUser: userCerts ?? [],
      totalProgressRowsForUser: totalProgress ?? 0,
      completedModulesForUser: enrichedCompleted,
      errors: {
        certCount: certCountErr?.message ?? null,
        userCert: userCertErr?.message ?? null,
        progressCount: progressCountErr?.message ?? null,
        completed: completedErr?.message ?? null,
        modules: modulesErr?.message ?? null,
      },
    },
  });
}

// ── POST: backfill certificates for a user ────────────────────────────────────
export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required in request body' }, { status: 400 });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr) {
    console.error('[backfill-certs] Failed to fetch user profile:', profileErr.message);
    return NextResponse.json({ error: 'Failed to fetch user profile', details: profileErr.message }, { status: 500 });
  }

  const recipientName = (profile?.name || profile?.email?.split('@')[0] || 'Student').toUpperCase();

  const { data: completedProgress, error: progressErr } = await supabaseAdmin
    .from('user_progress')
    .select('module_id, score')
    .eq('user_id', userId)
    .eq('completed', true);

  if (progressErr) {
    return NextResponse.json({ error: 'Failed to fetch user progress', details: progressErr.message }, { status: 500 });
  }

  if (!completedProgress || completedProgress.length === 0) {
    return NextResponse.json({ message: 'No completed modules found for this user', created: 0, skipped: 0 });
  }

  const moduleUuids = completedProgress.map(p => p.module_id);
  const { data: modules, error: modulesErr } = await supabaseAdmin
    .from('modules')
    .select('id, module_number, title, section')
    .in('id', moduleUuids);

  if (modulesErr) {
    return NextResponse.json({ error: 'Failed to fetch module details', details: modulesErr.message }, { status: 500 });
  }

  const results: Array<{ moduleNumber: number; title: string; status: 'created' | 'skipped' | 'error'; detail?: string }> = [];
  let created = 0;
  let skipped = 0;

  const issueDate = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  for (const progress of completedProgress) {
    const mod = modules?.find(m => m.id === progress.module_id);
    if (!mod) {
      results.push({ moduleNumber: 0, title: `Unknown (${progress.module_id})`, status: 'skipped', detail: 'Module UUID not found in modules table' });
      skipped++;
      continue;
    }

    const moduleNumber = mod.module_number;
    const courseName = `Module ${moduleNumber}: ${MODULE_NAMES[moduleNumber] || mod.title}`;

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleNumber)
      .eq('certificate_type', 'module')
      .maybeSingle();

    if (existingErr) {
      results.push({ moduleNumber, title: courseName, status: 'error', detail: existingErr.message });
      continue;
    }

    if (existing) {
      results.push({ moduleNumber, title: courseName, status: 'skipped', detail: 'Certificate already exists' });
      skipped++;
      continue;
    }

    const score = progress.score ?? 100;
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const certificateHash = `${userId.substring(0, 8)}-module-${timestamp}-${randomString}`;

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateCertificatePDF({
        recipientName,
        courseName,
        score,
        issueDate,
        certificateId: certificateHash,
      });
    } catch (pdfErr: unknown) {
      const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
      results.push({ moduleNumber, title: courseName, status: 'error', detail: `PDF generation failed: ${msg}` });
      continue;
    }

    const fileName = `${userId}/module_${moduleNumber}_backfill_${timestamp}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('certificates')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      results.push({ moduleNumber, title: courseName, status: 'error', detail: `Upload failed: ${uploadErr.message}` });
      continue;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('certificates')
      .getPublicUrl(fileName);

    const { error: insertErr } = await supabaseAdmin
      .from('certificates')
      .insert({
        user_id: userId,
        certificate_type: 'module',
        module_id: moduleNumber,
        module_name: courseName,
        section_name: null,
        score,
        certificate_hash: certificateHash,
        pdf_url: publicUrl,
      });

    if (insertErr) {
      results.push({ moduleNumber, title: courseName, status: 'error', detail: `DB insert failed: ${insertErr.message}` });
      continue;
    }

    results.push({ moduleNumber, title: courseName, status: 'created' });
    created++;
  }

  return NextResponse.json({
    success: true,
    userId,
    created,
    skipped,
    errors: results.filter(r => r.status === 'error').length,
    results,
  });
}
