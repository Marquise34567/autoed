"use client"

import React from 'react'

export default function ProgressPanel({ pct, eta, message }:{ pct:number; eta?:number|null; message?:string }){
  const pct100 = Math.round((pct||0)*100)
  return (
    <div className="w-full rounded-lg bg-[rgba(255,255,255,0.02)] border border-white/6 p-4">
      <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
        <div className="h-3 bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500" style={{ width: `${pct100}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-white/60">
        <div>{message || 'Processing...'}</div>
        <div>ETA: {typeof eta === 'number' ? `${Math.round(eta)}s` : 'calculating...'}</div>
      </div>
    </div>
  )
}
