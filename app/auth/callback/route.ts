import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Apply referral: resolve the code carried in signup metadata to the referrer's UUID,
      // then store it on the new user (only if not already set, and never self-referral).
      const refCode = ((data.user.user_metadata?.referral_code as string | null) ?? searchParams.get('ref')) ?? null
      if (refCode && refCode.trim()) {
        const normalizedCode = refCode.trim().toUpperCase()
        const { data: referrer } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('referral_code', normalizedCode)
          .maybeSingle()
        if (referrer?.id && referrer.id !== data.user.id) {
          await supabaseAdmin
            .from('users')
            .update({ referred_by: referrer.id })
            .eq('id', data.user.id)
            .is('referred_by', null)
        }
      }

      // Ensure a profile row exists. OAuth (Google) sign-ins have no
      // client-side profile creation step, so create a minimal row here.
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id, province')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!existingProfile) {
        await supabaseAdmin.from('users').upsert(
          {
            id: data.user.id,
            email: data.user.email,
            name:
              (data.user.user_metadata?.full_name as string) ||
              (data.user.user_metadata?.name as string) ||
              '',
            subscription_status: 'inactive',
          },
          { onConflict: 'id' },
        )
      }

      // New users (no province yet) must finish setup — this is where the
      // 18+/Canada/Terms consent and province are captured for Google sign-ups.
      const needsProfile = !existingProfile?.province

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

2. Explore your free tools
   You have instant access to the rate calculator, film set glossary, on-set journal, voucher wallet and more.

3. Consider training
   When you are ready, unlock professional training modules for $9.99.

4. Try the free games.

5. Check What's Filming.

If you have any questions contact us at setready@mail.com

Welcome to the set!
— The SetReady Team`,
          message_type: 'general',
          priority: 'normal',
          action_url: '/profile',
          action_label: 'Complete Your Profile',
        })
      }

      return NextResponse.redirect(
        `${origin}${needsProfile ? '/auth/complete-profile' : next}`,
      )
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth`)
}
