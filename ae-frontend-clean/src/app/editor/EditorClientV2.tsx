"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import PipelineStepper from '@/components/editor-v2/PipelineStepper'
import ProgressBar from '@/components/ProgressBar'
import JobDetails from '@/components/editor/JobDetails'
import SubscriptionCard from '@/components/subscription/SubscriptionCard'
import NotificationPopup from '@/components/NotificationPopup'
import PremiumLoader from '@/components/PremiumLoader'
import ProcessingCard from '@/components/editor-v2/ProcessingCard'
import CompletionModal from '@/components/CompletionModal'
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
// Use proxy path for backend requests to avoid CORS; browser should call Next.js proxy
const PROXY_PREFIX = '/api/proxy'
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
    const path = `${PROXY_PREFIX}/api/jobs/${encodeURIComponent(jobId)}`
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
      try { console.log('[upload] start', { apiUrl: PROXY_PREFIX, fileName: selectedFile.name, fileSize: selectedFile.size }) } catch (_) {}
      createJobWithFile(selectedFile)
      return
    }
    // No file yet — open file picker
    try { setErrorMessage('Please select a file to upload') } catch (_) {}
    try { console.error('[upload] no file selected') } catch (_) {}
    openFilePicker()
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
      // Log upload start and file metadata
      try { console.log('[upload] start', { apiProxy: PROXY_PREFIX, fileName: file?.name, fileSize: file?.size }) } catch (_) {}

      // STEP 1: Request signed upload URL from backend via proxy
      try { console.log('[upload] requesting signed URL') } catch (_) {}
      const signedResp = await apiFetch(`${PROXY_PREFIX}/api/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      })
      try { console.log('[upload] signed URL request status', signedResp.status) } catch (_) {}
      if (!signedResp.ok) {
        const txt = await signedResp.text().catch(()=>'')
        throw new Error(`Signed URL request failed: ${signedResp.status} ${txt}`)
      }
      const signedJson: any = await signedResp.json().catch(()=>({}))
      const uploadUrl: string | undefined = signedJson?.uploadUrl || signedJson?.url
      const storagePath: string | undefined = signedJson?.storagePath || signedJson?.path
      if (!uploadUrl || !storagePath) {
        throw new Error('Signed URL response missing uploadUrl or storagePath')
      }
      try { console.log('[upload] signed URL received') } catch (_) {}

      // STEP 2: Upload directly to storage using PUT (do NOT proxy the file body)
      try { console.log('[upload] uploading directly to storage') } catch (_) {}
      const putResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      try { console.log('[upload] upload complete', putResp.status) } catch (_) {}
      if (!putResp.ok) {
        const txt = await putResp.text().catch(()=>'')
        throw new Error(`Direct upload failed: ${putResp.status} ${txt}`)
      }

      // STEP 3: Create job pointing to storagePath
      try { console.log('[jobs] creating job') } catch (_) {}
      const jobsResp = await apiFetch(`${PROXY_PREFIX}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, originalFileName: file.name, fileSize: file.size }),
      })
      try { console.log('[jobs] /api/jobs status', jobsResp.status) } catch (_) {}
      const jobJson: any = await jobsResp.json().catch(()=>({}))
      try { console.log('[jobs] /api/jobs json', jobJson) } catch (_) {}
      if (!jobsResp.ok) {
        throw new Error(jobJson?.error || `Job creation failed: ${jobsResp.status}`)
      }
      const jid = jobJson.jobId || jobJson.jobID || jobJson.id || jobJson?.id
      setJobId(jid)
      jobStartRef.current = Date.now()
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

  const loggedJobsRef = useRef<Record<string, boolean>>({})

  const startPollingJob = (jid: string) => {
    if (!jid) return
    try { if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null } } catch (_) {}
    let cancelled = false
    let backoff = 1000
    const startAt = Date.now()
    const MAX_MS = 10 * 60 * 1000 // 10 minutes

    const tick = async () => {
      if (cancelled) return
      try {
        const url = `${PROXY_PREFIX}/api/jobs/${encodeURIComponent(jid)}`
          const r = await apiFetch(url)
        if (!r.ok) {
          if (r.status === 404) {
            // resource not ready — continue polling
          } else {
            throw new Error(`status ${r.status}`)
          }
        } else {
          const data: any = await r.json()
          const job: JobResponse & any = data.job || data
          if (!job) return
          setJobResp(job)

          // Log full response once when job is not 'processing'
          const state = String(job.status || job.phase || '').toLowerCase()
          if (state !== 'processing' && !loggedJobsRef.current[jid]) {
            try { console.error('Job failed / updated:', { jobId: jid, job }) } catch (_) {}
            loggedJobsRef.current[jid] = true
          }

          // Normalize and update progress
          if (typeof job.progress === 'number') {
            const raw = job.progress
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

          // Terminal states: done / complete / failed / error
          if (state === 'done' || state === 'complete') {
            setOverallProgress(1)
            setOverallEtaSec(0)
            setStatus('done')
            const resultUrl = job.resultUrl || job.result?.videoUrl || job.result?.url || job.result?.videoURL
            if (resultUrl) {
              setJobResp((prev) => ({ ...(prev || {}), status: job.status || 'done', result: { videoUrl: resultUrl } }))
              setShowPreview(true)
              setPreviewUrl(resultUrl)
            }
            cancelled = true
            return
          }

          if (state === 'error' || state === 'failed') {
            const msg = job.errorMessage || job.error?.message || job.message
            setStatus('error')
            setErrorMessage(msg || 'Processing failed (no error message returned).')
            cancelled = true
            return
          }

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
        // transient network error — continue polling with backoff until timeout
      }

      if (!cancelled) {
        const elapsed = Date.now() - startAt
        if (elapsed > MAX_MS) {
          setErrorMessage('Processing timed out. Please try again.')
          setStatus('error')
          cancelled = true
          return
        }
        const wait = Math.min(10000, backoff)
        backoff = Math.min(10000, Math.round(backoff * 2))
        pollRef.current = window.setTimeout(tick, wait) as unknown as number
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
        const fullUrl = `${PROXY_PREFIX}/api/jobs/${jid}`
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

    if (status === 'done' && jobId) {
      setShowPreview(true);
    }
  }, [status, jobId])

  // open completion modal once per job when a final result URL exists
  useEffect(() => {
    try {
      const url = jobResp?.result?.videoUrl || previewUrl
      if (!url || !jobId) return
      if (lastCelebratedJobId === jobId) return
      // open modal and persist celebrated job id
      setCompletionOpen(true)
      setLastCelebratedJobId(jobId)
      try { localStorage.setItem('ae:lastCelebratedJobId', jobId) } catch (e) {}
    } catch (e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobResp?.result?.videoUrl, previewUrl, jobId])

  // Direct download handler: redirect browser to backend download endpoint
  const handleDownload = (jid?: string) => {
    if (!jid) return
    // Prefer direct result URL if available
    const resultUrl = jobResp?.result?.videoUrl || previewUrl
    if (resultUrl) {
      try { window.open(resultUrl, '_blank') } catch (e) { console.warn('Open result url failed', e) }
      return
    }
    // Fallback: use backend download endpoint proxied via Next.js
    const fullUrl = `${PROXY_PREFIX}/api/jobs/${jid}/download`
    try { console.log('[handleDownload] redirect to', fullUrl) } catch (_) {}
    try { window.location.href = fullUrl } catch (e) { console.warn('Download redirect failed', e) }
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
    <div className="w-full max-w-2xl p-6">
      <div className={`rounded-3xl border border-white/6 bg-[linear-gradient(180deg,rgba(7,9,15,0.65),rgba(7,9,15,0.5))] p-6 backdrop-blur-xl shadow-[0_24px_60px_rgba(2,6,23,0.6)]`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Editor Pipeline</h2>
            <div className="text-xs text-white/60 mt-1">Retention-first AI editing</div>
          </div>
        </div>

        <div className="mb-4">
          <PipelineStepper current={status} />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: upload + original preview */}
          <div className="col-span-7 space-y-4">
            <div className="p-6 rounded-[20px] bg-[rgba(255,255,255,0.02)] border border-white/6 hover:shadow-[0_12px_40px_rgba(124,58,237,0.06)] transition">
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
                  onClick={handleUploadButtonClick}
                  disabled={isUploading || (status !== 'idle' && status !== 'done')}
                  className={`px-4 py-2 rounded-full font-semibold transition shadow-md ${isUploading || (status !== 'idle' && status !== 'done') ? 'bg-white/10 text-white/60 cursor-not-allowed' : 'bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white hover:shadow-[0_8px_30px_rgba(124,58,237,0.24)]'}`}
                >
                  {isUploading ? 'Uploading…' : (status === 'done' && jobResp?.result?.videoUrl ? 'Upload New' : 'Upload')}
                </button>

                {status === 'done' && (jobResp?.result?.videoUrl || jobId) && (
                  <button onClick={() => handleDownload(jobId)} className="px-4 py-2 rounded-full bg-white text-black font-semibold shadow-md hover:scale-[1.02]">Download</button>
                )}

                <button onClick={reset} className="px-3 py-2 rounded-full border border-white/12 text-white/80 hover:bg-white/6 transition">Reset</button>
              </div>

              <div className="mt-3 text-xs text-white/60">Tips: MP4/MOV/WEBM supported — up to 1 GB.</div>
              <div className="mt-3 flex items-center gap-2">
                <input id="v2-smartzoom" type="checkbox" checked={smartZoom} onChange={(e)=>setSmartZoom(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="v2-smartzoom" className="text-xs text-white/80">Smart Zoom (recommended)</label>
              </div>
            </div>

            <div className="p-4 rounded-[20px] bg-[rgba(255,255,255,0.02)] border border-white/6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70">Original</div>
                <div className="text-xs text-white/50 px-2 py-1 rounded-full bg-white/6">Original</div>
              </div>
              <div className="mt-3 rounded-md overflow-hidden bg-black/60 h-44 flex items-center justify-center">
                {originalUrl ? (
                  <video src={originalUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <div className="text-sm text-white/60">No file selected — thumbnail preview will appear here</div>
                )}
              </div>
            </div>
          </div>

          {/* Right: progress, result preview, details */}
          <div className="col-span-5 space-y-4">
              <ProcessingCard
                status={status}
                overallProgress={(jobResp?.progress ?? overallProgress) as any}
                detectedDurationSec={detectedDurationSec}
                overallEtaSec={overallEtaSec}
                jobId={jobId}
                jobResp={jobResp}
                fileName={selectedFile ? selectedFile.name : jobResp?.result?.filename}
                smartZoom={smartZoom}
                errorMessage={errorMessage}
              />
            <div className="p-4 rounded-[20px] bg-[rgba(255,255,255,0.02)] border border-white/6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70">Result</div>
                <div className="text-xs text-white/50 px-2 py-1 rounded-full bg-white/6">Rendered</div>
              </div>
              <div className="mt-3">
                {status === 'done' && (jobResp?.result?.videoUrl || previewUrl) ? (
                  <div className="rounded-md overflow-hidden bg-black/60">
                    <video src={jobResp?.result?.videoUrl || previewUrl} controls className="w-full h-40 object-cover" />
                    <div className="p-3 flex items-center justify-between">
                      <div className="text-sm text-white/80">Rendered output</div>
                      <div>
                        <button onClick={() => setShowPreview(true)} className="px-3 py-1 rounded-full bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white font-semibold">Open</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-white/60">Preview will be available when processing completes</div>
                )}
              </div>
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
