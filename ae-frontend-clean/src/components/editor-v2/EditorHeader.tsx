"use client"

import React from 'react'

export default function EditorHeader({ status }:{ status:any }){
  const running = ['uploading','analyzing','selecting','rendering','pacing'].includes((status||'').toString())
  const label = running ? 'Processing' : (status ? String(status).charAt(0).toUpperCase()+String(status).slice(1) : 'Idle')
  return (
    <div className="flex items-center justify-between pb-3">
      <div className="flex flex-col">
        <h2 className="text-2xl font-semibold tracking-tight text-white">Auto-Editor</h2>
        <div className="text-sm text-white/60 mt-0.5">Edit • Trim • Export</div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-sm text-white/80">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-gray-500'}`} />
          <span className="font-medium text-white/90">{label}</span>
        </div>
      </div>
    </div>
  )
}
