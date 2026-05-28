'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addToCollection } from '@/app/actions/collection'

interface Props {
  standardId: string
  inCollection: boolean
}

export default function AddToCollectionButton({ standardId, inCollection }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (inCollection) {
    return (
      <Link
        href={`/collection/${standardId}`}
        className="text-sm px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium hover:bg-indigo-100 transition-colors"
      >
        ✓ In your collection →
      </Link>
    )
  }

  async function handleAdd() {
    setLoading(true)
    const { error } = await addToCollection(standardId)
    if (!error) {
      router.push(`/collection/${standardId}`)
    } else {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Adding…' : '+ Add to collection'}
    </button>
  )
}
