'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkWellFormedness } from '@/lib/tune-utils'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import type { Standard } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_FIELDS = `composer (string[]), year_composed (integer), original_key ("C major"|"C minor"|"Db major"|"Db minor"|"D major"|"D minor"|"Eb major"|"Eb minor"|"E major"|"E minor"|"F major"|"F minor"|"F# major"|"F# minor"|"G major"|"G minor"|"Ab major"|"Ab minor"|"A major"|"A minor"|"Bb major"|"Bb minor"|"B major"|"B minor"|null), time_signature (string), tempo_feel ("ballad"|"medium"|"up-tempo"|"variable"|null), form ("blues"|"rhythm-changes"|null), era_tags (string[]), feel_tags (string[]), factoid (string|null)`

const REVIEW_SYSTEM = `You are a jazz reference expert and quality reviewer for Tunelist, a community jazz standards catalog.
Review a user-submitted tune and decide whether it can enter the official catalog.
Return ONLY valid JSON — no markdown, code fences, or commentary.

Schema: { "decision": "approve" | "suggest" | "queue", "reason": string, "suggestions": { ...fields } | null }

Valid suggestion fields (ONLY these, with EXACT names): ${VALID_FIELDS}
Never include any other field names in suggestions. Never invent fields not in this list.

Rules:
- "approve": You recognize this as a real jazz standard and the core metadata is reasonable. This is the default — lean toward approving well-known tunes from the jazz canon. Stylistic differences, factoid wording, and minor uncertainties are not reasons to suggest. When in doubt between approve and suggest, approve.
- "suggest": A field contains a clear, indisputable factual error you are 100% certain about (wrong composer name, clearly wrong key). Only include fields you are fully certain about. If a fact is disputed or ambiguous across sources, do NOT suggest a correction — instead explain the ambiguity in "reason" and approve or queue. Never suggest rewrites of factoids that are accurate but worded differently than you'd prefer.
- "queue": The title is clearly not a jazz standard; core metadata appears fabricated; or the factoid is offensive or demonstrably false. Reserve for genuinely problematic submissions only.
For amendment reviews, always return "queue".`

const REVIEW_SYSTEM_REVERIFY = `You are a jazz reference expert reviewing a jazz standard that has already gone through at least one round of AI review and user correction. The user has researched the feedback and made their best corrections.

Return ONLY valid JSON — no markdown, code fences, or commentary.

Schema: { "decision": "approve" | "queue", "reason": string, "suggestions": null }

Rules:
- "approve": Default for any real jazz standard. The user has already reviewed AI feedback and verified their data — trust their judgment on disputed details like dates or factoid wording. Approve unless there is an indisputable, fundamental problem.
- "queue": The submission has a fundamental problem you are certain about — e.g. this is not a jazz standard at all, the title is nonsense, or the factoid is offensive. Do not queue for minor uncertainties or differences of opinion.

Always set suggestions to null. Do not suggest further corrections.`

function formatTuneForReview(s: Standard): string {
  return [
    `Title: ${s.title}`,
    `Composer: ${s.composer.join(', ') || 'unknown'}`,
    `Year composed: ${s.year_composed ?? 'unknown'}`,
    `Original key: ${s.original_key ?? 'unknown'}`,
    `Time signature: ${s.time_signature}`,
    `Tempo feel: ${s.tempo_feel ?? 'unknown'}`,
    `Form: ${s.form ?? 'standard'}`,
    `Era tags: ${s.era_tags.join(', ') || 'none'}`,
    `Feel tags: ${s.feel_tags.join(', ') || 'none'}`,
    `Factoid: ${s.factoid ?? 'none'}`,
  ].join('\n')
}

interface ReviewResult {
  decision: 'approve' | 'suggest' | 'queue'
  reason: string
  suggestions: Record<string, unknown> | null
}

async function callClaudeReview(standard: Standard, reVerify = false): Promise<ReviewResult | { error: string }> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: reVerify ? REVIEW_SYSTEM_REVERIFY : REVIEW_SYSTEM,
      messages: [{ role: 'user', content: formatTuneForReview(standard) }],
    })
    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
    const parsed = JSON.parse(text)
    const validDecisions = reVerify ? ['approve', 'queue'] : ['approve', 'suggest', 'queue']
    if (!validDecisions.includes(parsed.decision)) {
      return { error: `Unexpected decision: ${JSON.stringify(parsed)}` }
    }
    return parsed as ReviewResult
  } catch (e) {
    return { error: String(e) }
  }
}

