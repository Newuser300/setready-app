import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      console.error('No authorization token');
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }
    
    const { variantId, type } = await request.json();
    
    console.log('Checkout - User:', user.id, 'Variant:', variantId);
    
    // Build Lemon Squeezy checkout URL
    const checkoutUrl = `https://app.lemonsqueezy.com/checkout/buy/${variantId}?checkout[custom][user_id]=${user.id}&checkout[custom][type]=${type}`;
    
    return NextResponse.json({ url: checkoutUrl });
    
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}