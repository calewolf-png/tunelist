'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addToCollection } from '@/app/actions/collection'
import { addRecording } from '@/app/actions/recordings'
import type { SpotifyTrackMeta } from '@/lib/spotify'
import AddTuneModal from './AddTuneModal'

interface StandardResult {
  id: string
  title: string
  composer: string[]
  form: string | null
}

interface SpotifyMatch extends StandardResult {
  inCollection: boolean
  userStandardId: string | null
}

interface SpotifyMatchResponse {
  track: SpotifyTrackMeta
  matches: SpotifyMatch[]
}

type Phase =
  | { name: 'idle' }
  | { name: 'search'; results: StandardResult[]; loading: boolean }
  | { name: 'spotify-ready' }
  | { name: 'spotify-fetching' }
  | { name: 'spotify-result'; data: SpotifyMatchResponse }

interface Props {
  collectionStandardIds: Set<string>
}

function isSpotifyUrl(s: string) {
  return /spotify\.com\/track\//.test(s)
}

export default function AddTuneBar({ collectionStandardIds }: Props) {
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalComposer, setModalComposer] = useState('')
  const [modalTrack, setModalTrack] = useState<SpotifyTrackMeta | null>(null)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPhase({ name: 'idle' }); setError(null)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleInputChange(value: string) {
    setInput(value); setError(null)
    if (!value.trim()) { setPhase({ name: 'idle' }); return }
    if (isSpotifyUrl(value)) { setPhase({ name: 'spotify-ready' }); return }
    setPhase({ name: 'search', results: [], loading: true })
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      if (value.trim().length < 2) return
      const res = await fetch(`/api/standards/search?q=${encodeURIComponent(value.trim())}`)
      const results: StandardResult[] = await res.json()
      setPhase({ name: 'search', results, loading: false })
    }, 250)
  }

  async function handleSpotifyFetch() {
    setPhase({ name: 'spotify-fetching' }); setError(null)
    const res = await fetch(`/api/spotify/match?url=${encodeURIComponent(input.trim())}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to fetch track'); setPhase({ name: 'spotify-ready' }); return }
    setPhase({ name: 'spotify-result', data })
  }

  function handleAddStandard(standard: StandardResult) {
    if (collectionStandardIds.has(standard.id)) { router.push(`/collection/${standard.id}`); return }
    startTransition(async () => { await addToCollection(standard.id); router.push(`/collection/${standard.id}`) })
  }

  function handleSpotifyConfirmInCollection(match: SpotifyMatch, track: SpotifyTrackMeta) {
    startTransition(async () => {
      const r = await addRecording(match.id, track)
      if (r.error) { setError(r.error); return }
      router.push(`/collection/${match.id}`)
    })
  }

  function handleSpotifyConfirmAdd(match: SpotifyMatch, track: SpotifyTrackMeta) {
    startTransition(async () => {
      const a = await addToCollection(match.id)
      if (a.error) { setError(a.error); return }
      const r = await addRecording(match.id, track)
      if (r.error) { setError(r.error); return }
      router.push(`/collection/${match.id}`)
    })
  }

  function openModal(title: string, composer: string, track: SpotifyTrackMeta | null) {
    setModalTitle(title)
    setModalComposer(composer)
    setModalTrack(track)
    setModalOpen(true)
    reset()
  }

  function reset() {
    setInput(''); setPhase({ name: 'idle' }); setError(null)
    inputRef.current?.focus()
  }

  const showPanel = phase.name !== 'idle' && phase.name !== 'spotify-ready' && phase.name !== 'spotify-fetching'

  return (
    <>
      <div ref={containerRef} className="relative mb-10">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Add to collection</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') reset()
                if (e.key === 'Enter' && phase.name === 'spotify-ready') handleSpotifyFetch()
              }}
              placeholder="Search by title, or paste a Spotify link…"
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-32 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors shadow-sm"
            />
            {phase.name === 'idle' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-100 rounded-full px-2.5 py-1 pointer-events-none select-none">
                Spotify link ↵
              </span>
            )}
          </div>
          {(phase.name === 'spotify-ready' || phase.name === 'spotify-fetching') && (
            <button
              onClick={handleSpotifyFetch}
              disabled={phase.name === 'spotify-fetching' || isPending}
              className="px-4 py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {phase.name === 'spotify-fetching' ? '…' : 'Fetch'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 px-0.5">
          <span className="text-xs text-slate-400">
            <span className="text-slate-500 font-medium">Search by title</span> — add a tune to your collection
          </span>
          <span className="text-slate-300 select-none">·</span>
          <span className="text-xs text-slate-400">
            <span className="text-slate-500 font-medium">Paste a Spotify link</span> — add a tune with a recording
          </span>
        </div>

        {error && phase.name === 'spotify-ready' && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}

        {showPanel && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">

            {phase.name === 'search' && (
              <>
                {phase.loading && <p className="text-sm text-slate-400 px-4 py-3">Searching…</p>}
                {!phase.loading && phase.results.length === 0 && input.trim().length >= 2 && (
                  <div className="px-4 py-3">
                    <p className="text-sm text-slate-500 mb-2">No standards match "{input}".</p>
                    <button
                      onClick={() => openModal(input, '', null)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                    >
                      + Add "{input}" as a personal tune
                    </button>
                  </div>
                )}
                {phase.results.map((s) => {
                  const inCollection = collectionStandardIds.has(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleAddStandard(s)}
                      disabled={isPending}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{s.title}</p>
                          {s.composer.length > 0 && <p className="text-xs text-slate-500">{s.composer.join(', ')}</p>}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 ml-3">
                          {inCollection ? '✓ In collection' : 'Add →'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </>
            )}

            {phase.name === 'spotify-result' && (() => {
              const { track, matches } = phase.data
              const inCollectionMatch = matches.find(m => m.inCollection)
              const officialMatch = matches.find(m => !m.inCollection)

              return (
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
                    {track.albumArt && <img src={track.albumArt} alt={track.album} className="w-10 h-10 rounded object-cover shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{track.name}</p>
                      <p className="text-xs text-slate-500 truncate">{track.artist} · {track.album}</p>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                  {inCollectionMatch ? (
                    <>
                      <p className="text-sm text-slate-600 mb-3">
                        Matches <span className="font-medium text-slate-900">{inCollectionMatch.title}</span> in your collection.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => handleSpotifyConfirmInCollection(inCollectionMatch, track)} disabled={isPending}
                          className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                          {isPending ? 'Saving…' : 'Add this recording'}
                        </button>
                        <button onClick={reset} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                      </div>
                    </>
                  ) : officialMatch ? (
                    <>
                      <p className="text-sm text-slate-600 mb-3">
                        Matches <span className="font-medium text-slate-900">{officialMatch.title}</span> in the official catalog.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => handleSpotifyConfirmAdd(officialMatch, track)} disabled={isPending}
                          className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                          {isPending ? 'Adding…' : `Add "${officialMatch.title}" + recording`}
                        </button>
                        <button onClick={reset} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 mb-3">No matching standard found.</p>
                      <div className="flex gap-2">
                        <button onClick={() => openModal(track.name, track.artist, track)} disabled={isPending}
                          className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                          Add as new tune
                        </button>
                        <button onClick={reset} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {modalOpen && (
        <AddTuneModal
          initialTitle={modalTitle}
          initialComposer={modalComposer}
          track={modalTrack}
          onClose={() => setModalOpen(false)}
          onCreated={(standardId) => { setModalOpen(false); router.push(`/collection/${standardId}`) }}
        />
      )}
    </>
  )
}
