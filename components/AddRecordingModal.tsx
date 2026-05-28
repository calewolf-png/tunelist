'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addRecording } from '@/app/actions/recordings'
import type { SpotifyTrackMeta } from '@/lib/spotify'

interface Props {
  standardId: string
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; track: SpotifyTrackMeta }

export default function AddRecordingModal({ standardId }: Props) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function handleClose() {
    setOpen(false); setUrl(''); setFetchState({ status: 'idle' }); setSaveError(null)
  }

  async function handleFetch() {
    if (!url.trim()) return
    setFetchState({ status: 'loading' }); setSaveError(null)
    try {
      const res = await fetch(`/api/spotify/track?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      setFetchState(res.ok ? { status: 'ready', track: data } : { status: 'error', message: data.error ?? 'Failed to fetch track' })
    } catch {
      setFetchState({ status: 'error', message: 'Network error' })
    }
  }

  function handleSave() {
    if (fetchState.status !== 'ready') return
    startTransition(async () => {
      const result = await addRecording(standardId, fetchState.track)
      if (result.error) { setSaveError(result.error); return }
      handleClose()
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
      >
        + Add recording
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Add a recording</h2>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none">×</button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); if (fetchState.status !== 'idle') setFetchState({ status: 'idle' }) }}
                onKeyDown={e => { if (e.key === 'Enter') handleFetch() }}
                placeholder="Paste a Spotify track URL…"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors"
              />
              <button
                onClick={handleFetch}
                disabled={!url.trim() || fetchState.status === 'loading'}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-40"
              >
                {fetchState.status === 'loading' ? '…' : 'Fetch'}
              </button>
            </div>

            {fetchState.status === 'error' && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{fetchState.message}</p>
            )}

            {fetchState.status === 'ready' && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
                {fetchState.track.albumArt && (
                  <img src={fetchState.track.albumArt} alt={fetchState.track.album} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{fetchState.track.artist}</p>
                  <p className="text-xs text-slate-500 truncate">{fetchState.track.album}</p>
                  {fetchState.track.year && <p className="text-xs text-slate-400">{fetchState.track.year}</p>}
                </div>
              </div>
            )}

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{saveError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={fetchState.status !== 'ready' || isPending}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 shadow-sm"
              >
                {isPending ? 'Saving…' : 'Add to my recordings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
