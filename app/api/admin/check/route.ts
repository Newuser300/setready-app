export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { isAdminUser, supabaseAdmin } from '@/utils/isAdmin';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return NextResponse.json({ isAdmin: false, error: 'No token' }, { status: 401 });

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user?.email) {
      return NextResponse.json({ isAdmin: false, error: 'Invalid token' }, { status: 401 });
    }
    const isAdmin = await isAdminUser(user.email);
    return NextResponse.json({ isAdmin, user: { email: user.email, id: user.id } });
  } catch {
    return NextResponse.json({ isAdmin: false, error: 'Server error' }, { status: 500 });
  }
}
