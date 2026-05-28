import type { NextRequest } from 'next/server'
import { parseSpotifyTrackId, fetchSpotifyTrack } from '@/lib/spotify'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

  const trackId = parseSpotifyTrackId(url)
  if (!trackId) return Response.json({ error: 'Invalid Spotify track URL' }, { status: 400 })

  try {
    const track = await fetchSpotifyTrack(trackId)
    const supabase = await createClient()

    // Search official standards by track name (strip parentheticals for better match)
    const searchTitle = track.name.replace(/\s*[\(\[].*[\)\]]/g, '').trim()
    const { data: officialMatches } = await supabase
      .from('standards')
      .select('id, title, composer, form')
      .eq('status', 'official')
      .ilike('title', `%${searchTitle}%`)
      .limit(5)

    // Check which of those matches are in the user's collection
    const { data: { user } } = await supabase.auth.getUser()
    const matches = officialMatches ?? []
    let collectionMap: Record<string, string> = {} // standardId → userStandardId

    if (user && matches.length > 0) {
      const { data: userStandards } = await (supabase.from('user_standards') as any)
        .select('id, standard_id')
        .eq('user_id', user.id)
        .in('standard_id', matches.map((m: { id: string }) => m.id))

      for (const us of (userStandards ?? [])) {
        collectionMap[us.standard_id] = us.id
      }
    }

    return Response.json({
      track,
      matches: matches.map((m: { id: string; title: string; composer: string[]; form: string | null }) => ({
        ...m,
        inCollection: m.id in collectionMap,
        userStandardId: collectionMap[m.id] ?? null,
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch track'
    return Response.json({ error: message }, { status: 500 })
  }
}
