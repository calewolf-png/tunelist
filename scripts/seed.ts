import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { standards } from './seed-data'
import type { Database } from '../types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function seed() {
  console.log(`Seeding ${standards.length} standards...`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('standards').insert(standards as any[])

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`Done! ${standards.length} standards inserted.`)
}

seed()
