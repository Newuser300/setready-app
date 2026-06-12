import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateCertificatePDF } from '@/lib/certificate-generator';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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

// ── GET: debug info for a user ────────────────────────────────────────────────
// Usage: GET /api/admin/backfill-certificates?userId=<uuid>
//        GET /api/admin/backfill-certificates?email=user@example.com
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  let userId = searchParams.get('userId');
  const email = searchParams.get('email');

  if (!userId && !email) {
    return NextResponse.json({ error: 'userId or email query param required' }, { status: 400 });
  }

  // Look up userId from email
  if (!userId && email) {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const found = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) return NextResponse.json({ error: `No account found for: ${email}` }, { status: 404 });
    userId = found.id;
  }

  // Total rows in certificates table
  const { count: totalCerts, error: certCountErr } = await supabaseAdmin
    .from('certificates')
    .select('*', { count: 'exact', head: true });

  // Certificates already issued for this user
  const { data: userCerts, error: userCertErr } = await supabaseAdmin
    .from('certificates')
    .select('id, module_id, certificate_type, score, created_at')
    .eq('user_id', userId);

  // All user_progress rows for this user
  const { count: totalProgress, error: progressCountErr } = await supabaseAdmin
    .from('user_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Completed modules for this user with module details
  const { data: completedProgress, error: completedErr } = await supabaseAdmin
    .from('user_progress')
    .select('module_id, completed, score')
    .eq('user_id', userId)
    .eq('completed', true);

  // Look up module details for the completed entries
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
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required in request body' }, { status: 400 });
  }

  console.log(`[backfill-certs] Admin ${admin.email} backfilling certificates for user ${userId}`);

  // 1. Get user profile for recipient name
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
  console.log('[backfill-certs] Recipient name:', recipientName);

  // 2. Get all completed modules for this user
  const { data: completedProgress, error: progressErr } = await supabaseAdmin
    .from('user_progress')
    .select('module_id, score')
    .eq('user_id', userId)
    .eq('completed', true);

  if (progressErr) {
    console.error('[backfill-certs] Failed to fetch user_progress:', progressErr.message);
    return NextResponse.json({ error: 'Failed to fetch user progress', details: progressErr.message }, { status: 500 });
  }

  if (!completedProgress || completedProgress.length === 0) {
    return NextResponse.json({ message: 'No completed modules found for this user', created: 0, skipped: 0 });
  }

  // 3. Resolve module UUIDs → module numbers
  const moduleUuids = completedProgress.map(p => p.module_id);
  const { data: modules, error: modulesErr } = await supabaseAdmin
    .from('modules')
    .select('id, module_number, title, section')
    .in('id', moduleUuids);

  if (modulesErr) {
    console.error('[backfill-certs] Failed to fetch modules:', modulesErr.message);
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
      console.warn(`[backfill-certs] No module found for UUID ${progress.module_id} — skipping`);
      results.push({ moduleNumber: 0, title: `Unknown (${progress.module_id})`, status: 'skipped', detail: 'Module UUID not found in modules table' });
      skipped++;
      continue;
    }

    const moduleNumber = mod.module_number;
    const courseName = `Module ${moduleNumber}: ${MODULE_NAMES[moduleNumber] || mod.title}`;

    // 4. Check if certificate already exists
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleNumber)
      .eq('certificate_type', 'module')
      .maybeSingle();

    if (existingErr) {
      console.error(`[backfill-certs] Error checking existing cert for module ${moduleNumber}:`, existingErr.message);
      results.push({ moduleNumber, title: courseName, status: 'error', detail: existingErr.message });
      continue;
    }

    if (existing) {
      console.log(`[backfill-certs] Module ${moduleNumber} — certificate already exists, skipping`);
      results.push({ moduleNumber, title: courseName, status: 'skipped', detail: 'Certificate already exists' });
      skipped++;
      continue;
    }

    // 5. Generate PDF
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
      console.log(`[backfill-certs] Module ${moduleNumber} — PDF generated (${pdfBuffer.length} bytes)`);
    } catch (pdfErr: any) {
      console.error(`[backfill-certs] Module ${moduleNumber} — PDF generation failed:`, pdfErr?.message);
      results.push({ moduleNumber, title: courseName, status: 'error', detail: `PDF generation failed: ${pdfErr?.message}` });
      continue;
    }

    // 6. Upload PDF to storage
    const fileName = `${userId}/module_${moduleNumber}_backfill_${timestamp}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('certificates')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      console.error(`[backfill-certs] Module ${moduleNumber} — upload failed:`, uploadErr.message);
      results.push({ moduleNumber, title: courseName, status: 'error', detail: `Upload failed: ${uploadErr.message}` });
      continue;
    }

    // 7. Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('certificates')
      .getPublicUrl(fileName);

    // 8. Insert into certificates table
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
      console.error(`[backfill-certs] Module ${moduleNumber} — DB insert failed:`, insertErr.message);
      results.push({ moduleNumber, title: courseName, status: 'error', detail: `DB insert failed: ${insertErr.message}` });
      continue;
    }

    console.log(`[backfill-certs] Module ${moduleNumber} — certificate created ✅`);
    results.push({ moduleNumber, title: courseName, status: 'created' });
    created++;
  }

  console.log(`[backfill-certs] Done — created: ${created}, skipped: ${skipped}, errors: ${results.filter(r => r.status === 'error').length}`);

  return NextResponse.json({
    success: true,
    userId,
    created,
    skipped,
    errors: results.filter(r => r.status === 'error').length,
    results,
  });
}
