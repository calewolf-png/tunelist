const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API_BASE = 'https://api.spotify.com/v1'

export function parseSpotifyTrackId(url: string): string | null {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

async function getToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error('Failed to get Spotify access token')
  const data = await res.json()
  return data.access_token
}

export interface SpotifyTrackMeta {
  id: string
  name: string
  artist: string
  album: string
  albumArt: string | null
  year: number | null
  durationMs: number
  externalUrl: string
}

export async function fetchSpotifyTrack(trackId: string): Promise<SpotifyTrackMeta> {
  const token = await getToken()
  const res = await fetch(`${API_BASE}/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Track not found on Spotify')
  const t = await res.json()

  return {
    id: t.id,
    name: t.name,
    artist: t.artists.map((a: { name: string }) => a.name).join(', '),
    album: t.album.name,
    albumArt: t.album.images[0]?.url ?? null,
    year: t.album.release_date ? parseInt(t.album.release_date.split('-')[0]) : null,
    durationMs: t.duration_ms,
    externalUrl: t.external_urls.spotify,
  }
}
