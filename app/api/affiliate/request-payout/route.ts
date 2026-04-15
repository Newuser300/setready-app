import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code, amount, email, name } = await request.json()
    
    if (!code || !amount || !email || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliate_codes')
      .select('id, total_commission, paid_commission')
      .eq('code', code.toUpperCase())
      .single()
    
    if (fetchError || !affiliate) {
      return NextResponse.json({ error: 'Invalid affiliate code' }, { status: 404 })
    }
    
    const availableCommission = (affiliate.total_commission || 0) - (affiliate.paid_commission || 0)
    
    if (amount > availableCommission) {
      return NextResponse.json({ 
        error: `Insufficient commission. Available: $${availableCommission.toFixed(2)}` 
      }, { status: 400 })
    }
    
    if (amount < 20) {
      return NextResponse.json({ 
        error: 'Minimum payout amount is $20' 
      }, { status: 400 })
    }
    
    const { data: request_data, error: insertError } = await supabase
      .from('etransfer_requests')
      .insert({
        code_id: affiliate.id,
        amount: amount,
        recipient_email: email,
        recipient_name: name,
        status: 'pending'
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating payout request:', insertError)
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      request: request_data,
      message: `E-Transfer request for $${amount.toFixed(2)} submitted. Admin will process within 3-5 business days.`
    })
    
  } catch (error) {
    console.error('Error requesting payout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}