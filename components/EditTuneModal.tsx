'use client'

import { useState, useTransition } from 'react'
import { updatePersonalStandard, forkToPersonalVariant } from '@/app/actions/collection'
import type { Standard, TempoFeel, StandardForm, EraTag, FeelTag, KeySignature } from '@/types/database'
import { KEY_OPTIONS, KEY_SET } from '@/lib/key-options'

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

const ERA_LABELS: Record<string, string> = Object.fromEntries(ERA_OPTIONS.map(o => [o.value, o.label]))
const FEEL_LABELS: Record<string, string> = Object.fromEntries(FEEL_OPTIONS.map(o => [o.value, o.label]))

interface FormValues {
  title: string
  composer: string
  year_composed: string
  original_key: KeySignature | ''
  time_signature: string
  tempo_feel: TempoFeel | ''
  form_type: StandardForm | ''
  era_tags: EraTag[]
  feel_tags: FeelTag[]
  factoid: string
}

function toForm(s: Standard): FormValues {
  return {
    title: s.title,
    composer: s.composer.join(', '),
    year_composed: s.year_composed != null ? String(s.year_composed) : '',
    original_key: s.original_key != null && KEY_SET.has(s.original_key) ? s.original_key : '',
    time_signature: s.time_signature,
    tempo_feel: s.tempo_feel ?? '',
    form_type: s.form ?? '',
    era_tags: s.era_tags,
    feel_tags: s.feel_tags,
    factoid: s.factoid ?? '',
  }
}

function diffValues(initial: FormValues, current: FormValues): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  if (current.title !== initial.title) diff.title = current.title
  if (current.composer !== initial.composer) {
    diff.composer = current.composer.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
  }
  if (current.year_composed !== initial.year_composed) {
    diff.year_composed = current.year_composed ? parseInt(current.year_composed, 10) : null
  }
  if (current.original_key !== initial.original_key) diff.original_key = current.original_key || null

  if (current.time_signature !== initial.time_signature) diff.time_signature = current.time_signature
  if (current.tempo_feel !== initial.tempo_feel) diff.tempo_feel = current.tempo_feel || null
  if (current.form_type !== initial.form_type) diff.form = current.form_type || null
  if (JSON.stringify(current.era_tags) !== JSON.stringify(initial.era_tags)) diff.era_tags = current.era_tags
  if (JSON.stringify(current.feel_tags) !== JSON.stringify(initial.feel_tags)) diff.feel_tags = current.feel_tags
  if (current.factoid !== initial.factoid) diff.factoid = current.factoid || null
  return diff
}

function formatDiffLabel(key: string, val: unknown): string {
  if (Array.isArray(val)) {
    return (val as string[]).map(v => ERA_LABELS[v] ?? FEEL_LABELS[v] ?? v).join(', ') || 'none'
  }
  if (val === null || val === '') return 'none'
  return String(val)
}

const DIFF_KEY_LABELS: Record<string, string> = {
  title: 'Title', composer: 'Composer', year_composed: 'Year', original_key: 'Key',
  time_signature: 'Time', tempo_feel: 'Tempo', form: 'Form', era_tags: 'Era', feel_tags: 'Feel', factoid: 'Factoid',
}

interface Props {
  standard: Standard
  isOfficial: boolean
  onClose: () => void
  onSaved: (newStandardId?: string) => void
}

type Step = 'form' | 'warn-fork' | 'forking'

const inputCls = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors disabled:opacity-50'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-500 mb-1">{children}</label>
}

