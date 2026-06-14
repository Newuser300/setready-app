'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth/sign-in')
        return
      }
      setUser(session.user)
      setToken(session.access_token)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
