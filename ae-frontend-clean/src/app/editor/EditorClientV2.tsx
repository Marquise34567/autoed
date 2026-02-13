"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import PipelineStepper from '@/components/editor-v2/PipelineStepper'
import ProgressBar from '@/components/ProgressBar'
import JobDetails from '@/components/editor/JobDetails'
import SubscriptionCard from '@/components/subscription/SubscriptionCard'
import NotificationPopup from '@/components/NotificationPopup'
import { planFeatures } from '@/lib/plans'
import { auth, db as firestore, isFirebaseConfigured } from '@/lib/firebase.client'
import { useAuth } from '@/lib/auth/useAuth'
import { requirePremium } from '@/lib/subscription'
import { useRouter } from 'next/navigation'
import { safeJson } from '@/lib/client/safeJson'
// Use the explicit env var as requested; fallback to the central API_BASE if available
import { API_BASE as CENTRAL_API_BASE } from '@/lib/api'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || CENTRAL_API_BASE
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getOrCreateUserDoc } from '@/lib/safeUserDoc'

type Status = 'idle' | 'uploading' | 'analyzing' | 'hook' | 'cutting' | 'pacing' | 'rendering' | 'uploading_result' | 'done' | 'error'

type BackendStatus = 'queued' | 'analyzing' | 'hook' | 'cutting' | 'pacing' | 'rendering' | 'uploading' | 'done' | 'error'

type JobResponse = {
  status: BackendStatus
  progress?: number
  message?: string
  hook?: { start: string; end: string; reason?: string }
  segments?: Array<{ start: string; end: string; reason?: string }>
  result?: { videoUrl: string; filename?: string }
  error?: { code?: string; message?: string }
}

