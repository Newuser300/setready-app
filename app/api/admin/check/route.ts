// app/api/admin/check/route.ts
export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options)
            } catch (error) {
              console.error('Error setting cookie:', error)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set(name, '', options)
            } catch (error) {
              console.error('Error removing cookie:', error)
            }
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ isAdmin: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const isAdmin = adminEmails.includes(user.email || '');
    
    return NextResponse.json({ 
      isAdmin, 
      user: {
        email: user.email,
        id: user.id
      }
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ isAdmin: false, error: 'Server error' }, { status: 500 });
  }
}