import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/isAdmin';

async function getUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileUrl } = await request.json();
  if (!fileUrl?.trim()) {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 });
  }

  if (!fileUrl.startsWith(user.id + '/')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('residency_docs')
    .createSignedUrl(fileUrl, 3600);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signedUrl: data.signedUrl });
}
