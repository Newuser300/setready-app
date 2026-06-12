import { NextResponse } from 'next/server';
import { verifyAdminRequest, supabaseAdmin, getEnvAdminEmails } from '@/utils/isAdmin';

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: dbAdmins } = await supabaseAdmin
    .from('admin_emails')
    .select('id, email, added_by, added_at')
    .order('added_at', { ascending: true });

  return NextResponse.json({
    envAdmins: getEnvAdminEmails(),
    dbAdmins: dbAdmins || [],
  });
}

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email } = await request.json();
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

  const normalized = email.trim().toLowerCase();
  if (getEnvAdminEmails().includes(normalized)) {
    return NextResponse.json({ error: 'This email is already a primary admin.' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('admin_emails')
    .insert({ email: normalized, added_by: admin.email })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'This email is already an admin.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, admin: data });
}

export async function DELETE(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const { data: record } = await supabaseAdmin
    .from('admin_emails')
    .select('email')
    .eq('id', id)
    .maybeSingle();

  if (!record) return NextResponse.json({ error: 'Admin not found.' }, { status: 404 });
  if (getEnvAdminEmails().includes(record.email)) {
    return NextResponse.json({ error: 'Cannot remove a primary (env) admin.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('admin_emails').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
