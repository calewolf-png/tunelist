'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveToMyRecordings } from '@/app/actions/recordings'

interface Props {
  recordingId: string
  standardId: string
}

export default function SaveRecordingButton({ recordingId, standardId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <button
      onClick={() => startTransition(async () => { await saveToMyRecordings(recordingId, standardId); router.refresh() })}
      disabled={isPending}
      className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-40 font-medium"
    >
      {isPending ? '…' : '+ Save'}
    </button>
  )
}