export default function EditTuneModal({ standard, isOfficial, onClose, onSaved }: Props) {
  const initial = toForm(standard)
  const [form, setForm] = useState<FormValues>(initial)
  const [step, setStep] = useState<Step>('form')
  const [diff, setDiff] = useState<Record<string, unknown>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleEraTag(tag: EraTag) {
    setForm(f => ({
      ...f,
      era_tags: f.era_tags.includes(tag) ? f.era_tags.filter(t => t !== tag) : [...f.era_tags, tag],
    }))
  }

  function toggleFeelTag(tag: FeelTag) {
    setForm(f => ({
      ...f,
      feel_tags: f.feel_tags.includes(tag) ? f.feel_tags.filter(t => t !== tag) : [...f.feel_tags, tag],
    }))
  }

  function handleSave() {
    setError(null)
    if (isOfficial) {
      const d = diffValues(initial, form)
      if (Object.keys(d).length === 0) { onClose(); return }
      setDiff(d)
      setStep('warn-fork')
      return
    }

    // Personal tune — update directly
    const composerArr = form.composer.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
    const fields = {
      title: form.title.trim(),
      composer: composerArr,
      year_composed: form.year_composed ? parseInt(form.year_composed, 10) : null,
      original_key: form.original_key || null,
      time_signature: form.time_signature.trim() || '4/4',
      tempo_feel: form.tempo_feel || null,
      form: form.form_type || null,
      era_tags: form.era_tags,
      feel_tags: form.feel_tags,
      factoid: form.factoid.trim() || null,
    }

    startTransition(async () => {
      const result = await updatePersonalStandard(standard.id, fields)
      if (result.error) { setError(result.error); return }
      onSaved()
      onClose()
    })
  }

  function handleFork() {
    setStep('forking')
    startTransition(async () => {
      const result = await forkToPersonalVariant(standard.id, diff)
      if ('error' in result) { setError(result.error); setStep('warn-fork'); return }
      onSaved(result.standardId)
      onClose()
    })
  }

  const isLoading = isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !isLoading) onClose() }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl mx-4 shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {step === 'form' ? 'Edit tune' : step === 'warn-fork' ? 'Save your version' : 'Saving…'}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none disabled:opacity-30"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* forking */}
          {step === 'forking' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm text-slate-500">Saving your version…</p>
            </div>
          )}

          {/* warn-fork */}
          {step === 'warn-fork' && (
            <div className="space-y-4">
              <div className="rounded-xl px-4 py-3 border" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-sm font-medium mb-1" style={{ color: '#9a3412' }}>This will create your personal version</p>
                <p className="text-xs leading-relaxed" style={{ color: '#c2410c' }}>
                  The official catalog entry won't change. You'll get your own copy with your edits, and can propose the changes for review afterward if you'd like them reflected in the official catalog.
                </p>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-3 py-2">Field</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-3 py-2">Your version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(diff).map(([key, val]) => (
                      <tr key={key} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap">{DIFF_KEY_LABELS[key] ?? key}</td>
                        <td className="px-3 py-2 text-slate-900">{formatDiffLabel(key, val)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleFork}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving…' : 'Save my version'}
                </button>
                <button
                  onClick={() => setStep('form')}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* form */}
          {step === 'form' && (
            <div className="space-y-4">
              {isOfficial && (
                <p className="text-xs bg-slate-50 rounded-lg px-3 py-2" style={{ color: '#92400e' }}>
                  Saving changes to an official tune will create your own personal version. You can propose them for the official catalog afterward.
                </p>
              )}

              <div>
                <Label>Title <span className="text-red-400">*</span></Label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  disabled={isLoading}
                  className={inputCls}
                  placeholder="Tune title"
                />
              </div>

              <div>
                <Label>Composer / Artist</Label>
                <input
                  value={form.composer}
                  onChange={e => setForm(f => ({ ...f, composer: e.target.value }))}
                  disabled={isLoading}
                  className={inputCls}
                  placeholder="e.g. Miles Davis, Bill Evans"
                />
                <p className="text-xs text-slate-400 mt-1">Separate multiple with commas</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Year composed</Label>
                  <input
                    type="number"
                    value={form.year_composed}
                    onChange={e => setForm(f => ({ ...f, year_composed: e.target.value }))}
                    disabled={isLoading}
                    className={inputCls}
                    placeholder="e.g. 1941"
                    min={1800}
                    max={new Date().getFullYear()}
                  />
                </div>
                <div>
                  <Label>Original key</Label>
                  <select
                    value={form.original_key}
                    onChange={e => setForm(f => ({ ...f, original_key: e.target.value as KeySignature | '' }))}
                    disabled={isLoading}
                    className={inputCls}
                  >
                    <option value="">Select…</option>
                    {KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Time signature</Label>
                  <input
                    value={form.time_signature}
                    onChange={e => setForm(f => ({ ...f, time_signature: e.target.value }))}
                    disabled={isLoading}
                    className={inputCls}
                    placeholder="4/4"
                  />
                </div>
                <div>
                  <Label>Tempo feel</Label>
                  <select
                    value={form.tempo_feel}
                    onChange={e => setForm(f => ({ ...f, tempo_feel: e.target.value as TempoFeel | '' }))}
                    disabled={isLoading}
                    className={inputCls}
                  >
                    <option value="">Select…</option>
                    <option value="ballad">Ballad</option>
                    <option value="medium">Medium</option>
                    <option value="up-tempo">Up-Tempo</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Form</Label>
                <select
                  value={form.form_type}
                  onChange={e => setForm(f => ({ ...f, form_type: e.target.value as StandardForm | '' }))}
                  disabled={isLoading}
                  className={inputCls}
                >
                  <option value="">None / Standard</option>
                  <option value="blues">Blues</option>
                  <option value="rhythm-changes">Rhythm Changes</option>
                </select>
              </div>

              <div>
                <Label>Era</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ERA_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleEraTag(value)}
                      disabled={isLoading}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.era_tags.includes(value)
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Feel</Label>
                <div className="flex flex-wrap gap-1.5">
                  {FEEL_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleFeelTag(value)}
                      disabled={isLoading}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.feel_tags.includes(value)
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Did you know…</Label>
                <textarea
                  value={form.factoid}
                  onChange={e => setForm(f => ({ ...f, factoid: e.target.value }))}
                  disabled={isLoading}
                  rows={3}
                  className={inputCls}
                  placeholder="A fun historical fact about this tune (optional)"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim() || isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
