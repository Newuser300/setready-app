import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/isAdmin';

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workLogId = new URL(req.url).searchParams.get('workLogId');
  if (!workLogId) return NextResponse.json({ error: 'Missing workLogId' }, { status: 400 });

  const { data: workLog } = await supabaseAdmin
    .from('work_logs')
    .select('voucher_url')
    .eq('id', workLogId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!workLog?.voucher_url) {
    return NextResponse.json({ error: 'No voucher found for this entry.' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('vouchers')
    .createSignedUrl(workLog.voucher_url, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download URL.' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
