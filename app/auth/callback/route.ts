import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Send welcome message on first email confirmation
      // Check if this user has ever received a welcome message
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', data.user.id)
        .eq('subject', 'Welcome to SetReady!')

      if (count === 0) {
        await supabaseAdmin.from('messages').insert({
          sender_type: 'system',
          sender_name: 'SetReady',
          recipient_type: 'performer',
          recipient_id: data.user.id,
          subject: 'Welcome to SetReady!',
          body: `Welcome to SetReady — Canada's background performer platform.

Here is how to get started:

1. Complete your performer profile
   Add your headshot, physical stats and special skills so agents and casting directors can find you.

2. Set your availability
   Mark the dates you can work on your availability calendar.

3. Explore your free tools
   You have instant access to the rate calculator, film set glossary, on-set journal, voucher wallet and more.

4. Consider training
   When you are ready, unlock 5 professional training modules for $9.99.

If you have any questions contact us at setready@mail.com

Welcome to the set!
— The SetReady Team`,
          message_type: 'general',
          priority: 'normal',
          action_url: '/profile',
          action_label: 'Complete Your Profile',
        })
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth`)
}
