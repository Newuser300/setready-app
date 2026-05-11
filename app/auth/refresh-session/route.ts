import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Refresh the session
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
    
    if (sessionError) {
      console.error('Session refresh error:', sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }
    
    if (!session) {
      console.error('No session after refresh');
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    // Get fresh user data from your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status, section2_unlocked')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      console.error('User data fetch error:', userError);
    }
    
    return NextResponse.json({
      success: true,
      subscription_status: userData?.subscription_status || null,
      section2_unlocked: userData?.section2_unlocked || false,
    });
    
  } catch (error) {
    console.error('Refresh session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}