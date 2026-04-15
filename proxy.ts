import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map();

export function proxy(request: NextRequest) {
  const ip = request.ip ?? 'anonymous';
  const path = request.nextUrl.pathname;
  
  if (path.startsWith('/_next') || path.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }
  
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  
  const key = `${ip}:${path}`;
  const requests = rateLimit.get(key) || [];
  const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);
  
  if (recentRequests.length >= 30) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  recentRequests.push(now);
  rateLimit.set(key, recentRequests);
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};