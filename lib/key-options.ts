import type { KeySignature } from '@/types/database'

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export const KEY_OPTIONS: KeySignature[] = ROOTS.flatMap(r => [
  `${r} major` as KeySignature,
  `${r} minor` as KeySignature,
])

export const KEY_SET = new Set<string>(KEY_OPTIONS)

export function normalizeKey(raw: string | null | undefined): KeySignature | '' {
  if (!raw) return ''
  if (KEY_SET.has(raw)) return raw as KeySignature
  // bare root note → assume major
  const asMajor = `${raw} major`
  if (KEY_SET.has(asMajor)) return asMajor as KeySignature
  return ''
}
