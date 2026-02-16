import React, { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/client/apiClient'
import { apiUrl } from '@/lib/apiBase'

type JobRow = { id: string; status: string; createdAt?: string; duration?: string }

export default function JobsTable({ onView, onDownload }: { onView?: (id:string)=>void; onDownload?: (id:string)=>void }) {
  const [jobs, setJobs] = useState<JobRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    apiFetch('/api/jobs?limit=8')
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data:any) => {
        if (!mounted) return
        const raw = (data.jobs || data || []).slice(0,8)
        const toDateString = (v:any) => {
          if (!v && v !== 0) return undefined
          if (typeof v === 'string') return v
          if (typeof v === 'number') return new Date(v * 1000).toLocaleString()
          if (v && typeof v === 'object') {
            // Firestore Timestamp {_seconds,_nanoseconds} or Node Timestamp {seconds}
            const secs = v._seconds ?? v.seconds ?? v.seconds?.toNumber?.()
            if (typeof secs === 'number') return new Date(secs * 1000).toLocaleString()
            try { return String(v) } catch (_) { return undefined }
          }
          return undefined
        }
        const list = raw.map((j:any) => {
          const createdRaw = j.createdAt || j.created_at || j.created || j.createdAt
          return {
            id: j.id || j.jobId || j.job_id || j._id || j.jobId,
            status: j.status || j.phase || 'unknown',
            createdAt: toDateString(createdRaw),
            duration: j.duration,
          }
        })
        setJobs(list)
      })
      .catch(()=>{
        if (!mounted) return
        setJobs([])
      })
      .finally(()=>{ if (mounted) setLoading(false) })
    return ()=>{ mounted=false }
  },[])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3,4].map(i=> <div key={i} className="h-12 rounded-lg bg-white/6 animate-pulse" />)}
      </div>
    )
  }

  if (!jobs || jobs.length === 0) {
    return <div className="text-white/60">No recent jobs</div>
  }

  return (
    <div className="space-y-3">
      {jobs.map(j => (
        <div key={String(j.id)} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-white/6">
          <div className="flex-1">
            <div className="text-sm text-white/90">{j.id}</div>
            <div className="text-xs text-white/60">{j.createdAt || '—'}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-white/80">{j.status}</div>
            <div className="flex gap-2">
              <button onClick={()=>onView?.(String(j.id))} className="px-3 py-1 rounded-full bg-white/6 text-white text-sm">View</button>
              <button onClick={()=>onDownload?.(String(j.id))} className="px-3 py-1 rounded-full bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white text-sm">Download</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
