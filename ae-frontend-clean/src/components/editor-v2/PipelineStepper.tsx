"use client"

import React, { useEffect, useRef, useState } from 'react'

const steps = [
  { key: 'hook', label: 'Adding Hooks', subtitle: 'Detect moments' },
  { key: 'cutting', label: 'Cutting', subtitle: 'Extract highlights' },
  { key: 'pacing', label: 'Pacing', subtitle: 'Optimize flow' },
  { key: 'rendering', label: 'Rendering', subtitle: 'Finalizing' },
  { key: 'done', label: 'Complete', subtitle: 'Ready to download' },
]

export default function PipelineStepper({ current }:{ current?: string }){
  const cur = (current || '').toLowerCase()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [highlightKey, setHighlightKey] = useState<string | null>(null)
  const prevRef = useRef<string | null>(null)

  useEffect(() => {
    try {
      const key = cur
      if (!key) return
      const container = containerRef.current
      if (!container) return
      const el = container.querySelector(`[data-step="${key}"]`) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }

      // highlight 'done' transiently when we transition into it
      if (prevRef.current && prevRef.current !== cur && cur === 'done') {
        setHighlightKey('done')
        const t = setTimeout(() => setHighlightKey(null), 3000)
        return () => clearTimeout(t)
      }
      prevRef.current = cur
    } catch (_) {}
  }, [cur])

  return (
    <div ref={containerRef} className="w-full flex items-center gap-6 overflow-x-auto hide-scrollbar" style={{ paddingBottom: 8 }}>
      {steps.map((s, i) => {
        const active = s.key === cur
        const curIndex = steps.findIndex(x => x.key === cur)
        const done = curIndex > i || (s.key === 'done' && cur === 'done')
        const isHighlighted = highlightKey === s.key
        return (
          <div key={s.key} data-step={s.key} className="flex items-center gap-4">
            <div className={`flex flex-col items-center gap-2`}>
              <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center text-sm font-semibold transition-all transform ${active ? 'bg-linear-to-br from-[#7c3aed] to-[#06b6d4] shadow-[0_12px_30px_rgba(124,58,237,0.18)] scale-105 text-white ring-2 ring-[rgba(124,58,237,0.08)]' : done ? 'bg-white/6 text-white/90' : 'bg-[rgba(255,255,255,0.02)] text-white/50 border border-white/6'}`}>
                {done ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L9 14.414l-3.707-3.707a1 1 0 10-1.414 1.414l4.414 4.414a1 1 0 001.414 0l8.414-8.414a1 1 0 00-1.414-1.414z" clipRule="evenodd"/></svg>
                ) : (
                  <div className="text-sm">{i+1}</div>
                )}
              </div>
              <div className="text-left max-w-30">
                <div className={`text-sm truncate ${active ? 'text-white' : 'text-white/70'} font-semibold`}>{s.label}</div>
                <div className="text-xs text-white/50 truncate hidden sm:block">{s.subtitle}</div>
              </div>
            </div>
            {i < steps.length-1 && <div className={`h-1 flex-1 ${done ? 'bg-linear-to-r from-emerald-400 to-cyan-400' : 'bg-white/6'} mt-6 rounded-full`} />}
          </div>
        )
      })}
    </div>
  )
}
