'use client'

import { useState, useTransition } from 'react'
import { setMusicianMode } from '@/app/actions/settings'

function Toggle({ label, description, enabled: initial, onChange }: {
  label: string; description: string; enabled: boolean
  onChange: (val: boolean) => Promise<{ error?: string }>
}) {
  const [enabled, setEnabled] = useState(initial)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      const result = await onChange(next)
      if (result.error) setEnabled(!next)
    })
  }

  return (
    <div className="flex items-center justify-between py-4">
      <div className="pr-8">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 ${
          enabled ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  )
}

export default function SettingsClient({ musicianMode }: { musicianMode: boolean }) {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900 mb-8">Settings</h1>
      <div className="bg-white border border-slate-200 rounded-2xl px-5 divide-y divide-slate-100 shadow-sm">
        <Toggle
          label="Musician mode"
          description="Track whether you know, are learning, or want to learn each standard."
          enabled={musicianMode}
          onChange={setMusicianMode}
        />
      </div>
    </div>
  )
}
