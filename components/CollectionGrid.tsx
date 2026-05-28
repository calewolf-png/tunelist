'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Standard, UserStandard, EraTag, FeelTag, TempoFeel, CollectionStatus } from '@/types/database'
import CollectionButton from './CollectionButton'
import Tooltip from './Tooltip'

type Row = UserStandard & { standard: Standard }

const ERA_LABELS: Record<string, string> = {
  'great-american-songbook': 'GAS', 'bebop': 'Bebop', 'hard-bop': 'Hard Bop',
  'post-bop': 'Post-Bop', 'swing': 'Swing', 'cool': 'Cool', 'modal': 'Modal',
  'fusion': 'Fusion', 'traditional': 'Traditional',
}

const FEEL_LABELS: Record<string, string> = {
  'ballad': 'Ballad', 'bossa-nova': 'Bossa Nova', 'latin': 'Latin',
  'afro-cuban': 'Afro-Cuban', 'samba': 'Samba', 'funk': 'Funk', 'straight-8ths': 'Straight 8ths',
}

const ERA_OPTIONS: { value: EraTag; label: string }[] = [
  { value: 'great-american-songbook', label: 'Great American Songbook' },
  { value: 'bebop', label: 'Bebop' },
  { value: 'hard-bop', label: 'Hard Bop' },
  { value: 'post-bop', label: 'Post-Bop' },
  { value: 'swing', label: 'Swing' },
  { value: 'cool', label: 'Cool' },
  { value: 'modal', label: 'Modal' },
  { value: 'fusion', label: 'Fusion' },
  { value: 'traditional', label: 'Traditional' },
]

const FEEL_OPTIONS: { value: FeelTag; label: string }[] = [
  { value: 'ballad', label: 'Ballad' },
  { value: 'bossa-nova', label: 'Bossa Nova' },
  { value: 'latin', label: 'Latin' },
  { value: 'afro-cuban', label: 'Afro-Cuban' },
  { value: 'samba', label: 'Samba' },
  { value: 'funk', label: 'Funk' },
  { value: 'straight-8ths', label: 'Straight 8ths' },
]

const TEMPO_OPTIONS: { value: TempoFeel; label: string }[] = [
  { value: 'ballad', label: 'Ballad' },
  { value: 'medium', label: 'Medium' },
  { value: 'up-tempo', label: 'Up-Tempo' },
  { value: 'variable', label: 'Variable' },
]

const STATUS_OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: 'know', label: 'Know it' },
  { value: 'learning', label: 'Learning' },
  { value: 'want_to_learn', label: 'Want to learn' },
]

type FormFilter = 'all' | 'blues' | 'rhythm-changes' | 'standard'

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function SidebarButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

