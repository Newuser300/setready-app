import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// ============================================
// COMMISSION CONFIGURATION
// ============================================
const COMMISSION_PERCENT = 0.20  // 20% commission

// Default product prices (CAD)
const PRICES = {
  section1: 14.99,
  section2: 29.99,
  complete: 39.99
}
// ============================================

export async function POST(request: Request) {
  try {
    const { userId, purchaseAmount, productType } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    const { data: signup, error: fetchError } = await supabase
      .from('affiliate_signups')
      .select('id, code_id')
      .eq('user_id', userId)
      .eq('qualified', false)
      .single()
    
    if (fetchError || !signup) {
      return NextResponse.json({ success: true, message: 'No qualification needed' })
    }
    
    // Calculate commission based on purchase amount
    let amount = purchaseAmount
    
    // If amount not provided, determine from product type
    if (!amount && productType && PRICES[productType as keyof typeof PRICES]) {
      amount = PRICES[productType as keyof typeof PRICES]
    }
    
    // Default to complete program if nothing specified
    if (!amount) {
      amount = PRICES.complete
    }
    
    const commissionEarned = amount * COMMISSION_PERCENT
    
    await supabase
      .from('affiliate_signups')
      .update({ 
        qualified: true,
        qualified_at: new Date().toISOString(),
        commission_earned: commissionEarned
      })
      .eq('id', signup.id)
    
    await supabase.rpc('increment_affiliate_commission', { 
      code_id: signup.code_id, 
      amount: commissionEarned 
    })
    
    return NextResponse.json({ 
      success: true, 
      commission: commissionEarned,
      commissionPercent: 20,
      message: `Commission earned: $${commissionEarned.toFixed(2)} (20% of $${amount.toFixed(2)})`
    })
    
  } catch (error) {
    console.error('Error qualifying affiliate signup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}