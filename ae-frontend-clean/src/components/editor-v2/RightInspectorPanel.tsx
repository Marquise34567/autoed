"use client"

import React from 'react'

export default function RightInspectorPanel({ children, status, overallProgress, onGenerate }:{ children?:React.ReactNode; status?:any; overallProgress?:number; onGenerate?:()=>void }){
  return (
    <aside className="w-full sm:w-80 lg:w-80">
      <div className="bg-[rgba(255,255,255,0.02)] border border-white/6 rounded-2xl p-4 backdrop-blur-sm flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-full bg-white/6 text-white/90">Video</button>
          <button className="px-3 py-1 rounded-full bg-transparent text-white/60">Animation</button>
          <button className="px-3 py-1 rounded-full bg-transparent text-white/60">Tracking</button>
        </div>

        <div className="p-3 rounded-lg bg-[rgba(0,0,0,0.35)] border border-white/6">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60">Volume</div>
            <div className="text-xs text-white/60">{Math.round((overallProgress||0)*100)}%</div>
          </div>
          <div className="mt-2 h-2 bg-white/6 rounded-full overflow-hidden"><div className="h-2 bg-purple-500" style={{width: `${Math.round((overallProgress||0)*100)}%`}} /></div>
        </div>

        <div className="p-3 rounded-lg bg-[rgba(0,0,0,0.35)] border border-white/6 flex-1">
          <div className="text-sm text-white/70">Background</div>
          <div className="mt-3 w-full h-24 bg-linear-to-b from-[#111214] to-[#0b0f14] rounded" />
        </div>

        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-white/6">
          <div className="text-sm font-semibold text-white">Hi! How can I help you?</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button onClick={onGenerate} className="px-2 py-2 rounded-lg bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white/90">Text</button>
            <button className="px-2 py-2 rounded-lg bg-white/6 text-white/90">Images</button>
            <button className="px-2 py-2 rounded-lg bg-white/6 text-white/90">Avatar</button>
          </div>
        </div>

        {children}
      </div>
    </aside>
  )
}
