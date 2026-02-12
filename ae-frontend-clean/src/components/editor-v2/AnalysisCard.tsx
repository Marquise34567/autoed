"use client"

import React from 'react'

export default function AnalysisCard({ status, overallProgress, detectedDurationSec, overallEtaSec } : { status: string; overallProgress: number; detectedDurationSec: number | null; overallEtaSec: number }){
  const pct = Math.round((overallProgress || 0) * 100)
  const phaseRaw = (status || '').toString().toUpperCase()
  const display = phaseRaw === 'ANALYZING' ? 'Analyzing video...' : phaseRaw === 'UPLOADING' ? 'Uploading...' : phaseRaw === 'NORMALIZING' ? 'Normalizing...' : phaseRaw === 'HOOK_SELECTING' ? 'Selecting hook…' : phaseRaw === 'SELECTING' || phaseRaw === 'CUT_SELECTING' ? 'Selecting cuts…' : phaseRaw === 'PACING' ? 'Adjusting pacing…' : phaseRaw === 'RENDERING' ? 'Rendering...' : phaseRaw === 'DONE' ? 'Complete' : phaseRaw === 'ERROR' ? 'Failed' : (status || '—')
  const formatEta = (s: number) => {
    if (!s) return '--'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}m ${sec}s`
  }

  return (
    <div className="rounded-2xl p-4 sm:p-6 bg-white/5 border border-white/10 backdrop-blur shadow-lg">
      <div className="flex flex-col items-center text-center">
        <div className="mb-2 text-sm text-white/70">Video Analysis</div>
        <div className="mb-3 text-white/80 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[rgba(255,255,255,0.02)] flex items-center justify-center text-2xl">📹</div>
          <div className="text-base font-medium">{display}</div>
        </div>

        <div className="w-full">
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className="h-3 bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-3 text-sm text-white/60">{detectedDurationSec ? `${Math.floor(detectedDurationSec/60)}m ${detectedDurationSec%60}s detected` : '—'}</div>
        <div className="mt-1 text-xs text-white/50">ETA: {formatEta(overallEtaSec)}</div>
      </div>
    </div>
  )
}
