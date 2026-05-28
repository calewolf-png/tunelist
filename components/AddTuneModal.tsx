'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { createPersonalStandard, type PersonalStandardMeta } from '@/app/actions/collection'
import type { TuneLookupResult } from '@/app/api/tunes/lookup/route'
import type { SpotifyTrackMeta } from '@/lib/spotify'
import type { TempoFeel, StandardForm, EraTag, FeelTag, KeySignature } from '@/types/database'
import { KEY_OPTIONS, normalizeKey } from '@/lib/key-options'

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

const CONFIDENCE_THRESHOLD = 0.7

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

type ModalStep =
  | { step: 'ask' }
  | { step: 'ai-loading' }
  | { step: 'ai-confirm'; result: TuneLookupResult }
  | { step: 'ai-error' }
  | { step: 'form'; prefill: Partial<FormValues>; confidence: TuneLookupResult['field_confidence'] | null }
  | { step: 'submitting' }

interface Props {
  initialTitle: string
  initialComposer: string
  track: SpotifyTrackMeta | null
  onClose: () => void
  onCreated: (standardId: string) => void
}

function populatedFromAI(result: TuneLookupResult): Partial<FormValues> {
  const c = result.field_confidence
  const ok = (key: keyof typeof c) => c[key] >= CONFIDENCE_THRESHOLD

  return {
    title: result.title,
    composer: ok('composer') ? result.composer.join(', ') : undefined,
    year_composed: ok('year_composed') && result.year_composed != null ? String(result.year_composed) : undefined,
    original_key: ok('original_key') ? normalizeKey(result.original_key) : undefined,
    time_signature: ok('time_signature') ? result.time_signature : undefined,
    tempo_feel: ok('tempo_feel') ? (result.tempo_feel ?? '') : undefined,
    form_type: ok('form') ? (result.form ?? '') : undefined,
    era_tags: ok('era_tags') ? result.era_tags : undefined,
    feel_tags: ok('feel_tags') ? result.feel_tags : undefined,
    factoid: ok('factoid') ? (result.factoid ?? '') : undefined,
  }
}

function blankForm(title: string, composer: string): FormValues {
  return {
    title,
    composer,
    year_composed: '',
    original_key: '',
    time_signature: '4/4',
    tempo_feel: '',
    form_type: '',
    era_tags: [],
    feel_tags: [],
    factoid: '',
  }
}

