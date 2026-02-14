"use client"

import React from 'react'

export default function CenterPreviewPanel({ children, status, overallProgress }:{ children?:React.ReactNode; status?:any; overallProgress?:number }){
  const running = ['uploading','analyzing','selecting','rendering','pacing'].includes((status||'').toString())
  const label = running ? 'Processing' : (status ? String(status).charAt(0).toUpperCase()+String(status).slice(1) : 'Idle')
  return (
    <div className="col-span-1 lg:col-span-6 flex flex-col gap-4">
      <div className="relative w-full card overflow-hidden">
        <div className="w-full h-96 bg-black/80 rounded-2xl overflow-hidden flex items-center justify-center">
          {children}
        </div>

        {/* Status card top-right */}
        <div className="absolute right-4 top-4 glass rounded-xl p-2 w-48">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              <div className="text-xs font-medium">{label}</div>
            </div>
            <div className="text-xs text-white/60">{overallProgress ? `${Math.round(overallProgress*100)}%` : ''}</div>
          </div>
          <div className="mt-2 w-full h-2 bg-white/6 rounded-full overflow-hidden"><div className="h-2 bg-purple-500" style={{width: `${Math.round((overallProgress||0)*100)}%`}} /></div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full premium-btn">Play</button>
            <div className="text-xs muted">00:00 / 00:00</div>
          </div>
          <div className="flex-1 px-4">
            <div className="h-1 bg-white/6 rounded-full overflow-hidden"><div className="h-1 bg-purple-500" style={{width: `${Math.round((overallProgress||0)*100)}%`}} /></div>
          </div>
        </div>
      </div>

      <div className="w-full rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/6 p-3 backdrop-blur-sm">
        <div className="text-sm text-white/60">Timeline</div>
      </div>
    </div>
  )
}
