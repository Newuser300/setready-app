import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = new TextEncoder().encode(
  process.env.CASTING_JWT_SECRET ||
  'setready-casting-secret-2026-change-in-prod'
)

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
    .sign(JWT_SECRET)

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
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
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

export { supabaseAdmin }
