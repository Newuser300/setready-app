import { NextRequest, NextResponse } from 'next/server'

// ── A-LIST: Interactive Scenes — AI scene-partner game backend ──
// One route, three actions: generate a scene, react as the scene partner, score the take.
// The Anthropic key stays server-side. Output is strict JSON the client renders.
// Cost control: the frequent scene-partner reaction uses Haiku; scene generation and
// the Director's scoring (where quality matters most) use Sonnet.

const MODEL_SONNET = 'claude-sonnet-4-6'
const MODEL_HAIKU = 'claude-haiku-4-5-20251001'

async function callClaude(system: string, user: string, maxTokens = 900, model = MODEL_SONNET): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  return text
}

function extractJSON(raw: string): any {
  // Strip code fences and grab the first {...} block.
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON in model output')
  return JSON.parse(cleaned.slice(start, end + 1))
}

const GENRES = ['Drama', 'Rom-Com', 'Horror', 'Action', 'Thriller', 'Sci-Fi', 'Soap Opera', 'Period Drama', 'Comedy', 'Crime']

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI is not configured on the server.' }, { status: 500 })
    }
    const body = await req.json().catch(() => ({}))
    const action = body?.action

    // ── 1) Generate a fresh scene for an audition ──
    if (action === 'scene') {
      const rank = String(body?.rank || 'Extra')
      const genre = body?.genre && GENRES.includes(body.genre) ? body.genre : GENRES[Math.floor(Math.random() * GENRES.length)]
      const system = `You are the casting engine for "A-List", an acting game. Invent a single short, vivid film SCENE for the player to perform in. The player will act opposite ONE AI character. Keep it grounded, playable, emotionally clear, and fresh. Difficulty scales with the actor's rank (${rank}): higher ranks get subtler, higher-stakes scenes. Output ONLY JSON, no prose, no markdown:
{
  "genre": "${genre}",
  "title": "short scene title",
  "slug": "INT./EXT. LOCATION — TIME",
  "setup": "2-3 sentence setup of the dramatic situation, written in second person ('You are...')",
  "partnerName": "the AI character's name",
  "partnerRole": "who they are to the player",
  "partnerOpensWith": "the first line of dialogue the AI character says to open the scene, in character",
  "objective": "what the player's character wants in this scene (their motivation)",
  "lines": ["3 distinct suggested opening line options the player could say, each a different emotional tactic"]
}`
      const text = await callClaude(system, `Genre: ${genre}. Actor rank: ${rank}. Generate the scene.`, 700)
      const scene = extractJSON(text)
      scene.genre = scene.genre || genre
      return NextResponse.json({ scene })
    }

    // ── 2) Scene partner reacts to the player's line, in character ──
    if (action === 'react') {
      const { scene, history, playerLine } = body || {}
      if (!scene || !playerLine) return NextResponse.json({ error: 'Missing scene or line' }, { status: 400 })
      const convo = (Array.isArray(history) ? history : [])
        .map((h: any) => `${h.who === 'player' ? 'ACTOR' : scene.partnerName}: ${h.text}`)
        .join('\n')
      const system = `You are "${scene.partnerName}", ${scene.partnerRole}, performing a ${scene.genre} scene opposite a human actor. Stay fully in character. React truthfully and specifically to what the actor just said — reward emotional honesty, surprise, and commitment with a richer reaction; respond to deflection or flatness as the character realistically would. Keep your reply to 1-3 sentences of spoken dialogue (optionally a brief *stage direction* in asterisks). Never break character, never mention being an AI. Output ONLY JSON:
{ "line": "your in-character spoken response", "beat": "one short phrase naming the emotional shift you just played" }`
      const user = `SCENE: ${scene.slug}\nSETUP: ${scene.setup}\nYour character: ${scene.partnerName} — ${scene.partnerRole}\n\nScene so far:\n${convo}\n\nACTOR just said: "${playerLine}"\n\nRespond in character.`
      const text = await callClaude(system, user, 350, MODEL_HAIKU)
      const out = extractJSON(text)
      return NextResponse.json({ reaction: out })
    }

    // ── 3) The Director scores the finished take ──
    if (action === 'score') {
      const { scene, history } = body || {}
      if (!scene) return NextResponse.json({ error: 'Missing scene' }, { status: 400 })
      const transcript = (Array.isArray(history) ? history : [])
        .map((h: any) => `${h.who === 'player' ? 'ACTOR' : scene.partnerName}: ${h.text}`)
        .join('\n')
      const system = `You are THE DIRECTOR in "A-List" — a sharp, witty, fair casting director judging an actor's take. Score the ACTOR's performance only (not the AI partner). Be honest and specific, with personality — memorable, quotable notes, never generic. Reward emotional truth, specificity, listening/reacting to the partner, originality, and commitment. Penalize genericness, breaking character, or ignoring the scene's stakes. Output ONLY JSON:
{
  "verdict": "one of: CUT IT, NEEDS WORK, SOLID TAKE, THAT'S A WRAP, STAR IS BORN",
  "scores": { "truth": 0-100, "presence": 0-100, "originality": 0-100 },
  "overall": 0-100,
  "buzz": integer points awarded (overall/2 rounded, 0-50),
  "note": "2-3 sentences of director's feedback, in a distinct directorial voice",
  "highlight": "the single strongest moment of the take, quoted or described briefly"
}`
      const user = `SCENE: ${scene.title} (${scene.genre})\nObjective the actor was playing: ${scene.objective}\n\nTHE TAKE:\n${transcript}\n\nScore the actor's performance.`
      const text = await callClaude(system, user, 600)
      const out = extractJSON(text)
      // clamp + safety
      out.overall = Math.max(0, Math.min(100, Math.round(out.overall ?? 50)))
      out.buzz = Math.max(0, Math.min(50, Math.round(out.buzz ?? Math.round(out.overall / 2))))
      return NextResponse.json({ result: out })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Something went wrong on set.' }, { status: 500 })
  }
}
