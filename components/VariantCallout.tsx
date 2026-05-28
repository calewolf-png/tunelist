'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitVariantProposal } from '@/app/actions/review'
import type { Standard } from '@/types/database'

type Phase =
  | { k: 'idle' }
  | { k: 'loading' }
  | { k: 'success-approved'; officialStandardId: string }
  | { k: 'success-queued'; aiReason?: string }
  | { k: 'error'; message: string }

interface Props {
  standard: Standard
  sourceTuneTitle: string
  userId: string
}

export default function VariantCallout({ standard, sourceTuneTitle, userId }: Props) {
  const [phase, setPhase] = useState<Phase>({ k: 'idle' })
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const dismissKey = `hide-variant-banner-${standard.id}`

  useEffect(() => {
    if (localStorage.getItem(dismissKey) === 'true') setDismissed(true)
  }, [dismissKey])

  function handleDismiss() {
    localStorage.setItem(dismissKey, 'true')
    setDismissed(true)
  }

  if (standard.submitted_by !== userId || standard.status !== 'submitted') return null
  if (dismissed && phase.k === 'idle') return null

  const isLoading = isPending || phase.k === 'loading'

  function handlePropose() {
    setPhase({ k: 'loading' })
    startTransition(async () => {
      const result = await submitVariantProposal(standard.id)
      if ('error' in result) { setPhase({ k: 'error', message: result.error }); return }
      if (result.decision === 'approve') {
        setPhase({ k: 'success-approved', officialStandardId: result.officialStandardId! })
        return
      }
      setPhase({ k: 'success-queued', aiReason: result.aiReason })
      router.refresh()
    })
  }

  if (phase.k === 'loading') {
    return (
      <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg className="animate-spin w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm text-indigo-700">Reviewing your changes — this takes a few seconds…</p>
      </div>
    )
  }

  if (phase.k === 'success-approved') {
    return (
      <div className="mb-6 rounded-xl px-4 py-3 border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <p className="text-sm font-semibold" style={{ color: '#14532d' }}>Changes applied to the official catalog</p>
        <p className="text-xs mt-0.5 mb-3" style={{ color: '#15803d' }}>The official entry for {sourceTuneTitle} has been updated.</p>
        <button
          onClick={() => router.push(`/collection/${phase.officialStandardId}`)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: '#16a34a', color: '#fff' }}
        >
          View updated tune →
        </button>
      </div>
    )
  }

  if (phase.k === 'success-queued') {
    return (
      <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-slate-700">Changes submitted for review</p>
        {phase.aiReason ? (
          <p className="text-xs text-slate-500 mt-1">Reviewer note: {phase.aiReason}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-0.5">We'll update the official catalog entry once verified.</p>
        )}
      </div>
    )
  }

  if (phase.k === 'error') {
    return (
      <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-sm text-red-700">{phase.message}</p>
        <button onClick={() => setPhase({ k: 'idle' })} className="text-xs text-red-600 hover:text-red-800 font-medium shrink-0">Try again</button>
      </div>
    )
  }

  return (
    <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-indigo-900">This is your personal version of {sourceTuneTitle}</p>
        <button onClick={handleDismiss} className="text-indigo-300 hover:text-indigo-500 transition-colors shrink-0 text-lg leading-none">×</button>
      </div>
      <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
        Your changes aren't reflected in the official catalog yet. Propose them for review — if approved, the official entry will be updated.
      </p>
      <button
        onClick={handlePropose}
        disabled={isLoading}
        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        Propose changes to official catalog
      </button>
    </div>
  )
}
