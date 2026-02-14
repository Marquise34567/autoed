"use client"

import React, { useEffect, useMemo, useState } from 'react'
import ProgressBar from '@/components/ProgressBar'

function fmtDuration(sec?: number | null) {
  if (!sec && sec !== 0) return '—'
  const s = Math.max(0, Math.round(sec || 0))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${r}s`
}

const ACTIVITY_LINES = [
  'Scanning for high-retention moments…',
  'Removing low-energy pauses…',
  'Compressing boring sections…',
  'Adding pattern interrupts…',
  'Finalizing render…',
]

export default function ProcessingCard({
  status,
  overallProgress = 0,
  detectedDurationSec = null,
  overallEtaSec = 0,
  jobId,
  jobResp,
  fileName,
  smartZoom,
  errorMessage,
  onRetry,
}: {
  status?: string
  overallProgress?: number
  detectedDurationSec?: number | null
  overallEtaSec?: number
  jobId?: string | null
  jobResp?: any
  fileName?: string | null
  smartZoom?: boolean
  errorMessage?: string | null
  onRetry?: () => void
}) {
  // Normalize progress: prefer jobResp?.progress, then overallProgress, then 0
  const rawProgress = jobResp?.progress ?? overallProgress ?? 0
  const progress = typeof rawProgress === 'number' && Number.isFinite(rawProgress) ? rawProgress : 0
  let pct = 0
  if (progress <= 1) {
    pct = Math.round(progress * 100)
  } else {
    pct = Math.round(progress)
  }
  pct = Math.max(0, Math.min(100, pct))

  const stages = useMemo(
    () => [
      { key: 'hook', label: 'Detecting Hook' },
      { key: 'cutting', label: 'Cutting Dead Air' },
      { key: 'pacing', label: 'Pacing & Rhythm' },
      { key: 'smartzoom', label: 'Smart Zoom' },
      { key: 'rendering', label: 'Rendering' },
    ],
    []
  )

  const activeStageKey = useMemo(() => {
    if (!status) return null
    const s = String(status).toLowerCase()
    if (s.includes('hook')) return 'hook'
    if (s.includes('cut') || s.includes('select')) return 'cutting'
    if (s.includes('pacing')) return 'pacing'
    if (s.includes('render') || s.includes('upload')) return 'rendering'
    // show smartzoom as active when smartZoom is enabled and we're past analysis
    if (smartZoom && (s === 'pacing' || s === 'rendering' || s === 'cutting')) return 'smartzoom'
    return null
  }, [status, smartZoom])

  const [activityIdx, setActivityIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActivityIdx((i) => (i + 1) % ACTIVITY_LINES.length), 3500)
    return () => clearInterval(t)
  }, [])

  const displayStatus = (st?: string) => {
    const s = String(st || '')
    if (!s) return 'Idle'
    if (s === 'analyzing' || s === 'uploading') return 'Analyzing video…'
    if (s === 'hook') return 'Selecting best hook (3–5s)'
    if (s === 'cutting') return 'Extracting highlights (5–10s)'
    if (s === 'pacing') return 'Optimizing pacing'
    if (s === 'rendering') return 'Rendering final video'
    if (s === 'uploading_result') return 'Uploading result'
    if (s === 'done') return 'Complete'
    if (s === 'error') return 'Failed'
    return s
  }

  return (
    <div className="p-4 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] border border-white/6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-white/70">AI Editor Pipeline</div>
          <div className="flex items-center gap-3 mt-1">
            <div className="inline-flex items-center gap-2 bg-white/6 px-3 py-1 rounded-full">
              <span className="h-2 w-2 rounded-full bg-emerald-400 relative">
                <span className="absolute inset-0 block rounded-full animate-ping" style={{ opacity: 0.35 }} />
              </span>
              <div className="text-sm font-semibold text-white">AI Processing</div>
            </div>
            <div className="text-xs text-white/50">Optimizing for retention</div>
          </div>
        </div>

        {/* intentionally not rendering raw job IDs to avoid leaking identifiers in the UI */}
        <div className="text-right">
          <div className="text-xs text-white/60">Status</div>
          <div className="font-mono text-sm text-white/80">{displayStatus(status)}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          {stages.map((st) => {
            const active = st.key === activeStageKey
            return (
              <div key={st.key} className={`px-3 py-1 rounded-full text-xs font-semibold ${active ? 'bg-linear-to-r from-[#7c3aed] to-[#06b6d4] text-white shadow' : 'bg-white/5 text-white/60 border border-white/6'}`}>
                {st.label}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full bg-white/6 rounded-full h-3 overflow-hidden relative">
              <div style={{ width: `${pct}%` }} className="h-full bg-linear-to-r from-blue-400 to-purple-500 transition-all" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] animate-[shimmer_2.5s_linear_infinite]" style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }} />
            </div>
          </div>

          <div className="w-16 text-right">
            <div className="text-sm font-semibold text-white">{pct}%</div>
            <div className="text-xs text-white/60">{overallEtaSec > 0 ? `${Math.floor(overallEtaSec/60)}m ${overallEtaSec%60}s` : 'Estimating…'}</div>
          </div>
        </div>

        <div className="mt-2 text-xs text-white/60">{ACTIVITY_LINES[activityIdx]}</div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-sm text-white/70">Detected length</div>
          <div className="text-white font-semibold">{detectedDurationSec ? `Detected length: ${fmtDuration(detectedDurationSec)}` : '—'}</div>
          {fileName && <div className="text-xs text-white/50 mt-1">{fileName}</div>}
        </div>

        <div className="w-36">
          <div className="text-sm text-white/70">Preview</div>
          <div className="mt-2 h-12 rounded-md overflow-hidden bg-black/40 relative">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#ffffff08 0px,#ffffff08 2px,#00000000 2px,#00000000 6px)] opacity-10 animate-[waveFade_3s_linear_infinite]" />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 p-3 rounded-md bg-red-700/20 border border-red-600 text-sm text-red-200 flex items-center justify-between">
          <div className="mr-4">{errorMessage}</div>
          {onRetry && (
            <button onClick={onRetry} className="ml-2 px-3 py-1 rounded-md bg-white/6 text-white/80 hover:bg-white/10">Retry</button>
          )}
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .animate-[shimmer_2.5s_linear_infinite] { background-size: 200% 100%; animation: shimmer 2.5s linear infinite; }
        @keyframes waveFade { 0%{opacity:0.6}50%{opacity:0.35}100%{opacity:0.6} }
        .animate-[waveFade_3s_linear_infinite] { animation: waveFade 3s linear infinite; }
      `}</style>
    </div>
  )
}
