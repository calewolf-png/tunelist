import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Standard, Recording, UserStandard } from '@/types/database'
import AddRecordingModal from '@/components/AddRecordingModal'
import CollectionButton from '@/components/CollectionButton'
import SaveRecordingButton from '@/components/SaveRecordingButton'
import RemoveFromCollectionButton from '@/components/RemoveFromCollectionButton'
import TuneActions from '@/components/TuneActions'
import EditButton from '@/components/EditButton'
import Tooltip from '@/components/Tooltip'

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

function RecordingRow({ r, action }: { r: Recording; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-colors">
      {r.album_art_url && (
        <img src={r.album_art_url} alt={r.album_title ?? ''} className="w-11 h-11 rounded-lg object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{r.artist}</p>
        {r.album_title && <p className="text-xs text-slate-500 truncate">{r.album_title}</p>}
        {r.year_recorded && <p className="text-xs text-slate-400">{r.year_recorded}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        <a
          href={r.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
          aria-label={r.platform}
        >
          {r.platform === 'spotify' ? (
            <svg viewBox="0 0 24 24" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#1DB954" />
              <path fill="white" d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75c-.5.15-1-.15-1.15-.6-.15-.5.15-1 .6-1.15C9.3 6.95 15.15 7.15 18.85 9.35c.45.25.6.85.35 1.3-.25.35-.85.5-1.3.25zm-.1 2.8c-.25.35-.7.5-1.05.25-2.7-1.65-6.8-2.15-9.95-1.15-.4.1-.85-.1-.95-.5-.1-.4.1-.85.5-.95 3.65-1.1 8.15-.55 11.25 1.35.3.15.45.65.2 1zm-1.2 2.75c-.2.3-.55.4-.85.2-2.35-1.45-5.3-1.75-8.8-.95-.35.1-.65-.15-.75-.45-.1-.35.15-.65.45-.75 3.8-.85 7.1-.5 9.7 1.1.35.15.4.55.25.85z" />
            </svg>
          ) : (
            <span className="text-xs text-slate-600 font-medium capitalize">{r.platform.replace('_', ' ')}</span>
          )}
        </a>
      </div>
    </div>
  )
}

export default async function CollectionTunePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawStandard }, { data: rawUserStandard }, { data: profileData }, { data: rawPendingRequest }] = await Promise.all([
    supabase.from('standards').select('*').eq('id', id).single(),
    (supabase.from('user_standards') as any).select('*').eq('standard_id', id).eq('user_id', user.id).maybeSingle(),
    (supabase.from('profiles') as any).select('musician_mode').eq('id', user.id).single(),
    (supabase.from('standard_requests') as any).select('ai_notes').eq('standard_id', id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const standard = rawStandard as Standard | null
  if (!standard) notFound()
  if (!rawUserStandard) redirect(`/standards/${id}`)

  // For variants, fetch recordings from both the variant and the source standard
  const recordingIds = [id, standard.source_standard_id].filter(Boolean) as string[]
  const [{ data: rawRecordings }, sourceData] = await Promise.all([
    (supabase.from('recordings') as any).select('*').in('standard_id', recordingIds).order('year_recorded'),
    standard.source_standard_id
      ? (supabase.from('standards') as any).select('title').eq('id', standard.source_standard_id).single()
      : Promise.resolve({ data: null }),
  ])

  const sourceTitle = (sourceData?.data as { title: string } | null)?.title ?? null
  const allRecordings = (rawRecordings ?? []) as Recording[]
  const userStandard = rawUserStandard as UserStandard
  const musicianMode = (profileData as { musician_mode: boolean } | null)?.musician_mode ?? false
  const pendingAiNotes = (rawPendingRequest as { ai_notes: string | null } | null)?.ai_notes ?? null

  let myRecordingIds = new Set<string>()
  if (allRecordings.length > 0) {
    const { data: savedRows } = await (supabase.from('user_recordings') as any)
      .select('recording_id').eq('user_id', user.id)
      .in('recording_id', allRecordings.map(r => r.id))
    for (const row of (savedRows ?? [])) myRecordingIds.add(row.recording_id)
  }

  const myRecordings = allRecordings.filter(r => myRecordingIds.has(r.id))
  const suggestions = allRecordings.filter(r => !myRecordingIds.has(r.id))
  const isOfficial = standard.status === 'official'

  return (
    <div className="max-w-2xl">
      <Link href="/collection" className="text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6 inline-block">
        ← My Collection
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
          <div className="shrink-0 mt-1 flex items-center gap-2">
            {isOfficial && (
              <Link
                href={`/standards/${id}`}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                View in All Tunes ↗
              </Link>
            )}
            <CollectionButton standardId={id} userStandard={userStandard} musicianMode={musicianMode} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-slate-500">
              {standard.composer.join(', ')}
              {standard.year_composed && <span className="text-slate-400"> · {standard.year_composed}</span>}
            </p>
            {isOfficial
              ? <Tooltip text="Part of the verified global Tunelist catalog"><span className="text-xs font-medium border rounded-full px-2 py-0.5" style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>Official</span></Tooltip>
              : <Tooltip text="You added this tune — it's not yet in the global catalog"><span className="text-xs font-medium border rounded-full px-2 py-0.5" style={{ backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}>Personal</span></Tooltip>
            }
          </div>
          <div className="flex items-center gap-3">
            <EditButton standard={standard} isOfficial={isOfficial} />
            <RemoveFromCollectionButton userStandardId={userStandard.id} standardId={id} />
          </div>
        </div>
      </div>

      <TuneActions standard={standard} userId={user.id} isOfficial={isOfficial} pendingAiNotes={pendingAiNotes} sourceTuneTitle={sourceTitle} />

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

      {/* My recordings */}
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">My recordings</h2>
            <AddRecordingModal standardId={id} />
          </div>
          {myRecordings.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <p className="text-slate-400 text-sm">No recordings saved yet.</p>
              <p className="text-slate-300 text-xs mt-1">Add via Spotify link, or save a suggestion below.</p>
            </div>
          ) : (
            <div className="space-y-2">{myRecordings.map(r => <RecordingRow key={r.id} r={r} />)}</div>
          )}
        </div>

        {suggestions.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Popular recordings</h2>
            <div className="space-y-2">
              {suggestions.map(r => (
                <RecordingRow key={r.id} r={r} action={<SaveRecordingButton recordingId={r.id} standardId={id} />} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
