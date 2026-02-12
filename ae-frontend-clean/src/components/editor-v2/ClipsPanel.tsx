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
  const list = Array.isArray(clips) ? clips.slice(0,3) : []
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-medium text-white/70">Generated Clips</div>
      <div className="flex flex-col gap-3">
        {list.map((c, i) => (
          <ClipRow key={i} clip={{ id: `${i+1}`, startSec: toStartSec(c), durationSec: toDurSec(c), scorePct: toScorePct(c) }} />
        ))}
      </div>
    </div>
  )
}