function ConfidenceBadge() {
  return (
    <span className="ml-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
      fill me in
    </span>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-500 mb-1">{children}</label>
}

const inputCls = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors disabled:opacity-50'
const selectCls = inputCls

export default function AddTuneModal({ initialTitle, initialComposer, track, onClose, onCreated }: Props) {
  const [modalStep, setModalStep] = useState<ModalStep>({ step: 'ask' })
  const [form, setForm] = useState<FormValues>(blankForm(initialTitle, initialComposer))
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const titleRef = useRef<HTMLInputElement>(null)

  const isSubmitting = modalStep.step === 'submitting' || isPending

  useEffect(() => {
    if (modalStep.step === 'form') {
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [modalStep.step])

  async function handleAiLookup() {
    setModalStep({ step: 'ai-loading' })
    try {
      const res = await fetch('/api/tunes/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: initialTitle, composer: initialComposer || undefined }),
      })
      if (!res.ok) throw new Error('lookup failed')
      const result: TuneLookupResult = await res.json()

      const avgConfidence = Object.values(result.field_confidence).reduce((a, b) => a + b, 0) / 10
      if (!result.found || avgConfidence < 0.6) {
        setForm(blankForm(initialTitle, initialComposer))
        setModalStep({ step: 'form', prefill: {}, confidence: null })
        return
      }
      setModalStep({ step: 'ai-confirm', result })
    } catch {
      setModalStep({ step: 'ai-error' })
    }
  }

  function handleConfirmYes(result: TuneLookupResult) {
    const prefill = populatedFromAI(result)
    setForm({ ...blankForm(initialTitle, initialComposer), ...prefill })
    setModalStep({ step: 'form', prefill, confidence: result.field_confidence })
  }

  function handleConfirmNo() {
    setForm(blankForm(initialTitle, initialComposer))
    setModalStep({ step: 'form', prefill: {}, confidence: null })
  }

  function goToBlankForm() {
    setForm(blankForm(initialTitle, initialComposer))
    setModalStep({ step: 'form', prefill: {}, confidence: null })
  }

  function handleSubmit() {
    if (!form.title.trim()) return
    setSubmitError(null)
    setModalStep({ step: 'submitting' })

    const composerArr = form.composer
      .split(/[,;]+/)
      .map(s => s.trim())
      .filter(Boolean)

    const meta: PersonalStandardMeta = {
      year_composed: form.year_composed ? parseInt(form.year_composed, 10) : null,
      original_key: form.original_key || null,
      time_signature: form.time_signature.trim() || undefined,
      tempo_feel: form.tempo_feel || null,
      form: form.form_type || null,
      era_tags: form.era_tags,
      feel_tags: form.feel_tags,
      factoid: form.factoid.trim() || null,
    }

    startTransition(async () => {
      const result = await createPersonalStandard(form.title.trim(), composerArr, track, meta)
      if (result.error) {
        setSubmitError(result.error)
        setModalStep({ step: 'form', prefill: {}, confidence: null })
        return
      }
      onCreated(result.standardId!)
    })
  }

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

  const confidence = modalStep.step === 'form' ? modalStep.confidence : null
  const lowConf = (key: keyof TuneLookupResult['field_confidence']) =>
    confidence !== null && confidence[key] < CONFIDENCE_THRESHOLD

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !isSubmitting) onClose() }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md mx-4 shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Add a personal tune</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none disabled:opacity-30"
          >
            ×
          </button>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step: ask */}
          {modalStep.step === 'ask' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Is <span className="font-medium text-slate-900">"{initialTitle}"</span> a well-known jazz standard?
              </p>
              <p className="text-xs text-slate-400">
                If yes, we'll look it up and pre-fill the details for you.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleAiLookup}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Yes, look it up
                </button>
                <button
                  onClick={goToBlankForm}
                  className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  No, I'll fill in the details myself
                </button>
              </div>
            </div>
          )}

          {/* Step: ai-loading */}
          {modalStep.step === 'ai-loading' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm text-slate-500">Looking up "{initialTitle}"…</p>
            </div>
          )}

          {/* Step: ai-error */}
          {modalStep.step === 'ai-error' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Couldn't look that up right now. Fill in what you know.</p>
              <button
                onClick={goToBlankForm}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step: ai-confirm */}
          {modalStep.step === 'ai-confirm' && (() => {
            const r = modalStep.result
            const c = r.field_confidence
            const summaryParts = [
              c.composer >= CONFIDENCE_THRESHOLD ? r.composer.join(', ') : null,
              c.year_composed >= CONFIDENCE_THRESHOLD && r.year_composed ? String(r.year_composed) : null,
              c.tempo_feel >= CONFIDENCE_THRESHOLD && r.tempo_feel ? r.tempo_feel.replace('-', ' ') : null,
              c.era_tags >= CONFIDENCE_THRESHOLD && r.era_tags[0] ? r.era_tags[0].replace(/-/g, ' ') : null,
            ].filter(Boolean)

            return (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Is this what you meant?</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-base font-semibold text-slate-900">{r.title}</p>
                  {summaryParts.length > 0 && (
                    <p className="text-sm text-slate-500 mt-0.5 capitalize">{summaryParts.join(' · ')}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleConfirmYes(r)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Yes, that's it
                  </button>
                  <button
                    onClick={handleConfirmNo}
                    className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Not what I meant
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Step: form / submitting */}
          {(modalStep.step === 'form' || modalStep.step === 'submitting') && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label>Title <span className="text-red-400">*</span></Label>
                <input
                  ref={titleRef}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  disabled={isSubmitting}
                  className={inputCls}
                  placeholder="Tune title"
                />
              </div>

              {/* Composer */}
              <div>
                <Label>
                  Composer / Artist
                  {lowConf('composer') && <ConfidenceBadge />}
                </Label>
                <input
                  value={form.composer}
                  onChange={e => setForm(f => ({ ...f, composer: e.target.value }))}
                  disabled={isSubmitting}
                  className={inputCls}
                  placeholder="e.g. Miles Davis, Bill Evans"
                />
                <p className="text-xs text-slate-400 mt-1">Separate multiple composers with commas</p>
              </div>

              {/* Year + Key row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    Year composed
                    {lowConf('year_composed') && <ConfidenceBadge />}
                  </Label>
                  <input
                    type="number"
                    value={form.year_composed}
                    onChange={e => setForm(f => ({ ...f, year_composed: e.target.value }))}
                    disabled={isSubmitting}
                    className={inputCls}
                    placeholder="e.g. 1941"
                    min={1800}
                    max={new Date().getFullYear()}
                  />
                </div>
                <div>
                  <Label>
                    Original key
                    {lowConf('original_key') && <ConfidenceBadge />}
                  </Label>
                  <select
                    value={form.original_key}
                    onChange={e => setForm(f => ({ ...f, original_key: e.target.value as KeySignature | '' }))}
                    disabled={isSubmitting}
                    className={selectCls}
                  >
                    <option value="">Select…</option>
                    {KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              {/* Time sig + Tempo row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    Time signature
                    {lowConf('time_signature') && <ConfidenceBadge />}
                  </Label>
                  <input
                    value={form.time_signature}
                    onChange={e => setForm(f => ({ ...f, time_signature: e.target.value }))}
                    disabled={isSubmitting}
                    className={inputCls}
                    placeholder="4/4"
                  />
                </div>
                <div>
                  <Label>
                    Tempo feel
                    {lowConf('tempo_feel') && <ConfidenceBadge />}
                  </Label>
                  <select
                    value={form.tempo_feel}
                    onChange={e => setForm(f => ({ ...f, tempo_feel: e.target.value as TempoFeel | '' }))}
                    disabled={isSubmitting}
                    className={selectCls}
                  >
                    <option value="">Select…</option>
                    <option value="ballad">Ballad</option>
                    <option value="medium">Medium</option>
                    <option value="up-tempo">Up-Tempo</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
              </div>

              {/* Form */}
              <div>
                <Label>
                  Form
                  {lowConf('form' as keyof TuneLookupResult['field_confidence']) && <ConfidenceBadge />}
                </Label>
                <select
                  value={form.form_type}
                  onChange={e => setForm(f => ({ ...f, form_type: e.target.value as StandardForm | '' }))}
                  disabled={isSubmitting}
                  className={selectCls}
                >
                  <option value="">None / Standard</option>
                  <option value="blues">Blues</option>
                  <option value="rhythm-changes">Rhythm Changes</option>
                </select>
              </div>

              {/* Era tags */}
              <div>
                <Label>
                  Era
                  {lowConf('era_tags') && <ConfidenceBadge />}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {ERA_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleEraTag(value)}
                      disabled={isSubmitting}
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

              {/* Feel tags */}
              <div>
                <Label>
                  Feel
                  {lowConf('feel_tags') && <ConfidenceBadge />}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {FEEL_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleFeelTag(value)}
                      disabled={isSubmitting}
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

              {/* Factoid */}
              <div>
                <Label>
                  Did you know…
                  {lowConf('factoid') && <ConfidenceBadge />}
                </Label>
                <textarea
                  value={form.factoid}
                  onChange={e => setForm(f => ({ ...f, factoid: e.target.value }))}
                  disabled={isSubmitting}
                  rows={3}
                  className={inputCls}
                  placeholder="A fun historical fact about this tune (optional)"
                />
              </div>

              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSubmit}
                  disabled={!form.title.trim() || isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding…' : 'Add to my collection'}
                </button>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
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
