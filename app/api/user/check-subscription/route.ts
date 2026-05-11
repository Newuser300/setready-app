// app/api/user/check-subscription/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ isSubscribed: false, error: 'No session' }, { status: 401 });
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', session.user.id)
      .single();
    
    const isSubscribed = userData?.subscription_status === 'active';
    
    return NextResponse.json({ isSubscribed });
  } catch (error) {
    console.error('Check subscription error:', error);
    return NextResponse.json({ isSubscribed: false, error: 'Server error' }, { status: 500 });
  }
}