import React from 'react'

export default function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: 'bg-white/6 text-white',
    uploading: 'bg-amber-500 text-black',
    processing: 'bg-amber-500 text-black',
    analyzing: 'bg-violet-600 text-white',
    hook: 'bg-indigo-600 text-white',
    cutting: 'bg-sky-600 text-white',
    pacing: 'bg-teal-600 text-white',
    rendering: 'bg-fuchsia-600 text-white',
    uploading_result: 'bg-amber-600 text-white',
    done: 'bg-emerald-500 text-black',
    completed: 'bg-emerald-500 text-black',
    error: 'bg-red-500 text-white',
  }
  const cls = map[status] || 'bg-white/6 text-white'
  return <div className={`px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>{status}</div>
}
