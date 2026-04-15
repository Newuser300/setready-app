import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL loaded:', supabaseUrl ? 'Yes' : 'No')
console.log('Supabase Key loaded:', supabaseAnonKey ? 'Yes' : 'No')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)