export default function CollectionGrid({ rows, musicianMode }: { rows: Row[]; musicianMode: boolean }) {
  const [query, setQuery] = useState('')
  const [formFilter, setFormFilter] = useState<FormFilter>('all')
  const [eraFilters, setEraFilters] = useState<Set<EraTag>>(new Set())
  const [feelFilters, setFeelFilters] = useState<Set<FeelTag>>(new Set())
  const [tempoFilter, setTempoFilter] = useState<TempoFeel | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CollectionStatus | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return rows.filter(row => {
      const s = row.standard
      if (q && !s.title.toLowerCase().includes(q) && !s.composer.some(c => c.toLowerCase().includes(q))) return false
      if (formFilter === 'blues' && s.form !== 'blues') return false
      if (formFilter === 'rhythm-changes' && s.form !== 'rhythm-changes') return false
      if (formFilter === 'standard' && s.form !== null) return false
      if (eraFilters.size > 0 && !s.era_tags.some(t => eraFilters.has(t as EraTag))) return false
      if (feelFilters.size > 0 && !s.feel_tags.some(t => feelFilters.has(t as FeelTag))) return false
      if (tempoFilter !== 'all' && s.tempo_feel !== tempoFilter) return false
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      return true
    })
  }, [rows, query, formFilter, eraFilters, feelFilters, tempoFilter, statusFilter])

  function toggleEra(tag: EraTag) {
    setEraFilters(prev => { const n = new Set(prev); n.has(tag) ? n.delete(tag) : n.add(tag); return n })
  }
  function toggleFeel(tag: FeelTag) {
    setFeelFilters(prev => { const n = new Set(prev); n.has(tag) ? n.delete(tag) : n.add(tag); return n })
  }

  const hasFilters = query || formFilter !== 'all' || eraFilters.size > 0 || feelFilters.size > 0 || tempoFilter !== 'all' || statusFilter !== 'all'

  function clearFilters() {
    setQuery(''); setFormFilter('all'); setEraFilters(new Set()); setFeelFilters(new Set()); setTempoFilter('all'); setStatusFilter('all')
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-44 shrink-0">
        <div className="sticky top-20 space-y-6">
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
              Clear filters
            </button>
          )}
          {musicianMode && (
            <SidebarSection title="Status">
              <SidebarButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</SidebarButton>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <SidebarButton key={value} active={statusFilter === value} onClick={() => setStatusFilter(statusFilter === value ? 'all' : value)}>
                  {label}
                </SidebarButton>
              ))}
            </SidebarSection>
          )}
          <SidebarSection title="Form">
            {(['all', 'standard', 'blues', 'rhythm-changes'] as const).map(v => (
              <SidebarButton key={v} active={formFilter === v} onClick={() => setFormFilter(v)}>
                {v === 'all' ? 'All' : v === 'standard' ? 'Standard' : v === 'blues' ? 'Blues' : 'Rhythm Changes'}
              </SidebarButton>
            ))}
          </SidebarSection>
          <SidebarSection title="Tempo">
            <SidebarButton active={tempoFilter === 'all'} onClick={() => setTempoFilter('all')}>All</SidebarButton>
            {TEMPO_OPTIONS.map(({ value, label }) => (
              <SidebarButton key={value} active={tempoFilter === value} onClick={() => setTempoFilter(tempoFilter === value ? 'all' : value)}>
                {label}
              </SidebarButton>
            ))}
          </SidebarSection>
          <SidebarSection title="Era">
            {ERA_OPTIONS.map(({ value, label }) => (
              <SidebarButton key={value} active={eraFilters.has(value)} onClick={() => toggleEra(value)}>
                {label}
              </SidebarButton>
            ))}
          </SidebarSection>
          <SidebarSection title="Feel">
            {FEEL_OPTIONS.map(({ value, label }) => (
              <SidebarButton key={value} active={feelFilters.has(value)} onClick={() => toggleFeel(value)}>
                {label}
              </SidebarButton>
            ))}
          </SidebarSection>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="mb-5">
          <input
            type="text"
            placeholder="Search by title or composer…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors shadow-sm"
          />
        </div>
        <p className="text-xs text-slate-400 mb-4">{filtered.length} of {rows.length} tunes</p>
        <div className="space-y-1.5">
          {filtered.map(row => {
            const s = row.standard
            const metaParts: string[] = []
            if (s.original_key) metaParts.push(s.original_key)
            if (s.time_signature !== '4/4') metaParts.push(s.time_signature)
            if (s.tempo_feel) metaParts.push(s.tempo_feel.replace('-', ' '))
            return (
              <div
                key={row.id}
                className="flex items-start justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <Link href={`/collection/${row.standard_id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {s.title}
                    </p>
                    {s.form && (
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium border ${
                        s.form === 'blues'
                          ? 'bg-sky-50 text-sky-600 border-sky-200'
                          : 'bg-violet-50 text-violet-600 border-violet-200'
                      }`}>
                        {s.form === 'blues' ? 'Blues' : 'RC'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate capitalize">
                    {[
                      s.composer.join(', '),
                      s.year_composed ? String(s.year_composed) : null,
                      ...metaParts,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  {(s.era_tags.length > 0 || s.feel_tags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {s.era_tags.map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {ERA_LABELS[tag] ?? tag}
                        </span>
                      ))}
                      {s.feel_tags.map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {FEEL_LABELS[tag] ?? tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
                <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                  {!s.is_official && (
                    <Tooltip text="You added this tune — it's not yet in the global catalog">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium border" style={{ backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}>
                        Personal
                      </span>
                    </Tooltip>
                  )}
                  <CollectionButton standardId={row.standard_id} userStandard={row} musicianMode={musicianMode} />
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && rows.length > 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-base mb-1">No tunes found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
