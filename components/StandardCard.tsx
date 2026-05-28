import Link from 'next/link'
import type { Standard } from '@/types/database'

const ERA_LABELS: Record<string, string> = {
  'great-american-songbook': 'GAS',
  'bebop': 'Bebop',
  'hard-bop': 'Hard Bop',
  'post-bop': 'Post-Bop',
  'swing': 'Swing',
  'cool': 'Cool',
  'modal': 'Modal',
  'fusion': 'Fusion',
  'traditional': 'Traditional',
}

const FEEL_LABELS: Record<string, string> = {
  'ballad': 'Ballad',
  'bossa-nova': 'Bossa Nova',
  'latin': 'Latin',
  'afro-cuban': 'Afro-Cuban',
  'samba': 'Samba',
  'funk': 'Funk',
  'straight-8ths': 'Straight 8ths',
}

export default function StandardCard({ standard }: { standard: Standard }) {
  return (
    <Link
      href={`/standards/${standard.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="font-semibold text-slate-900 leading-snug">{standard.title}</h2>
        {standard.form && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${
            standard.form === 'blues'
              ? 'bg-sky-50 text-sky-700 border-sky-200'
              : 'bg-violet-50 text-violet-700 border-violet-200'
          }`}>
            {standard.form === 'blues' ? 'Blues' : 'Rhythm Changes'}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-3">
        {standard.composer.join(', ')}
        {standard.year_composed && (
          <span className="text-slate-400"> · {standard.year_composed}</span>
        )}
      </p>

      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
        {standard.original_key && <span>{standard.original_key}</span>}
        {standard.original_key && (standard.time_signature !== '4/4' || standard.tempo_feel) && (
          <span className="text-slate-300">·</span>
        )}
        {standard.time_signature !== '4/4' && (
          <>
            <span>{standard.time_signature}</span>
            {standard.tempo_feel && <span className="text-slate-300">·</span>}
          </>
        )}
        {standard.tempo_feel && (
          <span className="capitalize">{standard.tempo_feel.replace('-', ' ')}</span>
        )}
      </div>

      {(standard.era_tags.length > 0 || standard.feel_tags.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {standard.era_tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {ERA_LABELS[tag] ?? tag}
            </span>
          ))}
          {standard.feel_tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              {FEEL_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
