import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Requests on the retired SetReady domain are served the /moved rebrand notice,
// which forwards to www.bgready.site. /api and /auth are excluded so in-flight
// webhooks and email-confirmation links keep working during the transition.
const REBRAND_ASSET = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|js|css)$/i

function isRetiredDomain(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase()
  if (!host.includes('setready.site')) return false

  const path = request.nextUrl.pathname
  return (
    path !== '/moved' &&
    !path.startsWith('/api') &&
    !path.startsWith('/auth') &&
    !REBRAND_ASSET.test(path)
  )
}

export async function proxy(request: NextRequest) {
  // Stripe webhook must reach the route handler with no redirects or header mutations
  if (request.nextUrl.pathname === '/api/webhooks/stripe') {
    return NextResponse.next()
  }

  if (isRetiredDomain(request)) {
    const url = request.nextUrl.clone()
    url.pathname = '/moved'
    url.search = ''
    return NextResponse.rewrite(url)
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
