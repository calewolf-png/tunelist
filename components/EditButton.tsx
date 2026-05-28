'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditTuneModal from './EditTuneModal'
import type { Standard } from '@/types/database'

interface Props {
  standard: Standard
  isOfficial: boolean
}

export default function EditButton({ standard, isOfficial }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        Edit
      </button>
      {open && (
        <EditTuneModal
          standard={standard}
          isOfficial={isOfficial}
          onClose={() => setOpen(false)}
          onSaved={(newStandardId?: string) => {
            setOpen(false)
            if (newStandardId) router.push(`/collection/${newStandardId}`)
            else router.refresh()
          }}
        />
      )}
    </>
  )
}
