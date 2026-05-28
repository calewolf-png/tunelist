'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditTuneModal from './EditTuneModal'
import SubmitForReviewCallout from './SubmitForReviewCallout'
import VariantCallout from './VariantCallout'
import type { Standard } from '@/types/database'

interface Props {
  standard: Standard
  userId: string
  isOfficial: boolean
  pendingAiNotes?: string | null
  sourceTuneTitle?: string | null
}

export default function TuneActions({ standard, userId, isOfficial, pendingAiNotes, sourceTuneTitle }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [approved, setApproved] = useState(false)
  const [approvedDismissed, setApprovedDismissed] = useState(false)
  const router = useRouter()

  const isOwnPersonalTune = standard.submitted_by === userId && !isOfficial

  return (
    <>
      {approved && !approvedDismissed && (
        <div className="mb-6 rounded-xl px-5 py-4 border" style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#14532d' }}>Added to the global Tunelist</p>
                <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>Thank you for contributing to the community catalog.</p>
              </div>
            </div>
            <button
              onClick={() => { setApprovedDismissed(true); router.refresh() }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
              style={{ backgroundColor: '#16a34a', color: '#fff' }}
            >
              Cool!
            </button>
          </div>
        </div>
      )}

      {!approved && isOwnPersonalTune && standard.status === 'submitted' && (
        standard.source_standard_id ? (
          <VariantCallout
            standard={standard}
            sourceTuneTitle={sourceTuneTitle ?? standard.title}
            userId={userId}
          />
        ) : (
          <SubmitForReviewCallout
            standard={standard}
            userId={userId}
            onEditClick={() => setEditOpen(true)}
            onApproved={() => setApproved(true)}
          />
        )
      )}

      {!approved && isOwnPersonalTune && standard.status === 'pending' && (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-slate-700">
            {standard.source_standard_id ? 'Your proposed changes are in review' : 'Your submission is in review'}
          </p>
          {pendingAiNotes ? (
            <p className="text-xs text-slate-500 mt-1">Reviewer note: {pendingAiNotes}</p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              {standard.source_standard_id
                ? "We'll update the official catalog entry once verified."
                : "It'll be added to the global catalog once verified."}
            </p>
          )}
        </div>
      )}

      {editOpen && (
        <EditTuneModal
          standard={standard}
          isOfficial={isOfficial}
          onClose={() => setEditOpen(false)}
          onSaved={(newId?: string) => { if (newId) router.push(`/collection/${newId}`); else router.refresh() }}
        />
      )}
    </>
  )
}
