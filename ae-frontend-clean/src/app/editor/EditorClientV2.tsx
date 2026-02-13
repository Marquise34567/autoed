"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import EditorShell from '@/components/editor-v2/EditorShell'
import EditorHeader from '@/components/editor-v2/EditorHeader'
import VideoAnalysisPanel from '@/components/editor-v2/VideoAnalysisPanel'
import GlassCard from '@/components/GlassCard'
import UploadCTA from '@/components/editor-v2/UploadCTA'
import PipelineStepper from '@/components/editor-v2/PipelineStepper'
import ProgressPanel from '@/components/editor-v2/ProgressPanel'
import OutputPanel from '@/components/editor-v2/OutputPanel'
import ErrorPanel from '@/components/editor-v2/ErrorPanel'
import SubscriptionCard from '@/components/subscription/SubscriptionCard'
import NotificationPopup from '@/components/NotificationPopup'
import { planFeatures } from '@/lib/plans'
import { uploadVideoToStorage } from '@/lib/client/storage-upload'
import { auth, db as firestore } from '@/lib/firebase.client'
import { useAuth } from '@/lib/auth/useAuth'
import { requirePremium } from '@/lib/subscription'
import { useRouter } from 'next/navigation'
import { safeJson } from '@/lib/client/safeJson'
import { API_BASE } from '@/lib/api'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getOrCreateUserDoc } from '@/lib/safeUserDoc'

type Status = 'idle' | 'uploading' | 'analyzing' | 'selecting' | 'rendering' | 'done' | 'error' | 'hook_selecting' | 'cut_selecting' | 'pacing'

