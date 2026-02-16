import React from 'react'

export default function Timeline({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-3 font-mono text-sm text-white/70">
      {steps.slice(0, 5).map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-2 h-2 mt-1 rounded-full bg-white/20" />
          <div className="flex-1">
            <div className="text-white/90">{s}</div>
          </div>
        </div>
      ))}
      {steps.length === 0 && <div className="text-white/60">No steps yet</div>}
    </div>
  )
}
