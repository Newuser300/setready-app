import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })

  // Check and deduct credits
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('headshot_credits')
    .eq('id', user.id)
    .single()

  const currentCredits = userData?.headshot_credits ?? 0
  if (currentCredits < 1) {
    return NextResponse.json({ error: 'No credits remaining. Please purchase more.' }, { status: 402 })
  }

  // Deduct 1 credit before analysis
  const { error: deductError } = await supabaseAdmin
    .from('users')
    .update({ headshot_credits: currentCredits - 1 })
    .eq('id', user.id)

  if (deductError) {
    console.error('Failed to deduct headshot credit:', deductError)
    return NextResponse.json({ error: 'Failed to process credit. Please try again.' }, { status: 500 })
  }

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  // AI analysis — replace with real AI vision API (OpenAI, Claude, etc.)
  const overallScore = Math.floor(Math.random() * 30) + 65

  const result = {
    overallScore,
    lighting: {
      score: Math.floor(Math.random() * 25) + 65,
      feedback: 'Your lighting is mostly even, though there is slight shadow on one side of your face. Consider using a reflector to fill in the shadow side for a more balanced look.',
    },
    composition: {
      score: Math.floor(Math.random() * 25) + 65,
      feedback: 'The framing is good. Your eyes are roughly at the upper third of the frame — ideal for headshots. Ensure there is a small amount of breathing room above the top of your head.',
    },
    expression: {
      score: Math.floor(Math.random() * 25) + 65,
      feedback: 'Your expression reads as approachable and engaged. A slightly softer jaw and relaxed eyes would push this toward "bookable." Think of a specific moment, not a generic smile.',
    },
    background: {
      score: Math.floor(Math.random() * 25) + 65,
      feedback: 'The background is relatively clean and does not distract from your face. A neutral grey or soft gradient would be the industry standard for background work.',
    },
    professionalism: {
      score: Math.floor(Math.random() * 25) + 65,
      feedback: 'Overall the image reads as professional. Wardrobe is clean and appropriate. Ensure the final version is shot in high resolution (minimum 300 DPI) for print submissions.',
    },
    topRecommendations: [
      'Shoot near a large north-facing window for soft, even natural light.',
      'Use a professional DSLR or a recent flagship smartphone — avoid selfie mode.',
      'Keep your wardrobe simple: solid colours, no busy patterns or logos.',
      'Take 100+ frames per session and let your photographer select the best 10.',
      'Retouching should be light — casting directors want to see the real you.',
    ],
    creditsRemaining: currentCredits - 1,
  }

  return NextResponse.json(result)
}
