import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Standard, UserStandard } from '@/types/database'
import AddTuneBar from '@/components/AddTuneBar'
import CollectionGrid from '@/components/CollectionGrid'

type Row = UserStandard & { standard: Standard }

export default async function CollectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawRows }, { data: profileData }] = await Promise.all([
    (supabase.from('user_standards') as any)
      .select('*, standard:standards(*)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false }),
    (supabase.from('profiles') as any)
      .select('musician_mode')
      .eq('id', user.id)
      .single(),
  ])

  const rows = (rawRows ?? []) as Row[]
  const musicianMode = (profileData as { musician_mode: boolean } | null)?.musician_mode ?? false
  const collectionStandardIds = new Set(rows.map(r => r.standard_id))
  const total = rows.length

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">My Collection</h1>

      <AddTuneBar collectionStandardIds={collectionStandardIds} />

      {total === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-14 text-center">
          <p className="text-slate-600 font-medium mb-1">Your collection is empty</p>
          <p className="text-slate-400 text-sm">Search for a tune above, or paste a Spotify link to get started.</p>
        </div>
      ) : (
        <CollectionGrid rows={rows} musicianMode={musicianMode} />
      )}
    </div>
  )
}
