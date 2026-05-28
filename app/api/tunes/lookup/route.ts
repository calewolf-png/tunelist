import Anthropic from '@anthropic-ai/sdk'
import type { TempoFeel, StandardForm, EraTag, FeelTag, KeySignature } from '@/types/database'

export interface TuneLookupResult {
  found: boolean
  title: string
  composer: string[]
  year_composed: number | null
  original_key: KeySignature | null
  time_signature: string
  tempo_feel: TempoFeel | null
  form: StandardForm | null
  era_tags: EraTag[]
  feel_tags: FeelTag[]
  factoid: string | null
  field_confidence: {
    title: number
    composer: number
    year_composed: number
    original_key: number
    time_signature: number
    tempo_feel: number
    form: number
    era_tags: number
    feel_tags: number
    factoid: number
  }
}

const SYSTEM_PROMPT = `You are a jazz reference expert with comprehensive knowledge of jazz standards, their composers, years, musical characteristics, and history.

When given a tune title and optional composer hint, return a JSON object matching this exact schema. Never include markdown, code fences, or commentary — raw JSON only.

Schema:
{
  "found": boolean,
  "title": string,
  "composer": string[],
  "year_composed": number | null,
  "original_key": string | null,
  "time_signature": string,
  "tempo_feel": "ballad" | "medium" | "up-tempo" | "variable" | null,
  "form": "blues" | "rhythm-changes" | null,
  "era_tags": array of zero or more from: ["great-american-songbook","bebop","hard-bop","post-bop","swing","cool","modal","fusion","traditional"],
  "feel_tags": array of zero or more from: ["ballad","bossa-nova","latin","afro-cuban","samba","funk","straight-8ths"],
  "factoid": string | null,
  "field_confidence": {
    "title": number,
    "composer": number,
    "year_composed": number,
    "original_key": number,
    "time_signature": number,
    "tempo_feel": number,
    "form": number,
    "era_tags": number,
    "feel_tags": number,
    "factoid": number
  }
}

Rules:
- Set "found" to false if you do not recognize this as a real jazz standard.
- Confidence scores are 0.0 to 1.0. Use below 0.7 for fields you are guessing about.
- If "found" is false, set all confidence scores below 0.5.
- "original_key" must be one of exactly these 24 values or null: "C major","C minor","Db major","Db minor","D major","D minor","Eb major","Eb minor","E major","E minor","F major","F minor","F# major","F# minor","G major","G minor","Ab major","Ab minor","A major","A minor","Bb major","Bb minor","B major","B minor". Use null if confidence < 0.7.
- "time_signature" defaults to "4/4" unless you know otherwise.
- "factoid" is a 1-2 sentence genuinely interesting historical or musical fact. Set null if you cannot produce a good one.
- Always return valid complete JSON. Never truncate.`

function extractJSON(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned)
}

function isValidResult(obj: unknown): obj is TuneLookupResult {
  return typeof obj === 'object' && obj !== null && 'found' in obj && 'field_confidence' in obj
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, composer } = body as { title?: string; composer?: string }
    if (!title?.trim()) {
      return Response.json({ error: 'title is required' }, { status: 400 })
    }

    const client = new Anthropic()
    const userMessage = `Look up this jazz tune: "${title.trim()}"${composer?.trim() ? ` (composer hint: ${composer.trim()})` : ''}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = extractJSON(raw)

    if (!isValidResult(parsed)) {
      return Response.json({ error: 'invalid response from AI' }, { status: 500 })
    }

    return Response.json(parsed)
  } catch (err) {
    console.error('tunes/lookup error:', err)
    return Response.json({ error: 'lookup failed' }, { status: 500 })
  }
}
