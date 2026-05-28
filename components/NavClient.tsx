'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { signOut } from '@/app/actions/auth'

const baseLinks = [
  { href: '/collection', label: 'My Collection' },
  { href: '/standards', label: 'All Tunes' },
]

interface Props {
  username: string | null
  musicianMode: boolean
}

function UserMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative ml-3 pl-3 border-l border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 rounded-md text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
      >
        {username}
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Settings
          </Link>
          <div className="border-t border-slate-100 my-1" />
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function NavClient({ username, musicianMode }: Props) {
  const pathname = usePathname()
  const links = musicianMode
    ? [...baseLinks, { href: '/jam', label: 'Jam Mode' }]
    : baseLinks

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-slate-900 tracking-tight">
          Tunelist
        </Link>
        <nav className="flex items-center gap-0.5">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-slate-100 text-slate-900 font-medium'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {label}
            </Link>
          ))}
          {username ? (
            <UserMenu username={username} />
          ) : (
            <Link
              href="/login"
              className="ml-3 px-3 py-1.5 rounded-md text-sm bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
