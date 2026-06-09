import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const rateLimit = new Map<string, number[]>()

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Rate limit API routes: max 30 requests per IP per path per minute
  if (path.startsWith('/api/')) {
    const ip = request.ip ?? 'anonymous'
    const now = Date.now()
    const windowStart = now - 60 * 1000
    const key = `${ip}:${path}`
    const requests = rateLimit.get(key) || []
    const recentRequests = requests.filter((ts: number) => ts > windowStart)

    if (recentRequests.length >= 30) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }

    recentRequests.push(now)
    rateLimit.set(key, recentRequests)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session cookie if it has expired
  await supabase.auth.getUser()

  supabaseResponse.headers.set('Cache-Control', 'private, no-store')

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
