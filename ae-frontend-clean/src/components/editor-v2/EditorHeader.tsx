"use client"

import React from 'react'

export default function EditorHeader({ status }:{ status:any }){
  const running = ['uploading','analyzing','selecting','rendering','pacing'].includes((status||'').toString())
  const label = running ? 'Processing' : (status ? String(status).charAt(0).toUpperCase()+String(status).slice(1) : 'Idle')
  return (
    <div className="flex items-center justify-between pb-3">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight" style={{background: 'linear-gradient(90deg,var(--primary-500),var(--accent-400))', WebkitBackgroundClip: 'text', color: 'transparent'}}>Auto-Editor</h2>
          <div className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-semibold">Premium</div>
        </div>
        <div className="text-sm muted mt-0.5">Edit • Trim • Export — Smart AI suggestions, one click highlights</div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-gray-500'}`} />
          <span className="font-medium">{label}</span>
        </div>
        <button onClick={() => window.location.href='/pricing'} className="ml-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-accent-400 text-sm font-semibold shadow">Upgrade</button>
      </div>
    </div>
  )
}
