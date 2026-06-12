import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png',
  'image/heic', 'image/heif', 'application/pdf',
];

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file       = formData.get('file') as File | null;
  const workLogId  = formData.get('workLogId') as string | null;
  const voucherType = formData.get('voucherType') as string | null;

  if (!file || !workLogId) {
    return NextResponse.json({ error: 'Missing file or workLogId' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 });
  }

  const isAllowed =
    ALLOWED_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (!isAllowed) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, PDF, HEIC.' }, { status: 400 });
  }

  // Verify user owns this work log entry
  const { data: workLog } = await admin
    .from('work_logs')
    .select('id, user_id, voucher_url')
    .eq('id', workLogId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!workLog) {
    return NextResponse.json({ error: 'Work log entry not found.' }, { status: 404 });
  }

  // Remove old voucher file if one already exists
  if (workLog.voucher_url) {
    await admin.storage.from('vouchers').remove([workLog.voucher_url]);
  }

  // Build unique storage path: vouchers/{userId}/{workLogId}_{timestamp}_{safeFilename}
  const timestamp = Date.now();
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const storagePath = `${user.id}/${workLogId}_${timestamp}_${safeName}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from('vouchers')
    .upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    console.error('Voucher upload error:', uploadError);
    return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
  }

  const updateData: Record<string, string | null> = {
    voucher_url:      storagePath,
    voucher_filename: file.name,
  };
  if (voucherType) updateData.voucher_type = voucherType;

  await admin
    .from('work_logs')
    .update(updateData)
    .eq('id', workLogId)
    .eq('user_id', user.id);

  return NextResponse.json({ storagePath, filename: file.name });
}

export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workLogId = new URL(req.url).searchParams.get('id');
  if (!workLogId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: workLog } = await admin
    .from('work_logs')
    .select('id, voucher_url')
    .eq('id', workLogId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!workLog) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (workLog.voucher_url) {
    await admin.storage.from('vouchers').remove([workLog.voucher_url]);
  }

  await admin
    .from('work_logs')
    .update({ voucher_url: null, voucher_filename: null, voucher_type: null })
    .eq('id', workLogId)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
