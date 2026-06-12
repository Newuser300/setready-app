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

export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('residency_documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { document_type, document_label, file_url, filename, file_type, notes } = body;

  if (!document_type?.trim() || !file_url?.trim()) {
    return NextResponse.json({ error: 'document_type and file_url are required' }, { status: 400 });
  }

  if (!file_url.startsWith(user.id + '/')) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('residency_documents')
    .insert({
      user_id: user.id,
      document_type: document_type.trim(),
      document_label: document_label?.trim() || null,
      file_url,
      filename: filename || null,
      file_type: file_type || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}

export async function DELETE(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('residency_documents')
    .select('id, user_id, file_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const { error: storageError } = await supabaseAdmin.storage
    .from('residency_docs')
    .remove([doc.file_url]);

  if (storageError) {
    console.error('[residency DELETE] Storage error:', storageError.message);
  }

  const { error: dbError } = await supabaseAdmin
    .from('residency_documents')
    .delete()
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
