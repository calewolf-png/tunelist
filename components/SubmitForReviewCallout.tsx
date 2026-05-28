'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { checkWellFormedness } from '@/lib/tune-utils'
import {
  submitForReview,
  applyAndSubmit,
  submitAnyway,
  type SubmitForReviewOutcome,
} from '@/app/actions/review'
import type { Standard, EraTag, FeelTag } from '@/types/database'

const ERA_LABELS: Record<string, string> = {
  'great-american-songbook': 'Great American Songbook', 'bebop': 'Bebop', 'hard-bop': 'Hard Bop',
  'post-bop': 'Post-Bop', 'swing': 'Swing', 'cool': 'Cool', 'modal': 'Modal',
  'fusion': 'Fusion', 'traditional': 'Traditional',
}
const FEEL_LABELS: Record<string, string> = {
  'ballad': 'Ballad', 'bossa-nova': 'Bossa Nova', 'latin': 'Latin',
  'afro-cuban': 'Afro-Cuban', 'samba': 'Samba', 'funk': 'Funk', 'straight-8ths': 'Straight 8ths',
}
const FIELD_LABELS: Record<string, string> = {
  title: 'Title', composer: 'Composer', year_composed: 'Year', original_key: 'Key',
  time_signature: 'Time', tempo_feel: 'Tempo', form: 'Form', era_tags: 'Era', feel_tags: 'Feel', factoid: 'Factoid',
}

function formatSuggestionValue(key: string, val: unknown): string {
  if (Array.isArray(val)) {
    return (val as string[]).map(v => ERA_LABELS[v] ?? FEEL_LABELS[v] ?? v).join(', ') || 'none'
  }
  if (val === null || val === '') return 'none'
  return String(val)
}

function currentFieldValue(standard: Standard, key: string): string {
  const val = (standard as Record<string, unknown>)[key]
  if (Array.isArray(val)) {
    return (val as string[]).map(v => ERA_LABELS[v] ?? FEEL_LABELS[v] ?? v).join(', ') || 'none'
  }
  if (val === null || val === undefined || val === '') return 'none'
  return String(val)
}

type Phase =
  | { k: 'idle' }
  | { k: 'loading' }
  | { k: 'suggest'; suggestions: Record<string, unknown>; aiReason: string }
  | { k: 'applying' }
  | { k: 'success-queue'; aiReason?: string }
  | { k: 'error'; message: string }

interface Props {
  standard: Standard
  userId: string
  onEditClick: () => void
  onApproved: () => void
}

