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

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PER_ENTRY = 5;

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let fd: FormData;
  try { fd = await req.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }

  const file    = fd.get('file') as File | null;
  const entryId = fd.get('entryId') as string | null;

  if (!file || !entryId)
    return NextResponse.json({ error: 'Missing file or entryId' }, { status: 400 });

  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: 'File too large. Maximum is 5 MB.' }, { status: 400 });

  const isAllowed =
    ALLOWED.includes(file.type) ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');
  if (!isAllowed)
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, HEIC.' }, { status: 400 });

  // Verify the journal entry belongs to this user
  const { data: entry } = await admin
    .from('journal_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!entry)
    return NextResponse.json({ error: 'Journal entry not found.' }, { status: 404 });

  // Enforce max 5 photos per entry
  const { count } = await admin
    .from('journal_photos')
    .select('id', { count: 'exact', head: true })
    .eq('journal_entry_id', entryId);
  if ((count ?? 0) >= MAX_PER_ENTRY)
    return NextResponse.json({ error: 'Maximum 5 photos per entry.' }, { status: 400 });

  // Upload to storage
  const ts       = Date.now();
  const safe     = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const path     = `${user.id}/${entryId}_${ts}_${safe}`;
  const bytes    = await file.arrayBuffer();

  const { error: upErr } = await admin.storage
    .from('journal_photos')
    .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });
  if (upErr)
    return NextResponse.json({ error: 'Upload failed: ' + upErr.message }, { status: 500 });

  // Save record
  const { data: record, error: dbErr } = await admin
    .from('journal_photos')
    .insert([{ user_id: user.id, journal_entry_id: entryId, photo_url: path, filename: file.name }])
    .select()
    .single();
  if (dbErr)
    return NextResponse.json({ error: 'DB insert failed.' }, { status: 500 });

  return NextResponse.json({ id: record.id, filename: record.filename, photo_url: record.photo_url });
}

export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const photoId = new URL(req.url).searchParams.get('id');
  if (!photoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: photo } = await admin
    .from('journal_photos')
    .select('photo_url')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!photo) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  if (photo.photo_url)
    await admin.storage.from('journal_photos').remove([photo.photo_url]);

  await admin.from('journal_photos').delete().eq('id', photoId).eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
