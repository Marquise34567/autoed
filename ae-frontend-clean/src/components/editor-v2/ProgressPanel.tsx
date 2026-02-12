"use client"

import React from 'react'

export default function ProgressPanel({ pct, eta, message }:{ pct:number; eta?:number|null; message?:string }){
  const pct100 = Math.round((pct||0)*100)

  const formatEta = (s?: number|null) => {
    if (typeof s !== 'number' || Number.isNaN(s)) return 'calculating...'
    const sec = Math.max(0, Math.round(s))
    if (sec < 60) return `${sec}s`
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return `${mins}m ${rem}s`
  }

  return (
    <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur shadow-sm">
      <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
        <div className="h-3 bg-linear-to-r from-blue-400 to-purple-500 transition-all duration-500" style={{ width: `${pct100}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-white/60">
        <div>{message || 'Processing...'}</div>
        <div>ETA: {formatEta(eta)}</div>
      </div>
    </div>
  )
}
