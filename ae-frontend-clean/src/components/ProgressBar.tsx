import React from 'react'

export default function ProgressBar({ value = 0, className = '' }: { value?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={`w-full bg-white/6 rounded-full h-3 overflow-hidden ${className}`}>
      <div style={{ width: `${pct}%` }} className="h-full bg-blue-500 transition-all" />
    </div>
  )
}
