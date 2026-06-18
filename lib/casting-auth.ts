import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// (#3) No hardcoded fallback. Refuse to sign or verify without a real secret,
// so a misconfigured deploy fails loudly instead of using a guessable key.
let cachedSecret: Uint8Array | null = null
function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  const secret = process.env.CASTING_JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'CASTING_JWT_SECRET is missing or too short (need 32+ chars). ' +
      'Refusing to sign or verify casting sessions without a strong secret.'
    )
  }
  cachedSecret = new TextEncoder().encode(secret)
  return cachedSecret
}

export async function createSession(
  accountId: string,
  accountType: 'agent' | 'casting_director',
  email: string,
  name: string
) {
  // (#14) A unique jti + issued-at makes every token distinct, so each login is
  // its own row in casting_sessions and can be revoked independently.
  const token = await new SignJWT({ accountId, accountType, email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())

  await supabaseAdmin.from('casting_sessions').insert({
    account_type: accountType,
    account_id: accountId,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })

  return token
}

export async function verifySession(
  token: string
): Promise<{
  accountId: string
  accountType: string
  email: string
  name: string
} | null> {
  const secret = getJwtSecret()

  // 1) Cryptographic check: valid signature, not expired, not forged.
  let payload
  try {
    const result = await jwtVerify(token, secret)
    payload = result.payload
  } catch {
    return null
  }

  // 2) (#14) Source-of-truth check: the token must still have a live row in
  // casting_sessions. deleteSession (logout) removes that row, so this makes
  // logout revoke the token immediately instead of leaving it valid for 7 days.
  const { data, error } = await supabaseAdmin
    .from('casting_sessions')
    .select('account_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !data) return null

  return payload as any
}

export async function getAgentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('agent_session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function getCastingSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('casting_session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function deleteSession(token: string) {
  await supabaseAdmin
    .from('casting_sessions')
    .delete()
    .eq('token', token)
}

export { supabaseAdmin }