export default function EditorClientV2({ compact }: { compact?: boolean } = {}) {
  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-sm text-yellow-300">Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars in Vercel.</div>
        </div>
      </div>
    )
  }
  const { user, authReady } = useAuth()
  const router = useRouter()
  // moved navigator access into an effect to avoid module-scope window access
  useEffect(() => {
    try { console.log('Navigator online:', navigator.onLine) } catch (_) {}
  }, [])

  const [userDoc, setUserDoc] = useState<any | null>(null)
  const [popup, setPopup] = useState<{ title: string; lines: string[] } | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [overallProgress, setOverallProgress] = useState<number>(0)
  const [overallEtaSec, setOverallEtaSec] = useState<number>(0)
  const [detectedDurationSec, setDetectedDurationSec] = useState<number | null>(null)
  const [clips, setClips] = useState<Array<any>>([])
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [jobId, setJobId] = useState<string | undefined>()
  const esRef = useRef<EventSource | null>(null)
  const isTerminalRef = useRef<boolean>(false)
  const startedRef = useRef<boolean>(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>()
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | undefined>()
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollRef = useRef<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [jobResp, setJobResp] = useState<JobResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function startEditorPipeline(file: File) {
    if (!authReady) {
      console.warn('[pipeline] auth not ready; aborting start')
      try { setErrorMessage('Waiting for authentication; please try again') } catch (_) {}
      return
    }
    // user presence will be ensured by page guard; still safe-check
    const uid = user?.id || auth.currentUser?.uid
    if (!uid) {
      console.warn('[pipeline] no user available; cannot start pipeline')
      try { setErrorMessage('Please sign in to start processing') } catch (_) {}
      return
    }
    if (startedRef.current) {
      console.warn('[pipeline] already started; skipping')
      return
    }
    startedRef.current = true
    try {
      console.log('[pipeline] startEditorPipeline:', file.name, file.type)
      await createJobWithFile(file)
    } finally {
      startedRef.current = false
    }
  }

  const fetchDownloadUrl = async () => {
    if (!jobId) throw new Error('Missing jobId')
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('Not signed in')
    const idToken = await currentUser.getIdToken(true)
    const resp = await fetch(`${API_BASE}/api/video/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ jobId }),
    })
    const j = await safeJson(resp)
    if (!resp.ok) throw new Error(j?.error || 'Failed to generate download URL')
    if (!j?.url) throw new Error('Missing download URL')
    return j.url
  }

  function openFilePicker() {
    try { console.log('[upload] button clicked') } catch (_) {}
    if (!fileInputRef.current) {
      try { alert('Unable to open file picker — please reload the page and try.') } catch (_) {}
      return
    }
    try { if (fileInputRef.current) fileInputRef.current.value = '' } catch (_) {}
    fileInputRef.current?.click()
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) {
      try { event.currentTarget.value = '' } catch (_) {}
      return
    }
    // basic validation
    const okType = /video\/(mp4|quicktime|x-matroska|webm)/i
    if (!okType.test(selected.type) && !/\.(mp4|mov|mkv|webm)$/i.test(selected.name)) {
      setErrorMessage('Unsupported file type — use MP4, MOV, MKV, or WEBM')
      return
    }
    // optional size limit: 1 GB
    const maxMB = 1024
    if (selected.size / 1024 / 1024 > maxMB) {
      setErrorMessage(`File is too large (${Math.round(selected.size/1024/1024)} MB). Maximum allowed is ${maxMB} MB (1 GB).`)
      return
    }

    setErrorMessage(undefined)
    setSelectedFile(selected)
    try {
      const url = URL.createObjectURL(selected)
      setOriginalUrl(url)
    } catch (_) { setOriginalUrl(null) }
    await createJobWithFile(selected)
  }

  async function createJobWithFile(file: File) {
    if (!authReady) {
      setErrorMessage('Waiting for auth')
      return
    }
    setIsUploading(true)
    setStatus('uploading')
    setOverallProgress(0)
    setJobResp(null)
    setJobId(undefined)
    try {
      const fd = new FormData()
      fd.append('video', file)
      const current = auth.currentUser
      const headers: Record<string,string> = {}
      if (current) {
        const t = await current.getIdToken(true)
        headers['Authorization'] = `Bearer ${t}`
      }
      const resp = await fetch(`${API_BASE}/api/jobs`, { method: 'POST', body: fd, headers })
      const j = await safeJson(resp)
      if (!resp.ok) throw new Error(j?.error || 'Failed to create job')
      const jid = j.jobId || j.jobID || j.id
      setJobId(jid)
      setStatus('analyzing')
      startPollingJob(jid)
    } catch (e: any) {
      setErrorMessage(e?.message || 'Upload failed')
      setStatus('error')
    } finally {
      setIsUploading(false)
    }
  }



  const startJobListening = (jid: string) => {
    // compatibility wrapper retained but prefer startPollingJob
    startPollingJob(jid)
  }

  const startPollingJob = (jid: string) => {
    if (!jid) return
    try { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } } catch (_) {}
    const tick = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/jobs/${jid}`)
        if (!r.ok) {
          if (r.status === 404) return
          console.warn('[poll] status', r.status)
          return
        }
        const j: JobResponse = await r.json()
        if (!j) return
        setJobResp(j)
        if (typeof j.progress === 'number') setOverallProgress(j.progress)
        // map backend status to local status
        const map: Record<string, Status> = {
          queued: 'analyzing',
          analyzing: 'analyzing',
          hook: 'hook',
          cutting: 'cutting',
          pacing: 'pacing',
          rendering: 'rendering',
          uploading: 'uploading_result',
          done: 'done',
          error: 'error',
        }
        setStatus(map[j.status] || 'analyzing')
        if (j.status === 'done' || j.status === 'error') {
          if (pollRef.current) { try { clearInterval(pollRef.current) } catch (_) {} ; pollRef.current = null }
        }
      } catch (e) {
        console.warn('[poll] fetch error', e)
      }
    }
    tick()
    pollRef.current = setInterval(tick, 2000) as unknown as number
    // cleanup on route change/unmount
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }

  const startPollingFallback = (jid: string) => {
    if (!jid) return
    if (pollRef.current) {
      try { clearTimeout(pollRef.current) } catch (_) {}
      pollRef.current = null
    }

    let cancelled = false
    let backoff = 700

    const tick = async () => {
      if (cancelled) return
      try {
        const r = await fetch(`${API_BASE}/api/jobs/${jid}`)
        if (!r.ok) {
          if (r.status >= 400 && r.status < 500 && r.status !== 404) {
            if (process.env.NODE_ENV === 'development') console.warn(`[poll:${jid}] received ${r.status}`)
            cancelled = true
            return
          }
        }
        try {
          const j = await safeJson(r)
          applyJobUpdate(j)
          const phase = String(j?.phase || '').toLowerCase()
          if (phase === 'done' || phase === 'error') {
            cancelled = true
            return
          }
        } catch (e) {
        }
      } catch (e) {
        console.error('[poll] fetch error', e)
      }
      backoff = Math.min(10000, Math.round(backoff * 1.5))
      pollRef.current = setTimeout(tick, backoff) as unknown as number
    }

    tick()
    return () => { cancelled = true }
  }

  const applyJobUpdate = (d: any) => {
    // Deprecated: retained for compatibility but primary updates come from startPollingJob
    if (!d) return
    if (typeof d.progress === 'number') setOverallProgress(d.progress)
    if (d.hook) {
      // keep detected clips if provided
      if (Array.isArray(d.segments)) setClips(d.segments)
    }
    const st = String(d.status || '').toLowerCase()
    if (st === 'done') {
      setStatus('done')
      setShowPreview(true)
      ;(async () => {
        try {
          const uid = auth.currentUser?.uid || (user as any)?.id || (user as any)?.uid
          if (uid) {
            const ref = doc(firestore, 'users', uid)
            const currentUsed = (userDoc?.rendersUsed ?? 0) + 1
            await updateDoc(ref, { rendersUsed: currentUsed, updatedAt: serverTimestamp() })
            setUserDoc((prev: any) => ({ ...(prev || {}), rendersUsed: currentUsed }))
          }
        } catch (e) {
          console.warn('[billing] failed to update rendersUsed', e)
        }
      })()
    }
    if (st === 'error') {
      setErrorMessage(d.error?.message || d.message || 'Processing error')
    }
  }

  const reset = () => {
    setStatus('idle')
    setOverallProgress(0)
    setOverallEtaSec(0)
    setDetectedDurationSec(null)
    setClips([])
    setErrorMessage(undefined)
    setJobId(undefined)
    setShowPreview(false)
    setPreviewUrl(undefined)
    setPreviewError(undefined)
    setPreviewLoading(false)
    isTerminalRef.current = false
    startedRef.current = false
    if (esRef.current) { try { esRef.current.close() } catch (_) {} ; esRef.current = null }
    if (pollRef.current) { try { clearTimeout(pollRef.current) } catch (_) {} ; pollRef.current = null }
  }

  useEffect(() => {
    if (!showPreview) {
      setPreviewUrl(undefined)
      setPreviewError(undefined)
      setPreviewLoading(false)
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(undefined)
    fetchDownloadUrl()
      .then((url) => {
        if (cancelled) return
        setPreviewUrl(url)
      })
      .catch((e: any) => {
        if (cancelled) return
        setPreviewError(e?.message || 'Failed to load preview')
        setPreviewUrl(undefined)
      })
      .finally(() => {
        if (cancelled) return
        setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showPreview, jobId])

  useEffect(() => {
    if (status === 'done' && jobId) {
      setShowPreview(true);
    }
  }, [status, jobId])

  // notify when user's plan upgrades/changes
  const prevPlanRef = React.useRef<string | null>(null)
  useEffect(() => {
    const newPlan = userDoc?.plan || null
    const prev = prevPlanRef.current
    if (prev && newPlan && prev !== newPlan) {
      if (newPlan !== 'free') {
        try {
          const feats = planFeatures(newPlan)
          setPopup({ title: `Plan active: ${newPlan}`, lines: feats })
          const t = setTimeout(() => setPopup(null), 10000)
          return () => clearTimeout(t)
        } catch (e) {}
      }
    }
    prevPlanRef.current = newPlan
  }, [userDoc])

  const card = (
    <div className="w-full max-w-2xl p-6">
      <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(7,9,15,0.6),rgba(7,9,15,0.5))] p-6 backdrop-blur-md shadow-xl">
        <h2 className="text-2xl font-bold mb-4">Editor Pipeline</h2>

        <div className="mb-4">
          <PipelineStepper current={status} />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: upload + original preview */}
          <div className="col-span-7 space-y-4">
            <div className="p-4 rounded-lg bg-white/2 border border-white/6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/70">Upload</div>
                  <div className="font-semibold text-white">Select a video to analyze</div>
                </div>
                <div className="text-sm text-white/60">{selectedFile ? `${selectedFile.name}` : ''}</div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
                  hidden
                  ref={fileInputRef}
                  onChange={handleFileSelected}
                />

                <button
                  onClick={openFilePicker}
                  disabled={isUploading || (status !== 'idle' && status !== 'done')}
                  className={`px-4 py-2 rounded-full font-semibold shadow transition ${isUploading || (status !== 'idle' && status !== 'done') ? 'bg-white/20 text-white/60 cursor-not-allowed' : 'bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white'}`}
                >
                  {isUploading ? 'Uploading…' : (status === 'done' && jobResp?.result?.videoUrl ? 'Upload New' : 'Upload')}
                </button>

                {status === 'done' && jobResp?.result?.videoUrl && (
                  <a href={jobResp.result.videoUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full bg-white text-black font-semibold shadow">Download</a>
                )}

                <button onClick={reset} className="px-3 py-2 rounded-lg border border-white/8 text-white/80">Reset</button>
              </div>

              <div className="mt-3 text-xs text-white/60">Tips: MP4/MOV/WEBM supported — up to 1 GB.</div>
            </div>

            <div className="p-4 rounded-lg bg-white/2 border border-white/6">
              <div className="text-sm text-white/70">Original preview</div>
              {originalUrl ? (
                <video src={originalUrl} controls className="mt-3 w-full rounded-md bg-black" />
              ) : (
                <div className="mt-3 text-sm text-white/60">No file selected</div>
              )}
            </div>
          </div>

          {/* Right: progress, result preview, details */}
          <div className="col-span-5 space-y-4">
            <div className="p-4 rounded-lg bg-white/2 border border-white/6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-white/70">Processing Status</div>
                  <div className="font-semibold text-white">{status === 'idle' ? 'Waiting for upload' : (status === 'uploading' ? 'Uploading' : status === 'analyzing' ? 'Analyzing full video' : status === 'hook' ? 'Selecting best hook (3–5s)' : status === 'cutting' ? 'Extracting highlights (5–10s)' : status === 'pacing' ? 'Optimizing pacing' : status === 'rendering' ? 'Rendering final video' : status === 'uploading_result' ? 'Uploading result' : status === 'done' ? 'Complete' : 'Error')}</div>
                  <div className="text-xs text-white/60 mt-1">Job: {jobId || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/70">Progress</div>
                  <div className="text-lg font-semibold text-white">{Math.round((Array.isArray(jobResp?.progress) ? 0 : ((jobResp?.progress ?? overallProgress) || 0)) * (jobResp?.progress && jobResp.progress <= 1 ? 100 : 1))}%</div>
                </div>
              </div>

              <div className="mt-3">
                <ProgressBar value={ (jobResp?.progress ?? overallProgress) as any } />
              </div>

              {errorMessage && (
                <div className="mt-3 p-3 rounded-md bg-red-700/20 border border-red-600 text-sm text-red-200">{errorMessage}</div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-white/2 border border-white/6">
              <div className="text-sm text-white/70">Result preview</div>
              {jobResp?.result?.videoUrl ? (
                <video src={jobResp.result.videoUrl} controls className="mt-3 w-full rounded-md bg-black" />
              ) : previewLoading ? (
                <div className="mt-3 text-sm text-white/60">Loading preview…</div>
              ) : (
                <div className="mt-3 text-sm text-white/60">No result yet</div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-white/2 border border-white/6">
              <JobDetails hook={jobResp?.hook ?? null} segments={jobResp?.segments ?? null} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (compact) return card

  return (
    <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center p-6">
      {card}
    </div>
  )
}