// Uses the authenticated client — the RLS UPDATE policy allows submitted→pending for own tunes.
async function setPending(supabase: Awaited<ReturnType<typeof createClient>>, standardId: string): Promise<string | null> {
  const { error } = await (supabase.from('standards') as any)
    .update({ status: 'pending' })
    .eq('id', standardId)
  return error?.message ?? null
}

export type SubmitForReviewOutcome =
  | { decision: 'approve' }
  | { decision: 'suggest'; suggestions: Record<string, unknown>; aiReason: string }
  | { decision: 'queue'; aiReason?: string }
  | { error: string }

export async function submitForReview(standardId: string): Promise<SubmitForReviewOutcome> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rawStandard } = await (supabase.from('standards') as any)
    .select('*').eq('id', standardId).single()
  const standard = rawStandard as Standard | null
  if (!standard) return { error: 'Standard not found' }
  if (standard.submitted_by !== user.id) return { error: 'Not authorized' }
  if (standard.status !== 'submitted') return { error: 'Standard is not in submitted state' }

  const { isWellFormed } = checkWellFormedness(standard)
  if (!isWellFormed) return { error: 'Tune is missing required fields' }

  const review = await callClaudeReview(standard)

  if ('error' in review) {
    return { error: `AI review failed: ${review.error}` }
  }

  if (review.decision === 'approve') {
    const { error: rpcError } = await (supabase as any).rpc('promote_standard_to_official', {
      p_standard_id: standardId,
      p_user_id: user.id,
      p_ai_notes: review.reason,
    })
    if (rpcError) return { error: rpcError.message }
    revalidatePath('/standards')
    return { decision: 'approve' }
  }

  if (review.decision === 'suggest' && review.suggestions) {
    return {
      decision: 'suggest',
      suggestions: review.suggestions,
      aiReason: review.reason,
    }
  }

  // queue
  await (supabase.from('standard_requests') as any).insert({
    title: standard.title,
    composer: standard.composer.join(', '),
    requested_by: user.id,
    standard_id: standardId,
    status: 'pending',
    request_type: 'new_standard',
    reviewed_by_ai: true,
    ai_notes: review.reason,
  })
  const err = await setPending(supabase, standardId)
  if (err) return { error: err }
  revalidatePath(`/collection/${standardId}`)
  return { decision: 'queue', aiReason: review.reason }
}

export async function applyAndSubmit(
  standardId: string,
  suggestions: Record<string, unknown>
): Promise<SubmitForReviewOutcome> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rawStandard } = await (supabase.from('standards') as any)
    .select('*').eq('id', standardId).single()
  const standard = rawStandard as Standard | null
  if (!standard) return { error: 'Standard not found' }
  if (standard.submitted_by !== user.id) return { error: 'Not authorized' }

  // Normalize array fields Claude may return as strings
  const normalized: Record<string, unknown> = { ...suggestions }
  if (typeof normalized.composer === 'string') {
    normalized.composer = (normalized.composer as string).split(/[,;]+/).map(s => s.trim()).filter(Boolean)
  }
  if (typeof normalized.era_tags === 'string') {
    normalized.era_tags = (normalized.era_tags as string).split(/[,;]+/).map(s => s.trim()).filter(Boolean)
  }
  if (typeof normalized.feel_tags === 'string') {
    normalized.feel_tags = (normalized.feel_tags as string).split(/[,;]+/).map(s => s.trim()).filter(Boolean)
  }

  // Apply suggestions via RLS-governed update
  const { error: updateError } = await (supabase.from('standards') as any)
    .update(normalized)
    .eq('id', standardId)
    .eq('submitted_by', user.id)
    .eq('status', 'submitted')

  if (updateError) return { error: updateError.message }

  // Re-fetch updated standard and re-review
  const { data: rawUpdated } = await (supabase.from('standards') as any)
    .select('*').eq('id', standardId).single()
  const updated = rawUpdated as Standard | null
  if (!updated) return { error: 'Failed to re-fetch standard' }

  const review = await callClaudeReview(updated, true)

  if ('error' in review) {
    return { error: `AI review failed: ${review.error}` }
  }

  if (review.decision === 'approve') {
    const { error: rpcError } = await (supabase as any).rpc('promote_standard_to_official', {
      p_standard_id: standardId,
      p_user_id: user.id,
      p_ai_notes: review.reason,
    })
    if (rpcError) return { error: rpcError.message }
    revalidatePath('/standards')
    return { decision: 'approve' }
  }

  // queue
  await (supabase.from('standard_requests') as any).insert({
    title: updated.title,
    composer: updated.composer.join(', '),
    requested_by: user.id,
    standard_id: standardId,
    status: 'pending',
    request_type: 'new_standard',
    reviewed_by_ai: true,
    ai_notes: review.reason,
  })
  const err = await setPending(supabase, standardId)
  if (err) return { error: err }
  revalidatePath(`/collection/${standardId}`)
  return { decision: 'queue', aiReason: review.reason }
}

