import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// No hardcoded fallback. We refuse to sign or verify casting sessions without a
// real secret, so a misconfigured deploy fails loudly instead of silently using
// a guessable key. Validated and cached on first use.
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
  const token = await new SignJWT({
    accountId, accountType, email, name
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getJwtSecret())

  await supabaseAdmin.from('casting_sessions').insert({
    account_type: accountType,
    account_id: accountId,
    token,
    expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString()
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
  // Resolve the secret OUTSIDE the try so a misconfiguration throws loudly
  // rather than being swallowed and reported as just an invalid token.
  const secret = getJwtSecret()
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as any
  } catch {
    return null
  }
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
