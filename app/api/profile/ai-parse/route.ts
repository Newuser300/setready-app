import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let text: string
  try {
    const body = await req.json()
    text = String(body.text || '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!text || text.length < 10) {
    return NextResponse.json({ error: 'Please provide more text to parse' }, { status: 400 })
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: 'Text too long (max 4000 chars)' }, { status: 400 })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are a data extraction assistant. Extract performer profile information from the text below and return ONLY valid JSON with no markdown fencing.

Text:
"""
${text}
"""

Return this exact JSON structure. Use null for anything not found — never invent values:
{
  "gender": null or "male" or "female" or "non-binary" or "other",
  "date_of_birth": null or "YYYY-MM-DD" (if only age like "28" is given, return null — only return a date if one is explicitly stated),
  "height_cm": null or number (convert feet/inches if needed: 5'8" = 172),
  "hair_color": null or string (e.g. "brown", "blonde", "black", "red", "grey"),
  "eye_color": null or string (e.g. "blue", "brown", "green", "hazel", "grey"),
  "body_type": null or string (e.g. "slim", "athletic", "average", "plus-size", "muscular"),
  "ethnicity": null or string (only if explicitly stated),
  "union_status": null or "actra" or "ubcp" or "non-union" or "actra-apprentice" (pick closest match, only if clearly stated),
  "special_skills": [] or array of short skill strings (e.g. ["horseback riding", "piano", "Spanish"]),
  "bio": null or string (a clean 1-3 sentence bio synthesized from the text — only include if enough context exists)
}`,
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[ai-parse] Anthropic error:', err)
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    const data = await res.json()
    const rawText: string = data.content?.[0]?.text || '{}'
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    // Strip null values so the client can merge cleanly
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) {
        result[k] = v
      }
    }

    return NextResponse.json({ parsed: result })
  } catch (err) {
    console.error('[ai-parse] error:', err)
    return NextResponse.json({ error: 'Failed to parse — try again or fill in manually' }, { status: 500 })
  }
}
