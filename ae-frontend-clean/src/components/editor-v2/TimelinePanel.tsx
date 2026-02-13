"use client"

import React from 'react'

export default function TimelinePanel({ clips }:{ clips?:any[] }){
  return (
    <div className="w-full rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/6 p-3 backdrop-blur-sm">
      <div className="w-full h-12 border-b border-white/6 mb-3 flex items-end">
        {/* Ruler with ticks */}
        <div className="w-full relative">
          <div className="absolute left-0 right-0 h-1 bg-linear-to-r from-transparent via-white/6 to-transparent" />
          <div className="absolute left-0 top-0 flex w-full justify-between text-xs text-white/50 px-1">
            {Array.from({length:9}).map((_,i)=> (<div key={i} className="w-8 text-center">{i*5}s</div>))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {(clips && clips.length>0) ? clips.map((c,idx)=> (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-20 text-xs text-white/60">{Math.round(c.start||0)}s</div>
            <div className="flex-1 bg-white/6 rounded-lg h-8 relative overflow-hidden">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-purple-500/80 text-white text-xs px-2 py-0.5 rounded-full">{c.label||`Clip ${idx+1}`}</div>
            </div>
            <div className="w-16 text-xs text-white/60">{Math.round(c.duration||0)}s</div>
          </div>
        )) : (
          <div className="text-sm text-white/60">No clips</div>
        )}
      </div>
    </div>
  )
}
