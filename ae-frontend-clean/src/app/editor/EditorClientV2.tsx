"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import EditorShell from '@/components/editor-v2/EditorShell'
import EditorHeader from '@/components/editor-v2/EditorHeader'
import TopToolbar from '@/components/editor-v2/TopToolbar'
import LeftMediaPanel from '@/components/editor-v2/LeftMediaPanel'
import CenterPreviewPanel from '@/components/editor-v2/CenterPreviewPanel'
import TimelinePanel from '@/components/editor-v2/TimelinePanel'
import RightInspectorPanel from '@/components/editor-v2/RightInspectorPanel'
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

type Status = 'idle' | 'uploading' | 'analyzing' | 'selecting' | 'rendering' | 'done' | 'error' | 'hook_selecting' | 'cut_selecting' | 'pacing'

export default function EditorClientV2() {
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

      // start polling job status from backend
      startJobListening(jid)
    } catch (e: any) {
      console.error(e)
      setErrorMessage(e?.message || 'Upload failed')
      setStatus('error')
    }
  }

  const startJobListening = (jid: string) => {
    if (!jid) return
    // Clear any existing poll
    try { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } } catch (_) {}

    const tick = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/jobs/${jid}`)
        if (!r.ok) {
          if (r.status === 404) {
            // Job not found yet; keep polling
            return
          }
          console.warn(`[poll:${jid}] received ${r.status}`)
          return
        }
        const job = await r.json()
        if (!job) return
        // Map backend job fields to UI
        applyJobUpdate({ progress: job.progress, status: job.status, overallProgress: job.overallProgress, phase: job.phase, ...job })
        const st = String(job.status || '').toLowerCase()
        if (st === 'done' || st === 'error') {
          if (pollRef.current) { try { clearInterval(pollRef.current) } catch (_) {} ; pollRef.current = null }
        }
      } catch (e) {
        console.warn('[poll] fetch error', e)
      }
    }

    // immediate tick then interval
    tick()
    pollRef.current = setInterval(tick, 2000) as unknown as number
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

    if (typeof d.progress === 'number') setOverallProgress(Math.max(0, Math.min(1, d.progress)))
    else if (typeof d.overallProgress === 'number') setOverallProgress(Math.max(0, Math.min(1, d.overallProgress)))
    if (typeof d.overallEtaSec === 'number') setOverallEtaSec(d.overallEtaSec)
    if (typeof d.detectedDurationSec === 'number') setDetectedDurationSec(d.detectedDurationSec)
    if (Array.isArray(d.clips)) setClips(d.clips)

    const statusNow = String(d?.status || d?.phase || '').toLowerCase()
    if (statusNow === 'done') {
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

    if (statusNow === 'error') {
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
    <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl p-6">
        <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(7,9,15,0.6),rgba(7,9,15,0.5))] p-6 backdrop-blur-md">
          <h2 className="text-xl font-semibold mb-4">Editor Pipeline</h2>

          <div className="mb-6">
            <PipelineStepper current={status} />
          </div>

          <div className="p-4 rounded-lg bg-white/2 border border-white/6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/70">Status</div>
                <div className="font-semibold text-white">{status}</div>
                <div className="text-xs text-white/60 mt-1">Job: {jobId || '—'}</div>
              </div>

              <div className="text-right">
                <div className="text-sm text-white/70">Progress</div>
                <div className="text-lg font-semibold text-white">{Math.round((overallProgress || 0) * 100)}%</div>
                <div className="text-xs text-white/60 mt-1">{overallEtaSec ? `${Math.round(overallEtaSec)}s ETA` : ''}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={reset} className="px-3 py-2 bg-red-600 rounded">Reset</button>
          </div>
        </div>
      </div>
    </div>
  )
}