export async function submitAnyway(standardId: string): Promise<{ decision: 'queue' } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rawStandard } = await (supabase.from('standards') as any)
    .select('title, composer, submitted_by, status').eq('id', standardId).single()
  const standard = rawStandard as Pick<Standard, 'title' | 'composer' | 'submitted_by' | 'status'> | null
  if (!standard) return { error: 'Standard not found' }
  if (standard.submitted_by !== user.id) return { error: 'Not authorized' }

  await (supabase.from('standard_requests') as any).insert({
    title: standard.title,
    composer: standard.composer.join(', '),
    requested_by: user.id,
    standard_id: standardId,
    status: 'pending',
    request_type: 'new_standard',
    reviewed_by_ai: false,
  })
  const err = await setPending(supabase, standardId)
  if (err) return { error: err }
  revalidatePath(`/collection/${standardId}`)
  return { decision: 'queue' }
}

const AMENDMENT_REVIEW_SYSTEM = `You are a jazz reference expert reviewing a proposed correction to an official Tunelist entry.
Return ONLY valid JSON — no markdown, code fences, or commentary.

Schema: { "decision": "approve" | "queue", "reason": string }

Rules:
- "approve": The proposed value is factually correct for this jazz standard and you are confident. Be liberal — approve corrections to objectively verifiable facts (key, year, composer spelling, etc.) when you can verify them.
- "queue": You cannot verify the change, or it appears incorrect or debatable. Flag for human review.`

function formatAmendmentForReview(standard: Standard, proposedChanges: Record<string, unknown>): string {
  const lines = [`Current standard:\n${formatTuneForReview(standard)}`, '\nProposed changes:']
  for (const [key, val] of Object.entries(proposedChanges)) {
    const current = (standard as Record<string, unknown>)[key]
    const currentStr = Array.isArray(current) ? (current as string[]).join(', ') : String(current ?? 'none')
    const proposedStr = Array.isArray(val) ? (val as string[]).join(', ') : String(val ?? 'none')
    lines.push(`- ${key}: "${currentStr}" → "${proposedStr}"`)
  }
  return lines.join('\n')
}

export type AmendmentOutcome =
  | { decision: 'approve'; officialStandardId?: string }
  | { decision: 'queue'; aiReason?: string }
  | { error: string }

