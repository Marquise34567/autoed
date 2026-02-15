"use client"

import React, { useEffect, useState } from 'react'
// PipelineStepper removed
import PremiumLoader from '@/components/PremiumLoader'

export default function HomeDemoEditor() {
  const [current, setCurrent] = useState<string>('queued')
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    // Simulate pipeline progression on mount
    let idx = 0
    const seq = ['hook', 'cutting', 'pacing', 'rendering', 'done']
    const t = setInterval(() => {
      idx = Math.min(seq.length - 1, idx + 1)
      setCurrent(seq[idx])
      setProgress(Math.min(1, progress + 0.22))
      if (idx === seq.length - 1) clearInterval(t)
    }, 1800)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 sm:p-6 backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
        <div className="text-base sm:text-lg font-semibold">Auto-Editor</div>
        <div className="flex gap-1.5 sm:gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/50 hidden sm:inline">Processing</span>
        </div>
      </div>

      {/* pipeline UI removed for demo */}

      <div className="mt-4 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 text-center">
        <PremiumLoader status={current} progress={progress} />
        <p className="text-xs text-white/40 mt-2">2m 45s detected</p>
      </div>
    </div>
  )
}
