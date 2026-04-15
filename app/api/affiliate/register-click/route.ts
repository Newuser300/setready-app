import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    const { data: affiliate, error: fetchError } = await supabase
      .from('affiliate_codes')
      .select('id')
      .eq('code', code.toUpperCase())
      .single()
    
    if (fetchError || !affiliate) {
      return NextResponse.json({ success: true, message: 'Code not found' })
    }
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    await supabase.from('affiliate_clicks').insert({
      code_id: affiliate.id,
      ip_address: ipAddress,
      user_agent: userAgent
    })
    
    await supabase.rpc('increment_affiliate_clicks', { code_id: affiliate.id })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error tracking affiliate click:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}