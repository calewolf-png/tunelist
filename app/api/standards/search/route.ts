import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return Response.json([])

  const supabase = await createClient()
  const { data } = await supabase
    .from('standards')
    .select('id, title, composer, form')
    .eq('status', 'official')
    .ilike('title', `%${q}%`)
    .limit(8)

  return Response.json(data ?? [])
}
