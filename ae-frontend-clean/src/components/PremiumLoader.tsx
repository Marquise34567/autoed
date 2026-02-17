"use client"

import React from 'react'

export default function PremiumLoader({ status, progress }: { status?: string; progress?: number }) {
  const active = !!status && status !== 'idle' && status !== 'done' && status !== 'error'
  const pct = Math.max(0, Math.min(100, Math.round((progress ?? 0) * 100)))
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className={`premium-loader ${active ? 'active' : 'inactive'}`} aria-hidden>
        <div className="premium-ring" />
        <div className="premium-center">{active ? <div className="text-white font-semibold">Processing</div> : <div className="text-white/60">Idle</div>}</div>
      </div>
      <div className="w-full max-w-xs">
        <div className="text-xs text-white/60 text-center mb-1">{active ? `${pct}%` : ''}</div>
        <div className="w-full bg-white/6 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-linear-to-r from-[#7c3aed] to-[#06b6d4] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
