'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    browserClient.auth.getUser().then(({ data: { user: currentUser }, error }) => {
      if (error || !currentUser) { router.push('/auth/sign-in'); return }
      browserClient.auth.getSession().then(({ data: { session } }) => {
        setUser(currentUser)
        setToken(session?.access_token ?? null)
        setLoading(false)
      })
    })

    const { data: { subscription } } = browserClient.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/auth/sign-in')
      } else {
        setUser(session.user)
        setToken(session.access_token)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, token, loading, supabase }
}
