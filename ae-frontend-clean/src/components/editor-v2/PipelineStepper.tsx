"use client"

import React, { useEffect, useRef, useState } from 'react'

const steps = [
  { key: 'uploading', label: 'Uploading' },
  { key: 'normalizing', label: 'Normalize' },
  { key: 'analyzing', label: 'Analyze' },
  { key: 'hook_selecting', label: 'Hook' },
  { key: 'cut_selecting', label: 'Cuts' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'rendering', label: 'Render' },
  { key: 'done', label: 'Done' },
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
    <div ref={containerRef} className="w-full flex items-center gap-3 overflow-x-auto hide-scrollbar" style={{ paddingBottom: 4 }}>
      {steps.map((s, i) => {
        const active = s.key === cur
        const done = steps.findIndex(x=>x.key===cur) > i || (s.key === 'done' && cur === 'done')
        const isHighlighted = highlightKey === s.key
        return (
          <div key={s.key} data-step={s.key} className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${active ? 'bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg' : 'bg-[rgba(255,255,255,0.02)] border border-white/6'} ${isHighlighted ? 'ring-2 ring-emerald-400' : ''}`}>
              {done ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L9 14.414l-3.707-3.707a1 1 0 10-1.414 1.414l4.414 4.414a1 1 0 001.414 0l8.414-8.414a1 1 0 00-1.414-1.414z" clipRule="evenodd"/></svg> : <div className="text-xs text-white/80">{i+1}</div>}
            </div>
            <div className="text-xs text-white/70 whitespace-nowrap">{s.label}</div>
            {i < steps.length-1 && <div className="w-6 h-[1px] bg-white/6" />}
          </div>
        )
      })}
    </div>
  )
}
