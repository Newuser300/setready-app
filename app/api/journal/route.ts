import { NextResponse } from 'next/server';
import { supabaseAdmin as admin } from '@/utils/supabase/admin';

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  return error ? null : user;
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: entries, error } = await admin
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!entries || entries.length === 0) return NextResponse.json([]);

  // Attach photo metadata (no URLs yet — signed URLs fetched on demand)
  const entryIds = entries.map((e: { id: string }) => e.id);
  const { data: photos } = await admin
    .from('journal_photos')
    .select('id, journal_entry_id, filename, photo_url')
    .in('journal_entry_id', entryIds)
    .order('created_at', { ascending: true });

  const photosByEntry: Record<string, { id: string; filename: string; photo_url: string }[]> = {};
  (photos ?? []).forEach((p: { id: string; journal_entry_id: string; filename: string; photo_url: string }) => {
    if (!photosByEntry[p.journal_entry_id]) photosByEntry[p.journal_entry_id] = [];
    photosByEntry[p.journal_entry_id].push({ id: p.id, filename: p.filename, photo_url: p.photo_url });
  });

  return NextResponse.json(entries.map((e: { id: string }) => ({ ...e, photos: photosByEntry[e.id] ?? [] })));
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { data, error } = await admin
    .from('journal_entries')
    .insert([{ ...body, user_id: user.id }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...rest } = await req.json();
  const { data, error } = await admin
    .from('journal_entries')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await admin
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
