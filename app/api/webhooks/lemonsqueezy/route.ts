import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature');
    
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');
    
    if (signature !== hash) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const event = JSON.parse(body);
    const { meta, data } = event;
    const eventName = meta.event_name;
    
    const supabase = await createClient();
    
    // Handle subscription created/updated
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const { attributes } = data;
      const userId = attributes.custom_data?.user_id;
      const status = attributes.status;
      const subscriptionId = attributes.id;
      const endsAt = attributes.ends_at;
      
      if (userId) {
        await supabase
          .from('users')
          .update({
            subscription_status: status,
            subscription_id: subscriptionId,
            subscription_ends_at: endsAt ? new Date(endsAt).toISOString() : null
          })
          .eq('id', userId);
        console.log(`Updated subscription for user ${userId}: ${status}`);
      }
    }
    
    // Handle one-time payment (Section 2 unlock)
    if (eventName === 'order_created') {
      const { attributes } = data;
      const userId = attributes.custom_data?.user_id;
      const variantId = attributes.first_order_item?.variant_id;
      
      const section2VariantId = process.env.NEXT_PUBLIC_SECTION2_VARIANT_ID;
      
      if (userId && variantId === section2VariantId) {
        await supabase
          .from('users')
          .update({ section2_unlocked: true })
          .eq('id', userId);
        console.log(`Unlocked Section 2 for user ${userId}`);
      }
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}