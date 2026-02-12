"use client"

import React from 'react'

export default function NotificationPopup({ title, lines, onClose }: { title: string; lines: string[]; onClose?: () => void }){
  return (
    <div className="fixed right-6 top-6 z-50 w-80 max-w-full">
      <div className="rounded-xl border border-white/10 bg-white/6 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="mt-2 text-xs text-white/70 space-y-1">
              {lines.map((l, i) => (<div key={i}>• {l}</div>))}
            </div>
          </div>
          <div className="ml-2 shrink-0">
            <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
          </div>
        </div>
      </div>
    </div>
  )
}