export default function EditorClientV2() {
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

  async function startEditorPipeline(file: File) {
    if (!authReady) {
      console.warn('[pipeline] auth not ready; aborting start')
      try { setErrorMessage('Waiting for authentication; please try again') } catch (_) {}
      return
    }
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
      await handleFile(file)
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
    const data = await safeJson(resp)
    if (!resp.ok) {
      throw new Error(data?.error || 'Failed to generate download URL')
    }
    if (!data?.url) throw new Error('Missing download URL')
    return data.url as string
  }

  const openDownloadInNewTab = async () => {
    try {
      const url = await fetchDownloadUrl()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      console.error(e)
      try { alert(e?.message || 'Failed to open download') } catch (_) {}
    }
  }
  const triggerDownload = async () => {
    try {
      const url = await fetchDownloadUrl()
      window.location.href = url
    } catch (e: any) {
      console.error(e)
      try { alert(e?.message || 'Failed to download') } catch (_) {}
    }
  }

  const copyDownloadLink = async () => {
    try {
      const url = await fetchDownloadUrl()
      await navigator.clipboard.writeText(url)
    } catch (e: any) {
      console.error(e)
      try { alert(e?.message || 'Failed to copy link') } catch (_) {}
    }
  }

  useEffect(()=>{
    let unsub = () => {}
    try {
      unsub = auth.onAuthStateChanged(async (u)=>{
        if (!u) { setUserDoc(null); return }
                  try {
                    const userData = await getOrCreateUserDoc(u.uid)
                    if (userData) setUserDoc(userData)
                    else setUserDoc({ uid: u.uid, plan: 'free', rendersLimit: 12, rendersUsed: 0 })
                  } catch (e) {
                    console.warn('failed to load or create user doc', e)
                    setUserDoc({ uid: u.uid, plan: 'free', rendersLimit: 12, rendersUsed: 0 })
                  }
      })
    } catch (e) {
      console.warn('auth listener failed', e)
    }
    return ()=>{ try { unsub() } catch (_) {} }
  }, [])

  function openFilePicker() {
    console.log('[upload] button clicked')
    if (!fileInputRef.current) {
      console.error('[upload] fileInputRef is null — input not mounted or ref not attached')
      try { alert('Unable to open file picker — please reload the page and try.') } catch (_) {}
      return
    }
    try { if (fileInputRef.current) fileInputRef.current.value = '' } catch (_) {}
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    console.log('[upload] selected:', f.name, f.type)

    const extOk = /\.mp4$/i.test(f.name) || /\.mov$/i.test(f.name) || /\.mkv$/i.test(f.name)
    const mimeOk = f.type === 'video/mp4' || f.type === 'video/quicktime' || f.type === 'video/x-matroska'

    if (!extOk && !mimeOk) {
      setErrorMessage('Only MP4, MOV, and MKV files are supported. Please select a supported file type.')
      setStatus('error')
      e.currentTarget.value = ''
      return
    }

    setErrorMessage(undefined)
    const input = e.currentTarget
    try { input.value = '' } catch (_) {}
    await startEditorPipeline(f)
  }

  useEffect(() => {
    if (status === 'analyzing' && overallProgress === 0) {
      setOverallProgress(0.01)
    }
  }, [status])

  const handleFile = async (file?: File) => {
    if (!file) return
    setErrorMessage(undefined)
    setStatus('uploading')
    setOverallProgress(0)

    try {
      const onProgress = (pct: number) => setOverallProgress(pct / 100 * 0.2)
      const { storagePath } = await uploadVideoToStorage(file, onProgress)

      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Not signed in')
      const idToken = await currentUser.getIdToken()

      setStatus('analyzing')
      setOverallProgress(0.25)
      const createResp = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ path: storagePath }),
      })
      const createJson = await safeJson(createResp)
      const jid = createJson.jobId
      setJobId(jid)

      startJobListening(jid, async () => {
        try {
          const u = auth.currentUser
          return u ? await u.getIdToken() : null
        } catch (e) { return null }
      })
    } catch (e: any) {
      console.error(e)
      setErrorMessage(e?.message || 'Upload failed')
      setStatus('error')
    }
  }

  const startJobListening = (jid: string, getTokenForSSE?: () => Promise<string | null>) => {
    if (!jid) return
    try {
      if (esRef.current) {
        try { esRef.current.close() } catch (_) {}
        esRef.current = null
      }
      let retries = 0
      const maxRetries = 5
      const backoffs = [500, 1000, 2000, 4000, 8000]
      const lastMessageAt = { current: Date.now() }
      const receivedAny = { current: false }
      let reconnectTimer: number | null = null
      let livenessTimer: number | null = null

      const connect = async () => {
        if (esRef.current) try { esRef.current.close() } catch (_) {}
        let url = `${API_BASE}/api/jobs/${jid}/events`
        if (process.env.NODE_ENV === 'development') {
          try {
            const token = await (typeof getTokenForSSE === 'function' ? getTokenForSSE() : null)
            if (token) url += `?token=${encodeURIComponent(token)}`
          } catch (_) {}
        }
        if (process.env.NODE_ENV === 'development') console.log(`[sse:${jid}] connecting to ${url} (attempt ${retries + 1})`)
        const es = new EventSource(url)
        esRef.current = es

        es.onmessage = (ev) => {
          if (process.env.NODE_ENV === 'development') console.log(`[sse:${jid}] message`, ev.data)
          lastMessageAt.current = Date.now()
          receivedAny.current = true
          retries = 0
          try {
            const payload = JSON.parse(ev.data)
            const job = payload && (payload.job ?? payload)
            if (!job) return
            applyJobUpdate(job)

            const phase = String(job.phase || '').toLowerCase()
            const terminal = phase === 'done' || phase === 'error'
            if (terminal) {
              isTerminalRef.current = true
              try { es.close() } catch (_) {}
              esRef.current = null
              if (process.env.NODE_ENV === 'development') console.log(`[sse:${jid}] terminal phase received: ${phase}`)
            }
          } catch (e) {
            console.error('Invalid SSE data', e)
          }
        }

        es.onerror = (err) => {
          console.warn(`[sse:${jid}] EventSource error`, err)
          try { es.close() } catch (_) {}
          esRef.current = null

          if (isTerminalRef.current) {
            if (process.env.NODE_ENV === 'development') console.log(`[sse:${jid}] terminal - ignoring error`)
            return
          }

          if (retries < maxRetries) {
            const wait = backoffs[Math.min(retries, backoffs.length - 1)] || 1000
            if (process.env.NODE_ENV === 'development') console.log(`[sse:${jid}] scheduling reconnect in ${wait}ms`)
            reconnectTimer = setTimeout(() => { retries += 1; connect() }, wait) as unknown as number
          } else {
            if (!receivedAny.current) {
              console.error(`[sse:${jid}] retries exhausted and no messages received`)
              setErrorMessage('Connection to job stream failed')
              setStatus('error')
            } else {
              if (process.env.NODE_ENV === 'development') console.log(`[sse:${jid}] retries exhausted but messages were seen; falling back to polling`)
              startPollingFallback(jid)
            }
          }
        }

        if (livenessTimer) try { clearInterval(livenessTimer) } catch (_) {}
        livenessTimer = setInterval(() => {
          const since = Date.now() - (lastMessageAt.current || 0)
          if (since > 20000) {
            if (process.env.NODE_ENV === 'development') console.warn(`[sse:${jid}] no messages for ${since}ms — reconnecting`)
            try { es.close() } catch (_) {}
            esRef.current = null
            if (isTerminalRef.current) {
              if (process.env.NODE_ENV === 'development') console.log(`[sse:${jid}] terminal - skipping liveness reconnect`)
              return
            }
            if (reconnectTimer) try { clearTimeout(reconnectTimer) } catch (_) {}
            retries += 1
            if (retries <= maxRetries) connect()
          }
        }, 5000) as unknown as number
      }

      connect()
    } catch (e) {
      console.warn('[sse] failed to start, falling back to polling', e)
      startPollingFallback(jid)
    }
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
    const phaseRaw = d?.phase
    if (phaseRaw) {
      const p = String(phaseRaw).toLowerCase()
      if (p === 'error') setStatus('error')
      else if (p === 'done') setStatus('done')
      else setStatus(p as Status)
    }

    if (typeof d.overallProgress === 'number') setOverallProgress(Math.max(0, Math.min(1, d.overallProgress)))
    if (typeof d.overallEtaSec === 'number') setOverallEtaSec(d.overallEtaSec)
    if (typeof d.detectedDurationSec === 'number') setDetectedDurationSec(d.detectedDurationSec)
    if (Array.isArray(d.clips)) setClips(d.clips)

    const phaseNow = String(d?.phase || '').toLowerCase()
    if (phaseNow === 'done') {
      setOverallProgress(1)
      setShowPreview(true);
      (async () => {
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

    if (phaseNow === 'error') {
      setErrorMessage(d.error || d.message || 'Processing error')
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

  return (
    <EditorShell>
      <div className="min-h-screen flex items-start justify-center p-6">
        <div className="w-full max-w-7xl p-6 sm:p-8">
          <EditorHeader status={status} />
          <div className="h-px bg-white/6 my-3" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Editor panel */}
              <div className="lg:col-span-8">
                <GlassCard variant="inner" className="p-6">
                  <div className="mb-4">
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-matroska,.mp4,.mov,.mkv"
                      hidden
                      ref={fileInputRef}
                      onChange={handleFileSelected}
                    />
                    <UploadCTA onPickClick={openFilePicker} onFileChange={handleFileSelected} />
                  </div>

                  {/* Video analysis and editor content (kept intact) */}
                  <VideoAnalysisPanel status={status} overallProgress={overallProgress} detectedDurationSec={detectedDurationSec} />

                  <div className="mt-4">
                    <PipelineStepper current={status} />
                    <div className="mt-4">
                      <ProgressPanel pct={overallProgress} eta={overallEtaSec} />
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Right: Subscription Status panel */}
              <div className="lg:col-span-4">
                <GlassCard variant="inner" className="p-6">
                  <div className="w-full">
                    {userDoc ? (
                      <SubscriptionCard user={userDoc} />
                    ) : (
                      <div className="text-sm text-white/60">Subscription info unavailable</div>
                    )}
                  </div>
                </GlassCard>
              </div>
          </div>

          {userDoc && (
            <div className="mt-6">
              <div className="w-full rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 sm:p-6 backdrop-blur-lg shadow-2xl">
                <SubscriptionCard user={userDoc} />
              </div>
            </div>
          )}

          {popup && (
            <NotificationPopup title={popup.title} lines={popup.lines} onClose={() => setPopup(null)} />
          )}
        </div>
      </div>

      {/* Preview modal that pops up when download is ready */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-w-2xl w-full p-6 bg-linear-to-br from-[#071018]/80 via-[#0b0f14]/70 to-[#071018]/80 rounded-2xl border border-white/6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-xl font-semibold">Your download is ready</h3>
              <button className="text-white/60" onClick={()=>setShowPreview(false)}>Close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="md:col-span-2 bg-black/80 rounded overflow-hidden">
                {previewLoading && (
                  <div className="p-6 text-sm text-white/70">Generating secure preview linkâ€¦</div>
                )}
                {previewError && (
                  <div className="p-6 text-sm text-red-300">{previewError}</div>
                )}
                {previewUrl && !previewLoading && !previewError && (
                  <video src={previewUrl} controls className="w-full h-auto bg-black" />
                )}
              </div>

              <div className="md:col-span-1 flex flex-col gap-3">
                <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-white/6">
                  <div className="text-sm text-white/70">File</div>
                  <div className="text-md font-semibold text-white truncate">{clips[0]?.name || 'Edited video'}</div>
                  <div className="text-xs text-white/60 mt-1">{clips[0]?.duration ? `${Math.round(clips[0].duration)}s` : ''}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={triggerDownload}
                    className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white font-semibold shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4-4-4M21 21H3" />
                    </svg>
                    Download file
                  </button>

                  <button
                    onClick={copyDownloadLink}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/6 text-white"
                  >
                    Copy download link
                  </button>

                  <button onClick={()=>setShowPreview(false)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-transparent border border-white/6 text-white/70">Done</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </EditorShell>
  )
}
