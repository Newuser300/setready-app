import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status, section2_unlocked')
      .eq('id', session.user.id)
      .single();
    
    return NextResponse.json({
      success: true,
      subscription_status: userData?.subscription_status,
      section2_unlocked: userData?.section2_unlocked,
    });
    
  } catch (error) {
    console.error('Refresh session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}