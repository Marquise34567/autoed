"use client"

import React from 'react'

export default function ClipRow({ clip }:{ clip: { id: string; startSec:number; durationSec:number; scorePct:number } }){
  const pad = (n:number)=> String(Math.floor(n)).padStart(2,'0')
  const mins = Math.floor(clip.startSec/60)
  const secs = clip.startSec%60
  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.02)] border border-white/6 p-3 flex items-center gap-3 backdrop-blur-sm hover:shadow-[0_10px_30px_rgba(3,6,23,0.6)] transition-transform hover:-translate-y-0.5">
      <div className="w-12 h-8 rounded-md bg-linear-to-r from-[#7c3aed] to-[#06b6d4] flex items-center justify-center text-sm font-medium text-white">{pad(mins)}:{pad(secs)}</div>
      <div className="flex-1">
        <div className="text-white font-medium">Clip {clip.id}</div>
        <div className="text-white/60 text-xs">{clip.durationSec}s duration</div>
      </div>
      <div className="text-emerald-400 font-semibold">{clip.scorePct}%</div>
    </div>
  )
}
