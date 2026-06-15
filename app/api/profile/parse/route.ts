import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI parse not configured' }, { status: 503 })
  }

  let text: string
  try {
    const body = await req.json()
    text = body.text || ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const prompt = `You are extracting background performer profile data from unstructured text.

Extract ONLY the following fields, returning null for anything not clearly and explicitly stated.
NEVER invent, guess, or infer values. If in doubt, return null.

Return a JSON object with these exact keys:
- gender: "female" | "male" | "non-binary" | "other" | null
- date_of_birth: "YYYY-MM-DD" string | null (convert "28 years old" type phrases to null — exact DOB only)
- height_cm: number | null (convert feet/inches: 5'6" = 167.6, round to 1 decimal)
- hair_color: string | null (normalize to single word e.g. "brown", "blonde", "black")
- eye_color: string | null (normalize to single word e.g. "blue", "green", "brown")
- body_type: string | null (e.g. "athletic", "slim", "average", "curvy")
- ethnicity: string | null (self-described, preserve as-is)
- special_skills: string[] | null (driving, instruments, martial arts, sports, languages that are skills, etc.)
- languages: string[] | null (languages spoken, e.g. ["English", "French", "Spanish"])
- accents: string[] | null (e.g. ["British RP", "Southern American", "Scottish"])
- union_status: "non-union" | "ubcp" | "actra" | "actra-apprentice" | null
- bio: string | null (1–3 sentence professional summary if one exists or can be composed from the text; null if insufficient info)
- acting_experience: string | null (brief phrase e.g. "5 years background", "beginner", "10+ years film/TV")

Text to parse:
${text}

Respond with ONLY the JSON object, no markdown fences, no explanation.`

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
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    const data = await res.json()
    const raw: string = data.content?.[0]?.text || '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
    }

    return NextResponse.json({ parsed })
  } catch {
    return NextResponse.json({ error: 'Network error reaching AI service' }, { status: 502 })
  }
}
