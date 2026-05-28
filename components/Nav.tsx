import { createClient } from '@/lib/supabase/server'
import NavClient from './NavClient'

export default async function Nav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let username: string | null = null
  let musicianMode = false
  if (user) {
    const { data } = await (supabase.from('profiles') as any)
      .select('username, musician_mode')
      .eq('id', user.id)
      .single()
    username = (data as { username: string } | null)?.username ?? null
    musicianMode = (data as { musician_mode: boolean } | null)?.musician_mode ?? false
  }

  return <NavClient username={username} musicianMode={musicianMode} />
}
