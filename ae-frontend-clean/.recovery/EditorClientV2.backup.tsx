"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
// PipelineStepper removed
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

  // ... (backup contains full original file; trimmed here in backup copy)
}
