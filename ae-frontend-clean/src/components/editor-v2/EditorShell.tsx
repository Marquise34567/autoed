"use client"

import React from 'react'

export default function EditorShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 z-0 bg-[#07090f] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden>
        <div className="absolute left-1/2 -translate-x-1/2 -top-20 w-130 h-130 rounded-full bg-fuchsia-500/20 blur-[120px] animate-float" />
        <div className="absolute -right-20 top-[20%] w-90 h-90 rounded-full bg-cyan-500/20 blur-[120px] animate-float" style={{ animationDelay: '1.2s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_0%,transparent_30%)] mix-blend-overlay" />
      </div>

      <div className="h-full w-full p-6 pt-6 pb-6 overflow-auto">
        <div className="h-full w-full rounded-none bg-transparent p-0">
          {children}
        </div>
      </div>
    </main>
  )
}
