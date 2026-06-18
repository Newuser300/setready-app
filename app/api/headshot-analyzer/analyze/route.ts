import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// sharp + Buffer + file uploads require the Node.js runtime (not Edge).
export const runtime = 'nodejs'
// Phase 2 produces more output, so give the model call room.
export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Swap to 'claude-haiku-4-5-20251001' for lower cost, or an Opus model for best quality.
const ANALYSIS_MODEL = 'claude-sonnet-4-6'

type CategoryScore = { score: number; feedback: string }
type CharacterMatch = { role: string; matchPercent: number; why: string; wardrobe: string }

type AnalysisResult = {
  // Casting profile (Phase 2)
  castingType: { label: string; description: string }
  playableAgeRange: string
  assessment: string
  characterMatches: CharacterMatch[]
  castingStrengths: string[]
  thingsToAvoid: string[]
  backgroundWorkTips: string[]
  // Photo critique (Phase 1)
  overallScore: number
  lighting: CategoryScore
  composition: CategoryScore
  expression: CategoryScore
  background: CategoryScore
  professionalism: CategoryScore
  topRecommendations: string[]
}

const SYSTEM_PROMPT = `You are an experienced film and television casting director in Canada reviewing a background performer's headshot. You assess the PHOTO and the performer's on-camera castability for background and featured-extra work. Assess professional, technical, and type-casting qualities only — never comment on the person's attractiveness, desirability, or personal worth. Keep every comment constructive, encouraging, and industry-appropriate.

Produce a complete casting assessment with these parts:

1. castingType: the performer's primary on-camera casting type as a short label (e.g. "Everyday Professional", "Authority Figure", "Character Actor", "Approachable Parent"), plus a 1-2 sentence description of how they read on camera.
2. playableAgeRange: the on-camera age range they could plausibly play, as a short string (e.g. "30 to 45").
3. assessment: an honest, encouraging 3-4 sentence written assessment of the headshot from a casting director's point of view.
4. characterMatches: 4 to 6 specific background/featured roles they would read well for. For each: role (the character type, e.g. "Police Officer", "ER Doctor", "Business Executive"), matchPercent (0-100 confidence they'd be cast in that type), why (1-2 sentences on why their look suits it), wardrobe (one concrete wardrobe tip to nail that look).
5. castingStrengths: 3-5 short strings naming their on-camera strengths.
6. thingsToAvoid: 3-5 short strings on what to avoid in this or future headshots.
7. backgroundWorkTips: 3-5 short practical tips tailored to their appearance for booking and performing background work.
8. Photo critique — for each of lighting, composition, expression, background, professionalism: a score (0-100) and 2-3 sentences of specific feedback.
9. overallScore: 0-100 overall casting-submission readiness.
10. topRecommendations: 3-5 short, concrete recommendations for their next headshot session.

Respond with ONLY a JSON object — no markdown, no code fences, no commentary — in exactly this shape:
{"castingType":{"label":"","description":""},"playableAgeRange":"","assessment":"","characterMatches":[{"role":"","matchPercent":0,"why":"","wardrobe":""}],"castingStrengths":[""],"thingsToAvoid":[""],"backgroundWorkTips":[""],"overallScore":0,"lighting":{"score":0,"feedback":""},"composition":{"score":0,"feedback":""},"expression":{"score":0,"feedback":""},"background":{"score":0,"feedback":""},"professionalism":{"score":0,"feedback":""},"topRecommendations":[""]}`

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

function str(x: unknown): string {
  return String(x ?? '').trim()
}

function strArray(x: unknown, max: number): string[] {
  return Array.isArray(x) ? x.map(str).filter(Boolean).slice(0, max) : []
}

function parseAnalysis(text: string): AnalysisResult {
  // Strip any accidental fences and isolate the JSON object.
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object in model response')

  const raw = JSON.parse(cleaned.slice(start, end + 1))
  const cat = (c: any): CategoryScore => ({ score: clampScore(c?.score), feedback: str(c?.feedback) })

  const characterMatches: CharacterMatch[] = Array.isArray(raw.characterMatches)
    ? raw.characterMatches
        .map((m: any) => ({
          role: str(m?.role),
          matchPercent: clampScore(m?.matchPercent),
          why: str(m?.why),
          wardrobe: str(m?.wardrobe),
        }))
        .filter((m: CharacterMatch) => m.role)
        .slice(0, 6)
    : []

  const result: AnalysisResult = {
    castingType: {
      label: str(raw.castingType?.label),
      description: str(raw.castingType?.description),
    },
    playableAgeRange: str(raw.playableAgeRange),
    assessment: str(raw.assessment),
    characterMatches,
    castingStrengths: strArray(raw.castingStrengths, 5),
    thingsToAvoid: strArray(raw.thingsToAvoid, 5),
    backgroundWorkTips: strArray(raw.backgroundWorkTips, 5),
    overallScore: clampScore(raw.overallScore),
    lighting: cat(raw.lighting),
    composition: cat(raw.composition),
    expression: cat(raw.expression),
    background: cat(raw.background),
    professionalism: cat(raw.professionalism),
    topRecommendations: strArray(raw.topRecommendations, 5),
  }

  // If the model didn't return real content, treat it as a failed analysis so
  // we don't charge a credit for an empty/garbled result.
  if (!result.assessment || result.characterMatches.length === 0 || !result.lighting.feedback) {
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
      max_tokens: 3500,
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
  // NOTE: read-then-write isn't fully atomic; for a hard guarantee, move this to
  // a Postgres RPC that does `headshot_credits = headshot_credits - 1 WHERE headshot_credits > 0`.
  const newCredits = currentCredits - 1
  const { error: deductError } = await supabaseAdmin
    .from('users')
    .update({ headshot_credits: newCredits })
    .eq('id', user.id)

  if (deductError) {
    // User already received a valid analysis; don't penalize them for a DB hiccup.
    console.error('Analysis succeeded but credit deduction failed:', deductError)
  }

  return NextResponse.json({ ...result, creditsRemaining: newCredits })
}
