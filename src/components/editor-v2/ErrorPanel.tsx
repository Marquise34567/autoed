"use client"

import React from 'react'

export default function ErrorPanel({ message, onRetry, onCopy }:{ message?:string; onRetry?:()=>void; onCopy?:()=>void }){
  return (
    <div className="w-full rounded-lg bg-red-900/20 border border-red-600/20 p-4">
      <div className="text-white font-semibold">{message || 'An error occurred'}</div>
      <div className="mt-3 flex gap-2">
        <button onClick={onRetry} className="px-3 py-2 bg-white/6 rounded text-white">Try again</button>
        <button onClick={onCopy} className="px-3 py-2 bg-white/6 rounded text-white">Copy debug info</button>
      </div>
    </div>
  )
}