export async function submitAmendment(
  standardId: string,
  proposedChanges: Record<string, unknown>
): Promise<AmendmentOutcome> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rawStandard } = await (supabase.from('standards') as any)
    .select('*').eq('id', standardId).single()
  const standard = rawStandard as Standard | null
  if (!standard) return { error: 'Standard not found' }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: AMENDMENT_REVIEW_SYSTEM,
      messages: [{ role: 'user', content: formatAmendmentForReview(standard, proposedChanges) }],
    })
    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
    const parsed = JSON.parse(text)

    if (parsed.decision === 'approve') {
      const service = createServiceClient()
      const { error: updateError } = await (service.from('standards') as any)
        .update(proposedChanges)
        .eq('id', standardId)
      if (updateError) return { error: updateError.message }
      revalidatePath(`/collection/${standardId}`)
      revalidatePath('/standards')
      return { decision: 'approve' }
    }

    // queue with AI reason
    await (supabase.from('standard_requests') as any).insert({
      title: standard.title,
      composer: standard.composer.join(', '),
      requested_by: user.id,
      standard_id: standardId,
      status: 'pending',
      request_type: 'amendment',
      proposed_changes: proposedChanges,
      reviewed_by_ai: true,
      ai_notes: parsed.reason,
    })
    revalidatePath(`/collection/${standardId}`)
    return { decision: 'queue', aiReason: parsed.reason }
  } catch {
    // AI failed — queue without review
    await (supabase.from('standard_requests') as any).insert({
      title: standard.title,
      composer: standard.composer.join(', '),
      requested_by: user.id,
      standard_id: standardId,
      status: 'pending',
      request_type: 'amendment',
      proposed_changes: proposedChanges,
      reviewed_by_ai: false,
    })
    revalidatePath(`/collection/${standardId}`)
    return { decision: 'queue' }
  }
}

const STANDARD_FIELDS: (keyof Standard)[] = [
  'title', 'composer', 'year_composed', 'original_key',
  'time_signature', 'tempo_feel', 'form', 'era_tags', 'feel_tags', 'factoid',
]

function diffStandards(official: Standard, variant: Standard): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  for (const field of STANDARD_FIELDS) {
    if (JSON.stringify(official[field]) !== JSON.stringify(variant[field])) {
      diff[field] = variant[field]
    }
  }
  return diff
}

export async function submitVariantProposal(variantStandardId: string): Promise<AmendmentOutcome> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rawVariant } = await (supabase.from('standards') as any)
    .select('*').eq('id', variantStandardId).single()
  const variant = rawVariant as Standard | null
  if (!variant) return { error: 'Variant not found' }
  if (!variant.source_standard_id) return { error: 'Not a variant' }
  if (variant.submitted_by !== user.id) return { error: 'Not authorized' }

  const { data: rawOfficial } = await (supabase.from('standards') as any)
    .select('*').eq('id', variant.source_standard_id).single()
  const official = rawOfficial as Standard | null
  if (!official) return { error: 'Original standard not found' }

  const proposedChanges = diffStandards(official, variant)
  if (Object.keys(proposedChanges).length === 0) return { error: 'No differences from the official version' }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: AMENDMENT_REVIEW_SYSTEM,
      messages: [{ role: 'user', content: formatAmendmentForReview(official, proposedChanges) }],
    })
    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
    const parsed = JSON.parse(text)

    if (parsed.decision === 'approve') {
      const service = createServiceClient()
      await (service.from('standards') as any)
        .update(proposedChanges)
        .eq('id', official.id)
      await (service.from('user_standards') as any)
        .update({ standard_id: official.id })
        .eq('standard_id', variantStandardId)
        .eq('user_id', user.id)
      revalidatePath(`/collection/${official.id}`)
      revalidatePath('/standards')
      return { decision: 'approve', officialStandardId: official.id }
    }

    await (supabase.from('standard_requests') as any).insert({
      title: official.title,
      composer: official.composer.join(', '),
      requested_by: user.id,
      standard_id: official.id,
      status: 'pending',
      request_type: 'amendment',
      proposed_changes: proposedChanges,
      reviewed_by_ai: true,
      ai_notes: parsed.reason,
    })
    const err = await setPending(supabase, variantStandardId)
    if (err) return { error: err }
    revalidatePath(`/collection/${variantStandardId}`)
    return { decision: 'queue', aiReason: parsed.reason }
  } catch {
    await (supabase.from('standard_requests') as any).insert({
      title: official.title,
      composer: official.composer.join(', '),
      requested_by: user.id,
      standard_id: official.id,
      status: 'pending',
      request_type: 'amendment',
      proposed_changes: proposedChanges,
      reviewed_by_ai: false,
    })
    const err = await setPending(supabase, variantStandardId)
    if (err) return { error: err }
    revalidatePath(`/collection/${variantStandardId}`)
    return { decision: 'queue' }
  }
}
