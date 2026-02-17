"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
// PipelineStepper removed
import ProgressBar from '@/components/ProgressBar'
import CompletionModal from '@/components/CompletionModal'
import Card from '@/components/editor-v2/ui/Card'
import StatusPill from '@/components/editor-v2/ui/StatusPill'
import Timeline from '@/components/editor-v2/ui/Timeline'
import JobsTable from '@/components/editor-v2/ui/JobsTable'
import { planFeatures } from '@/lib/plans'
import { auth, db as firestore, isFirebaseConfigured } from '@/lib/firebase.client'
import { useAuth } from '@/lib/auth/useAuth'
import { requirePremium } from '@/lib/subscription'
import { useRouter } from 'next/navigation'
import { safeJson } from '@/lib/client/safeJson'
import { uploadVideoToStorage } from '@/lib/client/storage-upload'
// Use the explicit env var as requested; fallback to the central API_BASE if available
import { API_BASE as CENTRAL_API_BASE } from '@/lib/api'
import { initFetchGuard } from '@/lib/client/fetch-guard'
initFetchGuard()
import { apiFetch } from '@/lib/client/apiClient'
import { apiUrl } from '@/lib/apiBase'
// Use direct backend API paths; `apiFetch` resolves `/api/*` to the configured backend
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
  const jobStartRef = useRef<number | null>(null)
  const [smartZoom, setSmartZoom] = useState<boolean>(true)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [lastCelebratedJobId, setLastCelebratedJobId] = useState<string | null>(null)

  const handleModalClose = () => {
    setCompletionOpen(false)
  }

  const handleModalDownload = () => {
    if (jobId) handleDownload(jobId)
  }

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
    // Prefer the result URL from the polled job state
    if (jobResp?.result?.videoUrl) return jobResp.result.videoUrl
    // Fallback: query job status endpoint for the job wrapper
    const path = `/api/jobs/${encodeURIComponent(jobId)}`
    try { console.log('[fetchDownloadUrl] GET', path) } catch (_) {}
    const resp = await apiFetch(path)
    if (!resp.ok) throw new Error('Failed to fetch job')
    const data: any = await resp.json()
    const jobWrapper = data.job || data
    if (!jobWrapper) throw new Error('Missing job data')
    const url = jobWrapper.resultUrl || jobWrapper.result?.videoUrl || jobWrapper.result?.url || jobWrapper.outputUrl
    if (!url) throw new Error('Missing result URL')
    console.log('RESULT URL:', url)
    return url
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

  // New combined handler: if a file is already selected, start upload; otherwise open picker.
  function handleUploadButtonClick() {
    try { console.log('[upload] button clicked (handler)') } catch (_) {}
    if (selectedFile) {
      try { console.log('[upload] start', { apiUrl: '/api', fileName: selectedFile.name, fileSize: selectedFile.size }) } catch (_) {}
      createJobWithFile(selectedFile)
      return
    }
    // No file yet — set UI message and open file picker
    try { setErrorMessage('Please select a file to upload') } catch (_) {}
    openFilePicker()
    return
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
    // Ensure user is signed in before starting upload
    const uid = user?.id || auth.currentUser?.uid || null
    if (!uid) {
      setErrorMessage('Please sign in')
      setIsUploading(false)
      setStatus('idle')
      return
    }
    setIsUploading(true)
    setStatus('uploading')
    setOverallProgress(0)
    setJobResp(null)
    setJobId(undefined)
    try {
      // Log upload start and file metadata
      try { console.log('[upload] start', { apiProxy: '/api', fileName: file?.name, fileSize: file?.size }) } catch (_) {}

      // Use Firebase client resumable upload and then create job record on backend
      try { console.log('[upload] starting resumable upload via Firebase client') } catch (_) {}
      const onProgress = (pct: number, transferred?: number, total?: number) => {
        try { setOverallProgress((pct || 0) / 100) } catch (_) {}
      }
      const { storagePath } = await uploadVideoToStorage(file, onProgress)
      try { console.log('[upload] resumable upload complete', storagePath) } catch (_) {}
      const gsUri = `gs://autoeditor-d4940.firebasestorage.app/${storagePath}`
      const body = {
        uid,
        storagePath,
        gsUri,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      }
      const startResp = await apiFetch(`/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      try { console.log('[jobs] /jobs create status', startResp.status) } catch (_) {}
      if (!startResp.ok) {
        const txt = await startResp.text().catch(()=>'')
        try { console.error('JOB CREATE ERROR:', startResp.status, txt) } catch (_) {}
        throw new Error(`Job create failed: ${startResp.status} ${txt}`)
      }
      const data: any = await startResp.json().catch(() => ({}))

      const jidFromBackend: string | undefined = data.jobId || data.id || data.job?.id

      if (!jidFromBackend) {
        try { console.error('Unexpected job response:', data) } catch (_) {}
        throw new Error('Backend did not return jobId')
      }

      setJobId(jidFromBackend)
      try { localStorage.setItem('ae:lastJobId', jidFromBackend) } catch (_) {}
      jobStartRef.current = Date.now()
      setStatus('analyzing')
      startPollingJob(jidFromBackend)
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

  const loggedJobsRef = useRef<Record<string, boolean>>({})

  const startPollingJob = (jid: string) => {
    if (!jid) return
    try { if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null } } catch (_) {}
    let cancelled = false
    const POLL_MS = 2500
    const startAt = Date.now()
    const MAX_MS = 10 * 60 * 1000 // 10 minutes

    console.log('[poll] startPollingJob', { jobId: jid })

    const tick = async () => {
      if (cancelled) return
      try {
        const url = `/api/jobs?id=${encodeURIComponent(jid)}`
        const r = await apiFetch(url)
        if (!r.ok) {
          if (r.status === 404) {
            // resource not ready — continue polling
            console.log('[poll] 404, continuing', { jobId: jid })
          } else {
            throw new Error(`status ${r.status}`)
          }
        } else {
          const data: any = await r.json()
          const job: JobResponse & any = data.job || data
          if (!job) return
          // Normalize status and extract result/final path
          const state = String(job.status || job.phase || '').toLowerCase()
          const progress = typeof job.progress === 'number' ? job.progress : (job.progressPercent || job.percentage || null)
          const resultUrl = job.resultUrl || job.result?.videoUrl || job.result?.url || job.outputUrl || job.finalVideoPath || job.result?.videoURL
          const finalVideoPath = job.finalVideoPath || job.outputUrl || null
          // logging each poll
          try { console.log('[poll] response', { jobId: jid, status: state, progress, resultUrl: !!resultUrl, finalVideoPath: !!finalVideoPath }) } catch (_) {}

          setJobResp(job)

          // update progress
          if (typeof progress === 'number') {
            const raw = progress
            const frac = raw > 1 ? Math.min(1, raw / 100) : Math.max(0, raw)
            setOverallProgress(frac)
            try {
              if (frac > 0 && jobStartRef.current) {
                const elapsedSec = (Date.now() - jobStartRef.current) / 1000
                const totalEstSec = Math.max(1, elapsedSec / frac)
                const remaining = Math.max(0, Math.round(totalEstSec - elapsedSec))
                setOverallEtaSec(remaining)
              }
            } catch (_) {}
          }

          // Terminal handling: completed/failed
          if (state === 'done' || state === 'complete') {
            // If result URL or final path not present yet, keep polling until it appears
            if (!resultUrl && !finalVideoPath) {
              console.log('[poll] completed but missing result URL — continuing to poll', { jobId: jid })
            } else {
              setOverallProgress(1)
              setOverallEtaSec(0)
              setStatus('done')
              if (resultUrl) {
                setJobResp((prev) => ({ ...(prev || {}), status: job.status || 'done', result: { videoUrl: resultUrl } }))
                setShowPreview(true)
                setPreviewUrl(resultUrl)
              }
              console.log('[poll] job completed - stopping poll', { jobId: jid })
              cancelled = true
              return
            }
          }

          if (state === 'error' || state === 'failed') {
            const msg = job.errorMessage || job.error?.message || job.message
            setStatus('error')
            setErrorMessage(msg || 'Processing failed (no error message returned).')
            console.log('[poll] job failed - stopping poll', { jobId: jid, message: msg })
            cancelled = true
            return
          }

          // Map backend states to UI states (lowercase-comparison)
          const map: Record<string, Status> = {
            queued: 'analyzing',
            analyzing: 'analyzing',
            hook: 'hook',
            cutting: 'cutting',
            pacing: 'pacing',
            rendering: 'rendering',
            uploading: 'uploading_result',
            error: 'error',
          }
          setStatus(map[state] || 'analyzing')
        }
      } catch (e: any) {
        console.warn('[poll] fetch error', e)
        // continue polling on transient errors
      }

      if (!cancelled) {
        const elapsed = Date.now() - startAt
        if (elapsed > MAX_MS) {
          setErrorMessage('Processing timed out. Please try again.')
          setStatus('error')
          console.log('[poll] timed out', { jobId: jid })
          cancelled = true
          return
        }
        pollRef.current = window.setTimeout(tick, POLL_MS) as unknown as number
      }
    }

    tick()
    return () => { cancelled = true; if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null } }
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
        const fullUrl = `/api/jobs/${jid}`
        try { console.log('[startPollingFallback] GET', fullUrl) } catch (_) {}
        const r = await apiFetch(fullUrl)
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
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('ae:lastCelebratedJobId') : null
      if (stored) setLastCelebratedJobId(stored)
    } catch (e) {}

    // On mount, restore last job id if present and resume polling
    try {
      const last = typeof window !== 'undefined' ? localStorage.getItem('ae:lastJobId') : null
      if (last && !jobId) {
        setJobId(last)
        // resume polling for restored job id
        startPollingJob(last)
      }
    } catch (e) {}

    if (status === 'done' && jobId) {
      setShowPreview(true);
    }
  }, [status, jobId])

  // open completion modal once per job when a final result URL exists
  // NOTE: do not automatically open the modal here — the modal should only
  // appear after the user initiates a successful download. We still record
  // the last celebrated job id to avoid repeating celebrations.
  useEffect(() => {
    try {
      const url = jobResp?.result?.videoUrl || previewUrl
      if (!url || !jobId) return
      if (lastCelebratedJobId === jobId) return
      setLastCelebratedJobId(jobId)
      try { localStorage.setItem('ae:lastCelebratedJobId', jobId) } catch (e) {}
    } catch (e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobResp?.result?.videoUrl, previewUrl, jobId])

  // Direct download handler: redirect browser to backend download endpoint
  const handleDownload = (jid?: string) => {
    if (!jid) return
    // Prefer direct result URL if available (or final path)
    const resultUrl = jobResp?.result?.videoUrl || previewUrl || jobResp?.finalVideoPath || (jobResp as any)?.outputUrl
    if (resultUrl) {
      try { window.open(resultUrl, '_blank') } catch (e) { console.warn('Open result url failed', e) }
      return
    }
    // Fallback: use backend download endpoint proxied via Next.js
    const fullUrl = `/api/jobs/${jid}/download`
    try { console.log('[handleDownload] redirect to', fullUrl) } catch (_) {}
    try { setCompletionOpen(true); window.location.href = apiUrl(fullUrl) } catch (e) { console.warn('Download redirect failed', e) }
  }

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
    <div className="w-full max-w-6xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" className="h-8 w-8" alt="AutoEditor" />
          <div>
            <div className="text-lg font-semibold">AutoEditor</div>
            <div className="text-xs text-white/60">AI Video Editor</div>
          </div>
        </div>
        <div className="text-center text-xl font-semibold">Editor</div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 rounded-full bg-linear-to-br from-[#ff7ab6] to-[#7c3aed] text-white font-semibold shadow-lg">Upgrade</button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">U</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Create Edit */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Create Edit</div>
              <div className="text-2xl font-bold">Upload & Start</div>
            </div>
            <div className="text-sm text-white/50">MP4 • MOV • WEBM</div>
          </div>

          <div className="mt-6">
            <div
              onClick={openFilePicker}
              role="button"
              tabIndex={0}
              className="w-full rounded-2xl border-2 border-dashed border-white/8 p-8 flex flex-col items-center justify-center text-center hover:shadow-[0_12px_40px_rgba(124,58,237,0.12)] transition cursor-pointer"
            >
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
                hidden
                ref={fileInputRef}
                onChange={handleFileSelected}
              />
              <div className="text-white/80 font-semibold">Drag & drop or click to select a video</div>
              <div className="text-xs text-white/60 mt-2">Up to 1 GB</div>
            </div>

            {selectedFile && (
              <div className="mt-4 flex items-center justify-between bg-[rgba(255,255,255,0.02)] p-3 rounded-lg border border-white/6">
                <div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-xs text-white/60">{Math.round(selectedFile.size/1024/1024)} MB • {selectedFile.type || 'video'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleUploadButtonClick} disabled={isUploading || (status !== 'idle' && status !== 'done')} className={`px-5 py-2 rounded-full font-semibold transition ${isUploading || (status !== 'idle' && status !== 'done') ? 'bg-white/10 text-white/60 cursor-not-allowed' : 'bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white hover:-translate-y-0.5 shadow-lg'}`}>
                    {isUploading ? 'Uploading…' : (status === 'done' && jobResp?.result?.videoUrl ? 'Start New Edit' : 'Start Edit')}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <details className="text-sm text-white/70">
                <summary className="cursor-pointer">Advanced settings</summary>
                <div className="mt-3 text-xs text-white/60">
                  <label className="flex items-center gap-2"><input id="v2-smartzoom" type="checkbox" checked={smartZoom} onChange={(e)=>setSmartZoom(e.target.checked)} className="h-4 w-4" /> Smart Zoom (recommended)</label>
                </div>
              </details>
            </div>
          </div>
        </Card>

        {/* Right column: Job Status */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Job Status</div>
              <div className="text-lg font-semibold">Live</div>
            </div>
            <StatusPill status={status} />
          </div>

          <div className="mt-4">
            <div className="mb-4">
              <ProgressBar value={(jobResp?.progress ?? overallProgress) as any} />
              <div className="flex items-center justify-between text-xs text-white/60 mt-2">
                <div>{Math.round(((jobResp?.progress ?? overallProgress) || 0) * 100)}%</div>
                <div>{overallEtaSec ? `${overallEtaSec}s remaining` : ''}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
              <div>
                <div className="text-xs">Detected length</div>
                <div className="font-medium text-white/90">{detectedDurationSec ? `${Math.round(detectedDurationSec)}s` : '—'}</div>
              </div>
              <div>
                <div className="text-xs">Estimated time</div>
                <div className="font-medium text-white/90">{overallEtaSec ? `${overallEtaSec}s` : '—'}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-white/60">Current step</div>
              <div className="font-medium text-white/90 mt-1">{jobResp?.status || status}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-white/60">Recent steps</div>
              <div className="mt-2">
                <Timeline steps={[jobResp?.message || '', String(jobResp?.status || ''), ...(jobResp?.segments?.map((s:any)=>s.reason || `${s.start}-${s.end}`) || [])].filter(Boolean)} />
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-red-600/20 border border-red-600 text-sm flex items-center justify-between">
                <div className="text-red-200">{errorMessage}</div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>{ try { navigator.clipboard.writeText(String(errorMessage)) } catch(_){} }} className="px-3 py-1 rounded-full bg-white/6">Copy</button>
                  <button onClick={()=>{ reset() }} className="px-3 py-1 rounded-full bg-white/6">Try again</button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-white/60">Recent Jobs</div>
              <div className="text-lg font-semibold">Last jobs</div>
            </div>
          </div>
          <JobsTable onView={(id)=>{ router.push(`/jobs/${id}`) }} onDownload={(id)=>handleDownload(id)} />
        </Card>
      </div>
    </div>
  )

  if (compact) return card

  return (
    <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center p-6">
      {card}

      {/* Mobile sticky start bar */}
      <div className="md:hidden">
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-[rgba(255,255,255,0.02)] p-3 rounded-2xl flex items-center justify-between border border-white/6">
            <div className="text-sm text-white/80">{selectedFile ? selectedFile.name : 'Ready to upload'}</div>
            <div>
              <button onClick={handleUploadButtonClick} disabled={isUploading || (status !== 'idle' && status !== 'done')} className={`px-5 py-2 rounded-full font-semibold transition ${isUploading || (status !== 'idle' && status !== 'done') ? 'bg-white/10 text-white/60 cursor-not-allowed' : 'bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white shadow-lg'}`}>
                {isUploading ? 'Uploading…' : (status === 'done' && jobResp?.result?.videoUrl ? 'Start New' : 'Start Edit')}
              </button>
            </div>
          </div>
        </div>
      </div>

      

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl bg-[#07090f] p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="text-white font-semibold">Preview</div>
              <button onClick={() => setShowPreview(false)} className="text-white/60">Close</button>
            </div>
            <div>
              {previewLoading ? (
                <div className="text-white/60">Loading preview…</div>
              ) : previewError ? (
                <div className="text-red-400">{previewError}</div>
              ) : previewUrl ? (
                <video src={previewUrl} controls autoPlay className="w-full rounded-md bg-black" />
              ) : jobResp?.result?.videoUrl ? (
                <video src={jobResp.result.videoUrl} controls autoPlay className="w-full rounded-md bg-black" />
              ) : (
                <div className="text-white/60">No preview available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {completionOpen && jobId && (
        <CompletionModal
          isOpen={completionOpen}
          jobId={jobId}
          previewUrl={jobResp?.result?.videoUrl || previewUrl}
          onClose={handleModalClose}
          onDownload={handleModalDownload}
        />
      )}
    </div>
  )
}
