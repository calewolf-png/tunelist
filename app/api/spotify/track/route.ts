import type { NextRequest } from 'next/server'
import { parseSpotifyTrackId, fetchSpotifyTrack } from '@/lib/spotify'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return Response.json({ error: 'Missing url param' }, { status: 400 })
  }

  const trackId = parseSpotifyTrackId(url)
  if (!trackId) {
    return Response.json({ error: 'Invalid Spotify track URL' }, { status: 400 })
  }

  try {
    const track = await fetchSpotifyTrack(trackId)
    return Response.json(track)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch track'
    return Response.json({ error: message }, { status: 500 })
  }
}
