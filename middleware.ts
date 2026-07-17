import { NextResponse, type NextRequest } from 'next/server'

// When the app is reached on the retired SetReady domain, every page route is
// served the /moved rebrand notice (which then forwards to www.bgready.site).
// /api is intentionally excluded so in-flight webhooks/callbacks keep working
// during the transition window.
export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase()
  const isOldDomain = host.includes('setready.site')

  if (isOldDomain && request.nextUrl.pathname !== '/moved') {
    const url = request.nextUrl.clone()
    url.pathname = '/moved'
    url.search = ''
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on all routes EXCEPT api, auth (keeps in-flight email-confirmation
    // links working during transition), Next internals, and static asset files.
    '/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|js|css)$).*)',
  ],
}
