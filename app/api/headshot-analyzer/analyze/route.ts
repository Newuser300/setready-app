import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// sharp + Buffer + file uploads require the Node.js runtime (not Edge).
export const runtime = 'nodejs'
// Model call + image processing can take a while; raise if your plan allows.
export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Swap to 'claude-haiku-4-5-20251001' for lower cost, or an Opus model for best quality.
const ANALYSIS_MODEL = 'claude-sonnet-4-6'

type CategoryScore = { score: number; feedback: string }
type AnalysisResult = {
  overallScore: number
  lighting: CategoryScore
  composition: CategoryScore
  expression: CategoryScore
  background: CategoryScore
  professionalism: CategoryScore
  topRecommendations: string[]
}

const SYSTEM_PROMPT = `You are an experienced film and television casting director reviewing a background performer's headshot for submission readiness. Assess ONLY the photo's professional and technical quality — never the person's attractiveness, desirability, or worth.

Score each category from 0 to 100 and give specific, actionable, encouraging feedback (2-3 sentences each):
- lighting: evenness, direction, exposure, shadows
- composition: framing, crop, head room, eye line, orientation
- expression: approachability, eye engagement, naturalness, tension
- background: cleanliness, neutrality, distraction, subject separation
- professionalism: overall submission-readiness, wardrobe, resolution/sharpness, retouching

Then give an overallScore (0-100) for overall casting-submission readiness, and 3-5 topRecommendations (each one short, concrete sentence).

Respond with ONLY a JSON object — no markdown, no code fences, no commentary — in exactly this shape:
{"overallScore":0,"lighting":{"score":0,"feedback":""},"composition":{"score":0,"feedback":""},"expression":{"score":0,"feedback":""},"background":{"score":0,"feedback":""},"professionalism":{"score":0,"feedback":""},"topRecommendations":[""]}`

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

function parseAnalysis(text: string): AnalysisResult {
  // Strip any accidental fences and isolate the JSON object.
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in model response')

  const raw = JSON.parse(cleaned.slice(start, end + 1))
  const cat = (c: any): CategoryScore => ({
    score: clampScore(c?.score),
    feedback: String(c?.feedback ?? '').trim(),
  })

  const result: AnalysisResult = {
    overallScore: clampScore(raw.overallScore),
    lighting: cat(raw.lighting),
    composition: cat(raw.composition),
    expression: cat(raw.expression),
    background: cat(raw.background),
    professionalism: cat(raw.professionalism),
    topRecommendations: Array.isArray(raw.topRecommendations)
      ? raw.topRecommendations.map((r: unknown) => String(r).trim()).filter(Boolean).slice(0, 5)
      : [],
  }

  // If the model didn't actually produce feedback, treat it as a failed analysis
  // so we don't charge a credit for an empty result.
  if (!result.lighting.feedback || !result.professionalism.feedback) {
    throw new Error('Model response missing required fields')
  }
  return result
}

async function analyzeHeadshot(base64: string, mediaType: string): Promise<AnalysisResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'Analyze this headshot and return the JSON described in your instructions.' },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Anthropic API error ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  const text: string = Array.isArray(data?.content)
    ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n')
    : ''
  if (!text) throw new Error('Empty model response')
  return parseAnalysis(text)
}

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

  // 1) Verify the user has at least one credit — but do NOT deduct yet.
  const { data: userData, error: readError } = await supabaseAdmin
    .from('users')
    .select('headshot_credits')
    .eq('id', user.id)
    .single()

  if (readError) {
    console.error('Failed to read headshot credits:', readError)
    return NextResponse.json({ error: 'Could not verify your credits. Please try again.' }, { status: 500 })
  }

  const currentCredits = userData?.headshot_credits ?? 0
  if (currentCredits < 1) {
    return NextResponse.json({ error: 'No credits remaining. Please purchase more.' }, { status: 402 })
  }

  // 2) Read and validate the image.
  const formData = await request.formData()
  const image = formData.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  if (!image.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Please upload an image file.' }, { status: 400 })
  }

  // 3) Run the real analysis. If ANYTHING fails here, we return without charging.
  let result: AnalysisResult
  try {
    const inputBuffer = Buffer.from(await image.arrayBuffer())
    // Normalize orientation + downscale so we stay under the API's 5MB/image
    // limit and keep token cost low. Output is always JPEG.
    const jpeg = await sharp(inputBuffer)
      .rotate() // respect EXIF orientation (phone photos)
      .resize(1568, 1568, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    result = await analyzeHeadshot(jpeg.toString('base64'), 'image/jpeg')
  } catch (err) {
    console.error('Headshot analysis failed (no credit charged):', err)
    return NextResponse.json(
      { error: 'Analysis failed. No credit was used — please try again.' },
      { status: 502 }
    )
  }

  // 4) Analysis succeeded — now deduct one credit.
  // NOTE: read-then-write isn't fully atomic; two simultaneous requests could
  // race. Low risk at this scale. For a hard guarantee, move this to a Postgres
  // RPC that does `headshot_credits = headshot_credits - 1 WHERE headshot_credits > 0`.
  const newCredits = currentCredits - 1
  const { error: deductError } = await supabaseAdmin
    .from('users')
    .update({ headshot_credits: newCredits })
    .eq('id', user.id)

  if (deductError) {
    // The user already received a valid analysis; don't penalize them for a DB
    // hiccup. Log it and still return the result.
    console.error('Analysis succeeded but credit deduction failed:', deductError)
  }

  return NextResponse.json({ ...result, creditsRemaining: newCredits })
}
