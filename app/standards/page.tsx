import { createClient } from '@/lib/supabase/server'
import StandardsGrid from '@/components/StandardsGrid'
import type { Standard } from '@/types/database'

export default async function StandardsPage() {
  const supabase = await createClient()

  const { data: rawStandards, error } = await supabase
    .from('standards')
    .select('*')
    .eq('status', 'official')
    .order('title')

  const sortKey = (title: string) => title.replace(/^[^a-z0-9]+/i, '').toLowerCase()
  const standards = (rawStandards as Standard[] | null)
    ?.slice()
    .sort((a, b) => sortKey(a.title).localeCompare(sortKey(b.title))) ?? null

  if (error) {
    return <p className="text-red-400">Failed to load standards: {error.message}</p>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">All Tunes</h1>
        <p className="text-slate-500 text-sm">The official catalog of jazz standards. Browse to discover tunes and add them to your collection.</p>
      </div>
      <StandardsGrid standards={standards ?? []} />
    </div>
  )
}
