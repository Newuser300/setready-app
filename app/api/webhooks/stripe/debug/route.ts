import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.text();
  console.log('Raw webhook body:', body);
  return NextResponse.json({ received: true });
}