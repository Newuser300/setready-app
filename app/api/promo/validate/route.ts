import { NextRequest, NextResponse } from 'next/server'
import { validatePromoCode } from '@/lib/promo'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.json({ valid: false, error: 'No code provided' })

  const result = await validatePromoCode(code)
  if (!result.valid) return NextResponse.json({ valid: false, error: result.error })

  return NextResponse.json({
    valid: true,
    type: result.promo!.type,
    description: result.promo!.description,
  })
}
