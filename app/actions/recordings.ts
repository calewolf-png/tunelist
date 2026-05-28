'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SpotifyTrackMeta } from '@/lib/spotify'

export async function addRecording(
  standardId: string,
  track: SpotifyTrackMeta
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Deduplicate: check if this Spotify track is already in the global pool
  const { data: existing } = await (supabase.from('recordings') as any)
    .select('id')
    .eq('external_id', track.id)
    .eq('platform', 'spotify')
    .maybeSingle()

  let recordingId: string

  if (existing) {
    recordingId = existing.id
  } else {
    const { data: created, error } = await (supabase.from('recordings') as any)
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

    if (error) return { error: error.message }
    recordingId = created.id
  }

  // Link to user's personal collection (ignore if already saved)
  await (supabase.from('user_recordings') as any)
    .upsert({ user_id: user.id, recording_id: recordingId }, { onConflict: 'user_id,recording_id' })

  revalidatePath(`/standards/${standardId}`)
  revalidatePath(`/collection/${standardId}`)
  revalidatePath('/collection')
  return {}
}

export async function saveToMyRecordings(
  recordingId: string,
  standardId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await (supabase.from('user_recordings') as any)
    .upsert({ user_id: user.id, recording_id: recordingId }, { onConflict: 'user_id,recording_id' })

  revalidatePath(`/standards/${standardId}`)
  revalidatePath(`/collection/${standardId}`)
  return {}
}
