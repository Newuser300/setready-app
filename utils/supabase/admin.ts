import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Canonical service-role Supabase client. Server-only: bypasses RLS, never
 * import into client components. Use this instead of constructing a
 * service-role client inline.
 *
 * WHY THIS IS LAZY
 * ----------------
 * This used to call createClient() at module scope. That broke the production
 * build under Next 16 + Turbopack:
 *
 *     Error: supabaseUrl is required.
 *     Failed to collect page data for /api/account/delete
 *
 * During "Collecting page data" Next evaluates every route module. Module-scope
 * side effects therefore run at BUILD time, where the Supabase env vars are not
 * necessarily present — so the client threw before any handler ever ran, and
 * the whole build failed.
 *
 * The Proxy below defers construction until the first property access, i.e.
 * until a request actually uses it. Importing this module is now free of side
 * effects, so build-time evaluation is harmless. Call sites are unchanged:
 * `supabaseAdmin.from(...)` still works exactly as before.
 */
let _client: SupabaseClient | null = null

function real(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'SUPABASE_SERVICE_ROLE_KEY in the environment. (Thrown at request time, ' +
      'not at build time, so a missing value cannot fail the build.)'
    )
  }
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _client
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) {
    const v = Reflect.get(real() as object, prop, receiver)
    return typeof v === 'function' ? v.bind(real()) : v
  },
  has(_t, prop) { return prop in (real() as object) },
})
