"use client"

import React from 'react'

export default function EditorHeader({ status }:{ status:any }){
  const running = ['uploading','analyzing','selecting','rendering','pacing'].includes((status||'').toString())
  const label = running ? 'Processing' : (status ? String(status).charAt(0).toUpperCase()+String(status).slice(1) : 'Idle')
  return (
    <div className="flex items-center justify-between pb-3">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-extrabold tracking-tight" style={{background: 'linear-gradient(90deg,#fff,#cbd5e1)', WebkitBackgroundClip: 'text', color: 'transparent'}}>Auto-Editor</h2>
          <div className="text-xs px-2 py-1 rounded-full bg-linear-to-r from-[#f59e0b] to-[#f97316] text-black font-semibold">Premium</div>
        </div>
        <div className="text-sm text-white/70 mt-1">Edit • Trim • Export — Smart AI suggestions, studio-ready results</div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-gray-500'}`} />
          <span className="font-medium">{label}</span>
        </div>
        <button onClick={() => window.location.href='/pricing'} className="ml-2 px-3 py-1 rounded-full bg-linear-to-r from-[#7c3aed] to-[#06b6d4] text-sm font-semibold shadow">Upgrade</button>
      </div>
    </div>
  )
}
