import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Standard, Recording } from '@/types/database'
import AddToCollectionButton from '@/components/AddToCollectionButton'

const ERA_LABELS: Record<string, string> = {
  'great-american-songbook': 'Great American Songbook',
  'bebop': 'Bebop', 'hard-bop': 'Hard Bop', 'post-bop': 'Post-Bop',
  'swing': 'Swing', 'cool': 'Cool', 'modal': 'Modal',
  'fusion': 'Fusion', 'traditional': 'Traditional',
}

const FEEL_LABELS: Record<string, string> = {
  'ballad': 'Ballad', 'bossa-nova': 'Bossa Nova', 'latin': 'Latin',
  'afro-cuban': 'Afro-Cuban', 'samba': 'Samba', 'funk': 'Funk', 'straight-8ths': 'Straight 8ths',
}

export default async function StandardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: rawStandard }, { data: rawRecordings }, { data: rawUserStandard }] = await Promise.all([
    supabase.from('standards').select('*').eq('id', id).eq('status', 'official').single(),
    supabase.from('recordings').select('*').eq('standard_id', id).order('year_recorded'),
    user
      ? (supabase.from('user_standards') as any).select('id').eq('standard_id', id).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const standard = rawStandard as Standard | null
  const recordings = (rawRecordings ?? []) as Recording[]
  const inCollection = !!rawUserStandard

  if (!standard) notFound()

  return (
    <div className="max-w-2xl">
      <Link href="/standards" className="text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6 inline-block">
        ← All Tunes
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-start gap-3 min-w-0">
            <h1 className="text-3xl font-semibold text-slate-900 leading-tight">{standard.title}</h1>
            {standard.form && (
              <span className={`mt-2 shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
                standard.form === 'blues'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-violet-50 text-violet-700 border-violet-200'
              }`}>
                {standard.form === 'blues' ? 'Blues' : 'Rhythm Changes'}
              </span>
            )}
          </div>
          <div className="shrink-0 mt-1">
            {user ? (
              <AddToCollectionButton standardId={id} inCollection={inCollection} />
            ) : (
              <Link href="/login" className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 transition-colors">
                Sign in to collect
              </Link>
            )}
          </div>
        </div>
        <p className="text-slate-500">
          {standard.composer.join(', ')}
          {standard.year_composed && <span className="text-slate-400"> · {standard.year_composed}</span>}
        </p>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {standard.original_key && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Key</p>
            <p className="text-sm font-semibold text-slate-900">{standard.original_key}</p>
          </div>
        )}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-1">Time</p>
          <p className="text-sm font-semibold text-slate-900">{standard.time_signature}</p>
        </div>
        {standard.tempo_feel && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Tempo</p>
            <p className="text-sm font-semibold text-slate-900 capitalize">{standard.tempo_feel.replace('-', ' ')}</p>
          </div>
        )}
      </div>

      {/* Tags */}
      {(standard.era_tags.length > 0 || standard.feel_tags.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {standard.era_tags.map(tag => (
            <span key={tag} className="text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-600">{ERA_LABELS[tag] ?? tag}</span>
          ))}
          {standard.feel_tags.map(tag => (
            <span key={tag} className="text-sm px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{FEEL_LABELS[tag] ?? tag}</span>
          ))}
        </div>
      )}

      {/* Factoid */}
      {standard.factoid && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Did you know</p>
          <p className="text-sm text-slate-700 leading-relaxed">{standard.factoid}</p>
        </div>
      )}

      {/* Recordings — read-only */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Recordings</h2>
        {recordings.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-400 text-sm">No recordings yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recordings.map(r => (
              <div key={r.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                {r.album_art_url && (
                  <img src={r.album_art_url} alt={r.album_title ?? ''} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.artist}</p>
                  {r.album_title && <p className="text-xs text-slate-500 truncate">{r.album_title}</p>}
                  {r.year_recorded && <p className="text-xs text-slate-400">{r.year_recorded}</p>}
                </div>
                <a
                  href={r.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-medium capitalize"
                >
                  {r.platform.replace('_', ' ')}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
