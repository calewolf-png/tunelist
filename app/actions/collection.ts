'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CollectionStatus, TempoFeel, StandardForm, EraTag, FeelTag, Standard } from '@/types/database'
import type { SpotifyTrackMeta } from '@/lib/spotify'

export interface PersonalStandardMeta {
  year_composed?: number | null
  original_key?: string | null
  time_signature?: string
  tempo_feel?: TempoFeel | null
  form?: StandardForm | null
  era_tags?: EraTag[]
  feel_tags?: FeelTag[]
  factoid?: string | null
}

export async function addToCollection(
  standardId: string,
  status: CollectionStatus = 'want_to_learn'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await (supabase.from('user_standards') as any).insert({
    user_id: user.id,
    standard_id: standardId,
    status,
  })

  if (error) return { error: error.message }
  revalidatePath(`/standards/${standardId}`)
  revalidatePath('/collection')
  return {}
}

export async function updateCollectionStatus(
  userStandardId: string,
  status: CollectionStatus
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await (supabase.from('user_standards') as any)
    .update({ status })
    .eq('id', userStandardId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/collection')
  return {}
}

export async function removeFromCollection(
  userStandardId: string,
  standardId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await (supabase.from('user_standards') as any)
    .delete()
    .eq('id', userStandardId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/standards/${standardId}`)
  revalidatePath('/collection')
  return {}
}

export async function createPersonalStandard(
  title: string,
  composer: string[],
  track: SpotifyTrackMeta | null,
  meta?: PersonalStandardMeta
): Promise<{ standardId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: newStandard, error: standardError } = await (supabase.from('standards') as any)
    .insert({
      title: title.trim(),
      composer: composer.filter(Boolean),
      status: 'submitted',
      is_official: false,
      submitted_by: user.id,
      ...(meta?.year_composed !== undefined && { year_composed: meta.year_composed }),
      ...(meta?.original_key !== undefined && { original_key: meta.original_key }),
      ...(meta?.time_signature ? { time_signature: meta.time_signature } : {}),
      ...(meta?.tempo_feel !== undefined && { tempo_feel: meta.tempo_feel }),
      ...(meta?.form !== undefined && { form: meta.form }),
      ...(meta?.era_tags !== undefined && { era_tags: meta.era_tags }),
      ...(meta?.feel_tags !== undefined && { feel_tags: meta.feel_tags }),
      ...(meta?.factoid !== undefined && { factoid: meta.factoid }),
    })
    .select('id')
    .single()

  if (standardError) return { error: standardError.message }
  const standardId = newStandard.id

  // Add to user's collection
  await (supabase.from('user_standards') as any).insert({
    user_id: user.id,
    standard_id: standardId,
    status: 'want_to_learn',
  })

  // Attach the Spotify recording if provided
  if (track) {
    const { data: created } = await (supabase.from('recordings') as any)
      .insert({
        standard_id: standardId,
        platform: 'spotify',
        external_url: track.externalUrl,
        external_id: track.id,
        artist: track.artist,
        album_title: track.album,
        album_art_url: track.albumArt,
        year_recorded: track.year,
        duration_ms: track.durationMs,
        added_by: user.id,
      })
      .select('id')
      .single()

    if (created) {
      await (supabase.from('user_recordings') as any).insert({
        user_id: user.id,
        recording_id: created.id,
      })
    }
  }

  revalidatePath('/collection')
  return { standardId }
}

export async function forkToPersonalVariant(
  officialStandardId: string,
  changes: Record<string, unknown>
): Promise<{ standardId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const [{ data: rawOfficial }, { data: rawUserStandard }] = await Promise.all([
    (supabase.from('standards') as any).select('*').eq('id', officialStandardId).single(),
    (supabase.from('user_standards') as any).select('status').eq('standard_id', officialStandardId).eq('user_id', user.id).single(),
  ])
  const official = rawOfficial as Standard | null
  if (!official) return { error: 'Standard not found' }
  const collectionStatus: CollectionStatus = (rawUserStandard as { status: CollectionStatus } | null)?.status ?? 'want_to_learn'

  const { data: newStandard, error: insertError } = await (supabase.from('standards') as any)
    .insert({
      title: official.title,
      composer: official.composer,
      year_composed: official.year_composed,
      original_key: official.original_key,
      time_signature: official.time_signature,
      tempo_feel: official.tempo_feel,
      form: official.form,
      era_tags: official.era_tags,
      feel_tags: official.feel_tags,
      factoid: official.factoid,
      ...changes,
      is_official: false,
      status: 'submitted',
      submitted_by: user.id,
      source_standard_id: officialStandardId,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }
  const variantId = newStandard.id

  // Swap the collection entry: remove official, add variant (preserving status)
  await (supabase.from('user_standards') as any)
    .delete()
    .eq('standard_id', officialStandardId)
    .eq('user_id', user.id)

  const { error: insertUsError } = await (supabase.from('user_standards') as any)
    .insert({ user_id: user.id, standard_id: variantId, status: collectionStatus })

  if (insertUsError) return { error: insertUsError.message }

  revalidatePath('/collection')
  revalidatePath(`/collection/${variantId}`)
  return { standardId: variantId }
}

export async function updatePersonalStandard(
  standardId: string,
  fields: Partial<PersonalStandardMeta & { title: string; composer: string[] }>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await (supabase.from('standards') as any)
    .update(fields)
    .eq('id', standardId)
    .eq('submitted_by', user.id)
    .eq('status', 'submitted')
    .eq('is_official', false)

  if (error) return { error: error.message }
  revalidatePath(`/collection/${standardId}`)
  return {}
}
