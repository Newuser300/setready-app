import { createClient } from '@supabase/supabase-js'

// Canonical service-role Supabase client. Server-only: bypasses RLS, never
// import into client components. Use this instead of constructing a service-role
// client inline.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
