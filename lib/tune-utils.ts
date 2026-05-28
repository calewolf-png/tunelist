import type { EraTag, FeelTag, KeySignature } from '@/types/database'

interface TuneFields {
  title: string
  composer: string[]
  year_composed: number | null
  original_key: KeySignature | null
  era_tags: EraTag[]
  feel_tags: FeelTag[]
}

export function checkWellFormedness(s: TuneFields): { isWellFormed: boolean; missingFields: string[] } {
  const missing: string[] = []

  if (!s.title.trim()) missing.push('Title')
  if (s.composer.length === 0) missing.push('Composer')
  if (!s.year_composed) missing.push('Year composed')
  if (!s.original_key && s.era_tags.length === 0 && s.feel_tags.length === 0) {
    missing.push('Original key or at least one era/feel tag')
  }

  return { isWellFormed: missing.length === 0, missingFields: missing }
}
