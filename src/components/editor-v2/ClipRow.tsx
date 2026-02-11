"use client"

import React from 'react'

export default function ClipRow({ clip }:{ clip: { id: string; startSec:number; durationSec:number; scorePct:number } }){
  const pad = (n:number)=> String(Math.floor(n)).padStart(2,'0')
  const mins = Math.floor(clip.startSec/60)
  const secs = clip.startSec%60
  return (
    <div className="rounded-lg bg-[rgba(10,12,16,0.45)] border border-white/6 p-3 flex items-center gap-3">
      <div className="w-12 h-8 rounded-md bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-sm font-medium text-white">{pad(mins)}:{pad(secs)}</div>
      <div className="flex-1">
        <div className="text-white">Clip {clip.id}</div>
        <div className="text-white/60 text-xs">{clip.durationSec}s duration</div>
      </div>
      <div className="text-green-400 font-semibold">{clip.scorePct}%</div>
    </div>
  )
}
