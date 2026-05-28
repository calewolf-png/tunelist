'use client'

import { useState } from 'react'

export default function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-normal whitespace-nowrap pointer-events-none z-20 shadow-lg">
          {text}
        </span>
      )}
    </span>
  )
}
