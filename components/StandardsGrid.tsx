'use client'

import { useState, useMemo } from 'react'
import type { Standard, EraTag, FeelTag, TempoFeel } from '@/types/database'
import StandardCard from './StandardCard'

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

export default function StandardsGrid({ standards }: { standards: Standard[] }) {
  const [query, setQuery] = useState('')
  const [formFilter, setFormFilter] = useState<FormFilter>('all')
  const [eraFilters, setEraFilters] = useState<Set<EraTag>>(new Set())
  const [feelFilters, setFeelFilters] = useState<Set<FeelTag>>(new Set())
  const [tempoFilter, setTempoFilter] = useState<TempoFeel | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return standards.filter(s => {
      if (q && !s.title.toLowerCase().includes(q) && !s.composer.some(c => c.toLowerCase().includes(q))) return false
      if (formFilter === 'blues' && s.form !== 'blues') return false
      if (formFilter === 'rhythm-changes' && s.form !== 'rhythm-changes') return false
      if (formFilter === 'standard' && s.form !== null) return false
      if (eraFilters.size > 0 && !s.era_tags.some(t => eraFilters.has(t as EraTag))) return false
      if (feelFilters.size > 0 && !s.feel_tags.some(t => feelFilters.has(t as FeelTag))) return false
      if (tempoFilter !== 'all' && s.tempo_feel !== tempoFilter) return false
      return true
    })
  }, [standards, query, formFilter, eraFilters, feelFilters, tempoFilter])

  function toggleEra(tag: EraTag) {
    setEraFilters(prev => { const n = new Set(prev); n.has(tag) ? n.delete(tag) : n.add(tag); return n })
  }
  function toggleFeel(tag: FeelTag) {
    setFeelFilters(prev => { const n = new Set(prev); n.has(tag) ? n.delete(tag) : n.add(tag); return n })
  }

  const hasFilters = query || formFilter !== 'all' || eraFilters.size > 0 || feelFilters.size > 0 || tempoFilter !== 'all'

  function clearFilters() {
    setQuery(''); setFormFilter('all'); setEraFilters(new Set()); setFeelFilters(new Set()); setTempoFilter('all')
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
        <p className="text-xs text-slate-400 mb-4">{filtered.length} of {standards.length} standards</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(s => <StandardCard key={s.id} standard={s} />)}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-base mb-1">No standards found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
