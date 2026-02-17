"use client"

import React from 'react'
import EditorClientV2Modern from '@/components/editor/EditorClientV2Modern'

export default function EditorClientV2({ compact }: { compact?: boolean } = {}) {
  return <EditorClientV2Modern compact={compact} />
}

  const loggedJobsRef = useRef<Record<string, boolean>>({})
  const missingResultRetriesRef = useRef<Record<string, number>>({})

  const startPollingJob = (jid: string) => {
    if (!jid) return
    try { if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null } } catch (_) {}
    let cancelled = false
    const POLL_MS = 2500
    const startAt = Date.now()
    const MAX_MS = 10 * 60 * 1000 // 10 minutes
    // Backoff settings for server errors: 20s, 40s, 60s max
    let backoffMs = 20000
    const BACKOFF_STEP = 20000
    const BACKOFF_MAX = 60000
    let inBackoff = false

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
            // Non-2xx (server error or other) — enter backoff retry
            try { console.warn('[poll] non-2xx response, entering backoff', { jobId: jid, status: r.status }) } catch (_) {}
            setErrorMessage('Server unavailable — retrying...')
            inBackoff = true
            // schedule next retry with exponential backoff
            const waitMs = backoffMs
            backoffMs = Math.min(BACKOFF_MAX, backoffMs + BACKOFF_STEP)
            if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null }
            pollRef.current = window.setTimeout(tick, waitMs) as unknown as number
            return
          }
        } else {
          // successful response — clear backoff state and any server-error message
          if (inBackoff) {
            inBackoff = false
            backoffMs = 20000
          }
          if (errorMessage === 'Server unavailable — retrying...') {
            try { setErrorMessage(undefined) } catch (_) {}
          }
        }
        if (r.ok) {
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
          if (state === 'done' || state === 'complete' || state === 'completed') {
            // If result URL/final path not present, retry a few times then stop (old job)
            if (!resultUrl && !finalVideoPath) {
              const prev = missingResultRetriesRef.current[jid] || 0
              missingResultRetriesRef.current[jid] = prev + 1
              console.log('[poll] completed but missing result URL — retry', { jobId: jid, attempt: missingResultRetriesRef.current[jid] })
              if (missingResultRetriesRef.current[jid] >= 3) {
                // Stop polling and show warning — likely an old job without downloadable result
                setStatus('completed')
                setErrorMessage('Completed but no download link (old job)')
                console.log('[poll] stopping poll after retries for missing resultUrl', { jobId: jid })
                cancelled = true
                return
              }
              // allow normal polling to continue for a few more attempts
            } else {
              setOverallProgress(1)
              setOverallEtaSec(0)
              setStatus('completed')
              if (resultUrl) {
                setJobResp((prev) => ({ ...(prev || {}), status: job.status || 'completed', result: { videoUrl: resultUrl } }))
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
            queued: 'processing',
            processing: 'processing',
            analyzing: 'analyzing',
            hook: 'hook',
            cutting: 'cutting',
            pacing: 'pacing',
            rendering: 'rendering',
            uploading: 'uploading_result',
            done: 'completed',
            complete: 'completed',
            completed: 'completed',
            error: 'error',
          }
          setStatus(map[state] || 'processing')
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
    if (st === 'done' || st === 'complete' || st === 'completed') {
      setStatus('completed')
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

    // On mount, restore last job id if present but DO NOT auto-start polling.
    try {
      const last = typeof window !== 'undefined' ? localStorage.getItem('ae:lastJobId') : null
      if (last && !jobId) {
        setJobId(last)
        // Important: do NOT resume polling automatically. User must click View or Start Edit.
      }
    } catch (e) {}

    if ((status === 'done' || status === 'completed') && jobId) {
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
    try {
      // Log signed URL body for debugging
      const r = await fetch(`/api/jobs/${jid}/output-signed-url`)
      const data = await r.json().catch(() => ({}))
      console.log('[output-signed-url]', r.status, data)
    } catch (e) {
      console.warn('[output-signed-url] fetch failed', e)
    }
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
                    {isUploading ? 'Uploading…' : ((status === 'done' || status === 'completed') && jobResp?.result?.videoUrl ? 'Start New Edit' : 'Start Edit')}
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
              <ProgressBar value={normalizeProgress(jobResp?.progress ?? overallProgress, (jobResp as any)?.status || status, jobId)} />
              <div className="flex items-center justify-between text-xs text-white/60 mt-2">
                <div>{normalizeProgress(jobResp?.progress ?? overallProgress, (jobResp as any)?.status || status, jobId)}%</div>
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
              
      </div>

      <div className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-white/60">Recent Jobs</div>
              <div className="text-lg font-semibold">Last jobs</div>
            </div>
          </div>
          <JobsTable onView={(id)=>{ try { setJobId(id); startPollingJob(id) } catch(_) { router.push(`/jobs/${id}`) } }} onDownload={(id)=>handleDownload(id)} />
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
                {isUploading ? 'Uploading…' : ((status === 'done' || status === 'completed') && jobResp?.result?.videoUrl ? 'Start New' : 'Start Edit')}
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
