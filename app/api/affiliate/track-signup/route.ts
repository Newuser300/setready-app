import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, referralCode } = await request.json()
    
    if (!userId || !referralCode) {
      return NextResponse.json({ error: 'userId and referralCode required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliate_codes')
      .select('id')
      .eq('code', referralCode.toUpperCase())
      .single()
    
    if (fetchError || !affiliate) {
      return NextResponse.json({ success: false, error: 'Invalid referral code' })
    }
    
    await supabase.from('affiliate_signups').insert({
      code_id: affiliate.id,
      user_id: userId,
      qualified: false
    })
    
    await supabase.rpc('increment_affiliate_signups', { code_id: affiliate.id })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error tracking affiliate signup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}