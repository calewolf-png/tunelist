'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removeFromCollection } from '@/app/actions/collection'

interface Props {
  userStandardId: string
  standardId: string
}

export default function RemoveFromCollectionButton({ userStandardId, standardId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  function handleRemove() {
    startTransition(async () => {
      await removeFromCollection(userStandardId, standardId)
      router.push('/collection')
    })
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Remove from collection?</span>
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? 'Removing…' : 'Yes, remove'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
    >
      Remove
    </button>
  )
}
