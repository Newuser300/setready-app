import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type PromoType = 'training' | 'agent_pro' | 'casting_pro' | 'press'

export interface PromoCode {
  id: string
  code: string
  type: PromoType
  description: string | null
  discount_percent: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_by: string
  created_at: string
}

export async function validatePromoCode(
  code: string,
  expectedType?: PromoType
): Promise<{ valid: boolean; promo?: PromoCode; error?: string }> {
  const { data: promo } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle()

  if (!promo) return { valid: false, error: 'Code not found' }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'Code has expired' }
  }
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return { valid: false, error: 'Code has reached its usage limit' }
  }
  if (expectedType && promo.type !== expectedType && promo.type !== 'press') {
    return { valid: false, error: 'Code is not valid for this account type' }
  }

  return { valid: true, promo }
}

// entityId: for performer = auth UUID, for agent = agency_id, for casting_director = casting_directors.id
export async function applyPromoCode(
  code: string,
  entityId: string,
  userType: 'performer' | 'agent' | 'casting_director'
): Promise<{ success: boolean; error?: string }> {
  const validation = await validatePromoCode(code)
  if (!validation.valid || !validation.promo) {
    return { success: false, error: validation.error }
  }
  const promo = validation.promo

  const { data: existing } = await supabaseAdmin
    .from('promo_code_uses')
    .select('id')
    .eq('code_id', promo.id)
    .eq('user_id', entityId)
    .eq('user_type', userType)
    .maybeSingle()

  if (existing) return { success: false, error: 'You have already used this code' }

  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  if (promo.type === 'training' || (promo.type === 'press' && userType === 'performer')) {
    await supabaseAdmin.from('users').update({
      promo_training_expires_at: expiresAt,
      promo_code_used: code.toUpperCase(),
    }).eq('id', entityId)
  }

  if (promo.type === 'agent_pro' || (promo.type === 'press' && userType === 'agent')) {
    await supabaseAdmin.from('agencies').update({
      is_pro: true,
      pro_expires_at: expiresAt,
      pro_promo_code: code.toUpperCase(),
    }).eq('id', entityId)
  }

  if (promo.type === 'casting_pro' || (promo.type === 'press' && userType === 'casting_director')) {
    await supabaseAdmin.from('casting_directors').update({
      is_pro: true,
      pro_expires_at: expiresAt,
      pro_promo_code: code.toUpperCase(),
    }).eq('id', entityId)
  }

  await supabaseAdmin.from('promo_code_uses').insert({
    code_id: promo.id,
    user_id: entityId,
    user_type: userType,
    expires_at: expiresAt,
  })

  await supabaseAdmin
    .from('promo_codes')
    .update({ uses_count: promo.uses_count + 1 })
    .eq('id', promo.id)

  return { success: true }
}

export async function hasTrainingAccess(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('subscription_status, promo_training_expires_at')
    .eq('id', userId)
    .maybeSingle()

  if (!data) return false
  if (data.subscription_status === 'active') return true
  if (data.promo_training_expires_at && new Date(data.promo_training_expires_at) > new Date()) return true
  return false
}

export async function isAgentPro(agencyId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('agencies')
    .select('is_pro, pro_expires_at')
    .eq('id', agencyId)
    .maybeSingle()

  if (!data?.is_pro) return false
  if (data.pro_expires_at && new Date(data.pro_expires_at) < new Date()) return false
  return true
}

export async function isCastingPro(castingDirectorId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('casting_directors')
    .select('is_pro, pro_expires_at')
    .eq('id', castingDirectorId)
    .maybeSingle()

  if (!data?.is_pro) return false
  if (data.pro_expires_at && new Date(data.pro_expires_at) < new Date()) return false
  return true
}
