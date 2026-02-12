"use client"

import React from 'react'

function formatDuration(sec:number|undefined|null){
  if (!sec && sec !== 0) return '--'
  const s = Math.max(0, Math.round(sec || 0))
  if (s < 60) return `${s}s detected`
  const m = Math.floor(s/60)
  const r = s%60
  return `${m}m ${r}s detected`
}

export default function VideoAnalysisPanel({ status, overallProgress, detectedDurationSec }:{ status:any; overallProgress:number; detectedDurationSec:number|null }){
  const pct = Math.max(0, Math.min(1, overallProgress || 0))
  const statusText = (status=== 'analyzing' || status=== 'uploading') ? 'Analyzing video…' : (status ? String(status).toString() : 'Idle')
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-medium text-white/70">Video Analysis</div>

      <div className="rounded-2xl p-6 bg-[rgba(255,255,255,0.02)] border border-white/6 shadow-sm">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="h-14 w-14 rounded-lg bg-[#0b1220] flex items-center justify-center text-2xl text-white/70">
            📷
          </div>

          <div className="text-sm font-medium text-white">{statusText}</div>

          <div className="w-full mt-2">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-2 bg-linear-to-r from-blue-400 to-purple-500 transition-all" style={{ width: `${Math.round(pct*100)}%` }} />
            </div>
            <div className="text-xs text-white/60 mt-2">{formatDuration(detectedDurationSec)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
