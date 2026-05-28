'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addToCollection, updateCollectionStatus } from '@/app/actions/collection'
import type { CollectionStatus, UserStandard } from '@/types/database'

const STATUS_OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: 'know', label: 'Know it' },
  { value: 'learning', label: 'Learning' },
  { value: 'want_to_learn', label: 'Want to learn' },
]

const STATUS_LABELS: Record<CollectionStatus, string> = {
  know: 'Know it',
  learning: 'Learning',
  want_to_learn: 'Want to learn',
}

interface Props {
  standardId: string
  userStandard: UserStandard | null
  musicianMode: boolean
}

export default function CollectionButton({ standardId, userStandard, musicianMode }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const inCollection = !!userStandard

  function add(status: CollectionStatus = 'want_to_learn') {
    setOpen(false)
    startTransition(async () => { await addToCollection(standardId, status) })
  }
  function pick(status: CollectionStatus) {
    setOpen(false)
    startTransition(async () => { if (userStandard) await updateCollectionStatus(userStandard.id, status) })
  }

  const baseBtn = `text-sm px-3 py-1.5 rounded-lg font-medium border transition-colors disabled:opacity-50`

  if (!musicianMode) {
    if (inCollection) return null
    return (
      <button
        onClick={() => add()}
        disabled={isPending}
        className={`${baseBtn} bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400`}
      >
        {isPending ? '…' : '+ Add to collection'}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => inCollection ? setOpen(!open) : add()}
        disabled={isPending}
        className={`${baseBtn} ${
          inCollection
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
        }`}
      >
        {isPending ? '…' : inCollection ? `✓ ${STATUS_LABELS[userStandard!.status]}` : '+ Add to collection'}
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden py-1">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => pick(value)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                userStandard?.status === value
                  ? 'text-indigo-700 font-medium bg-indigo-50'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {userStandard?.status === value ? `✓ ${label}` : label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
