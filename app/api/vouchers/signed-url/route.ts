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

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workLogId = new URL(req.url).searchParams.get('workLogId');
  if (!workLogId) return NextResponse.json({ error: 'Missing workLogId' }, { status: 400 });

  // Verify ownership and get the storage path
  const { data: workLog } = await admin
    .from('work_logs')
    .select('voucher_url')
    .eq('id', workLogId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!workLog?.voucher_url) {
    return NextResponse.json({ error: 'No voucher found for this entry.' }, { status: 404 });
  }

  // Generate signed URL — 1 hour expiry
  const { data, error } = await admin.storage
    .from('vouchers')
    .createSignedUrl(workLog.voucher_url, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download URL.' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
