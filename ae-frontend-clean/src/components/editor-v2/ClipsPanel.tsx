"use client"

import React from 'react'
import ClipRow from '@/components/editor-v2/ClipRow'

function toStartSec(c:any){
  return Math.round(c?.startTime ?? c?.start ?? c?.startSec ?? 0)
}
function toDurSec(c:any){
  return Math.round(c?.duration ?? c?.durationSec ?? (c?.end && c?.start ? Math.max(0, c.end - c.start) : 0) ?? 0)
}
function toScorePct(c:any){
  const val = c?.score ?? c?.confidence ?? c?.quality ?? c?.scorePct ?? 0
  if (typeof val === 'number' && val <= 1) return Math.round(val * 100)
  return Math.round(val || 0)
}

export default function ClipsPanel({ clips }:{ clips:any[] }){
  return (
    <div className="flex flex-col gap-3">
      <div className="px-2 py-2">
        <div className="text-sm font-semibold">Generated Clips</div>
        <div className="text-xs text-white/60">Select a clip to preview or add to timeline</div>
      </div>

      <div className="px-2 pb-3 overflow-auto">
        {(!clips || clips.length === 0) ? (
          <div className="rounded-xl p-4 bg-[rgba(255,255,255,0.02)] border border-white/6 text-sm text-white/60">No clips available yet — upload a video to generate highlights.</div>
        ) : (
          <div className="space-y-2">
            {clips.map((c:any, idx:number) => (
              <div key={c.id ?? idx} className="hover:shadow-lg hover:translate-y-0.5 transition-transform">
                <ClipRow clip={{ id: c.id ?? idx, startSec: Math.round(c.start ?? c.startTime ?? 0), durationSec: Math.round(c.duration ?? c.durationSec ?? 0), scorePct: (c.score ? Math.round((c.score<=1?c.score*100:c.score)) : (c.scorePct||0)) }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
