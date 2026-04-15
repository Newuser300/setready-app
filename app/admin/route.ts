// app/admin/route.ts
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.redirect(new URL('/dashboard/admin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}