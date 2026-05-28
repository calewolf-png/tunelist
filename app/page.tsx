import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/collection')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight text-slate-900 mb-3">Tunelist</h1>
        <p className="text-slate-500 text-lg">Your personal jazz standards collection.</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Get started
        </Link>
        <Link
          href="/standards"
          className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Browse standards
        </Link>
      </div>
    </div>
  )
}
