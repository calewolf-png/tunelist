import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await (supabase.from('profiles') as any)
    .select('musician_mode')
    .eq('id', user.id)
    .single()

  const musicianMode = (data as { musician_mode: boolean } | null)?.musician_mode ?? false

  return <SettingsClient musicianMode={musicianMode} />
}
