import { NextResponse } from 'next/server';
import { supabaseAdmin as admin } from '@/utils/supabase/admin';

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

// Returns signed URLs for all photos belonging to a journal entry
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entryId = new URL(req.url).searchParams.get('entryId');
  if (!entryId) return NextResponse.json({ error: 'Missing entryId' }, { status: 400 });

  // Verify entry ownership
  const { data: entry } = await admin
    .from('journal_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!entry) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data: photos } = await admin
    .from('journal_photos')
    .select('id, photo_url, filename')
    .eq('journal_entry_id', entryId)
    .order('created_at', { ascending: true });

  if (!photos || photos.length === 0) return NextResponse.json([]);

  const results = await Promise.all(
    photos.map(async (p) => {
      const { data } = await admin.storage
        .from('journal_photos')
        .createSignedUrl(p.photo_url, 3600);
      return { id: p.id, filename: p.filename, signedUrl: data?.signedUrl ?? null };
    })
  );

  return NextResponse.json(results);
}
