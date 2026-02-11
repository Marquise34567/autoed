"use client"

import React from 'react'

export default function StatsRow({ clipsReady, avgDuration, qualityScore }:{ clipsReady:number; avgDuration:number; qualityScore:number }){
  return (
    <div className="rounded-xl p-3 bg-[rgba(10,12,16,0.35)] border border-white/6 flex items-center justify-between">
      <div className="flex-1 text-center">
        <div className="text-[30px] font-semibold text-[#2F7BFF]">{clipsReady}</div>
        <div className="text-xs text-white/60">Clips Ready</div>
      </div>
      <div className="flex-1 text-center">
        <div className="text-[30px] font-semibold text-[#22C55E]">{avgDuration}s</div>
        <div className="text-xs text-white/60">Avg Duration</div>
      </div>
      <div className="flex-1 text-center">
        <div className="text-[30px] font-semibold text-[#7C3AED]">{qualityScore}%</div>
        <div className="text-xs text-white/60">Quality Score</div>
      </div>
    </div>
  )
}