export default function SubmitForReviewCallout({ standard, userId, onEditClick, onApproved }: Props) {
  const { isWellFormed, missingFields } = checkWellFormedness(standard)
  const [phase, setPhase] = useState<Phase>({ k: 'idle' })
  const [isPending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  const dismissKey = `hide-submit-banner-${standard.id}`

  useEffect(() => {
    if (localStorage.getItem(dismissKey) === 'true') setDismissed(true)
  }, [dismissKey])

  function handleDismiss() {
    localStorage.setItem(dismissKey, 'true')
    setDismissed(true)
  }

  if (standard.status !== 'submitted' || standard.submitted_by !== userId) return null
  if (dismissed && phase.k === 'idle') return null

  const isLoading = isPending || phase.k === 'loading' || phase.k === 'applying'

  function handleOutcome(outcome: SubmitForReviewOutcome) {
    if ('error' in outcome) { setPhase({ k: 'error', message: outcome.error }); return }
    if (outcome.decision === 'approve') { onApproved(); return }
    if (outcome.decision === 'queue') { setPhase({ k: 'success-queue', aiReason: outcome.aiReason }); router.refresh(); return }
    if (outcome.decision === 'suggest') {
      setPhase({ k: 'suggest', suggestions: outcome.suggestions, aiReason: outcome.aiReason })
    }
  }

  function handleSubmit() {
    setPhase({ k: 'loading' })
    startTransition(async () => {
      const outcome = await submitForReview(standard.id)
      handleOutcome(outcome)
    })
  }

  function handleApplyAndSubmit(suggestions: Record<string, unknown>) {
    setPhase({ k: 'applying' })
    startTransition(async () => {
      const outcome = await applyAndSubmit(standard.id, suggestions)
      handleOutcome(outcome)
    })
  }

  function handleSubmitAnyway() {
    setPhase({ k: 'applying' })
    startTransition(async () => {
      const outcome = await submitAnyway(standard.id)
      handleOutcome(outcome)
    })
  }

  // Not well-formed
  if (!isWellFormed && phase.k === 'idle') {
    return (
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-amber-800">Fill in a few more details to share this tune with the community</p>
          <button onClick={handleDismiss} className="text-amber-400 hover:text-amber-600 transition-colors shrink-0 text-lg leading-none mt-0.5">×</button>
        </div>
        <ul className="text-xs text-amber-700 list-disc list-inside mt-1 mb-2 space-y-0.5">
          {missingFields.map(f => <li key={f}>{f}</li>)}
        </ul>
        <button
          onClick={onEditClick}
          className="text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
        >
          Edit tune →
        </button>
      </div>
    )
  }

  // success-queue
  if (phase.k === 'success-queue') {
    return (
      <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-slate-700">Submission received — under review</p>
        {phase.aiReason ? (
          <p className="text-xs text-slate-500 mt-1">Reviewer note: {phase.aiReason}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-0.5">It'll be added to the global catalog once verified.</p>
        )}
      </div>
    )
  }

  // error
  if (phase.k === 'error') {
    return (
      <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-sm text-red-700">{phase.message}</p>
        <button onClick={() => setPhase({ k: 'idle' })} className="text-xs text-red-600 hover:text-red-800 font-medium shrink-0">Try again</button>
      </div>
    )
  }

  // loading
  if (phase.k === 'loading') {
    return (
      <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg className="animate-spin w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm text-indigo-700">Reviewing your submission — this takes a few seconds…</p>
      </div>
    )
  }

  // suggest
  if (phase.k === 'suggest') {
    const { suggestions, aiReason } = phase
    return (
      <div className="mb-6 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-sky-800 mb-1">A few corrections were found</p>
        <p className="text-xs text-sky-600 mb-3">{aiReason}</p>
        <div className="border border-sky-200 rounded-lg overflow-hidden mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sky-100/60 border-b border-sky-200">
                <th className="text-left font-medium text-sky-600 px-3 py-1.5">Field</th>
                <th className="text-left font-medium text-sky-600 px-3 py-1.5">Current</th>
                <th className="text-left font-medium text-sky-600 px-3 py-1.5">Suggested</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(suggestions).map(([key, val]) => (
                <tr key={key} className="border-b border-sky-100 last:border-0">
                  <td className="px-3 py-1.5 text-slate-500 font-medium">{FIELD_LABELS[key] ?? key}</td>
                  <td className="px-3 py-1.5 text-slate-400">{currentFieldValue(standard, key)}</td>
                  <td className="px-3 py-1.5 text-slate-900">{formatSuggestionValue(key, val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleApplyAndSubmit(suggestions)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Applying…' : 'Apply suggestions & submit'}
          </button>
          <button
            onClick={handleSubmitAnyway}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Submit anyway
          </button>
          <button
            onClick={() => setPhase({ k: 'idle' })}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // idle + well-formed
  return (
    <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-indigo-900">This tune looks complete — share it with the community</p>
        <button onClick={handleDismiss} className="text-indigo-300 hover:text-indigo-500 transition-colors shrink-0 text-lg leading-none">×</button>
      </div>
      <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
        Submit it to the global Tunelist and other musicians will be able to find it and save it to their own collections.
        Submissions are reviewed before going live.
      </p>
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        Submit to global Tunelist
      </button>
    </div>
  )
}
