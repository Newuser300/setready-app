import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  return redirect('/auth/sign-in')
}