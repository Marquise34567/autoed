"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PendingSubscriptionBanner } from "@/components/PendingSubscriptionBanner";
import EditorControls from "@/components/editor/EditorControls";
import SubscriptionCard from "@/components/SubscriptionCard";
import ProgressStepper from "@/components/editor/ProgressStepper";
import UpgradeModal from "@/components/UpgradeModal";
import CompletionModal from '@/components/CompletionModal';
import PremiumBadge from '@/components/PremiumBadge';
import {
  AnalyzeResult,
  CandidateSegment,
  GeneratedClip,
  GenerateSettings,
  ManualFacecamCrop,
} from "@/lib/types";
import { getPlan } from "@/config/plans";
import type { PlanId } from "@/config/plans";
import { trackPostHogEvent, trackPlausibleEvent } from "@/lib/analytics/client";
import { uploadVideoToStorage } from "@/lib/client/storage-upload";
import { safeJson } from '@/lib/client/safeJson';
import { API_BASE as CENTRAL_API_BASE } from '@/lib/api';
import { apiFetch } from '@/lib/client/apiClient'
import { apiUrl } from '@/lib/apiBase'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || CENTRAL_API_BASE
import { initFetchGuard } from '@/lib/client/fetch-guard';
import { auth } from '@/lib/firebase.client';
initFetchGuard();

// Temporary type stubs for missing server types
type JobStatusResponse = any
type BillingStatus = any

const creatorId = "default";

const steps = [
  "Queued",
  "Analyzing",
  "Enhancing audio",
  "Draft render",
  "Final render",
  "Done",
];

const statusToStep: Record<string, number> = {
  QUEUED: 0,
  ANALYZING: 1,
  ENHANCING_AUDIO: 2,
  RENDERING_DRAFT: 3,
  DRAFT_READY: 3,
  RENDERING_FINAL: 4,
  DONE: 5,
  FAILED: 5,
};

export default function EditorPage() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
  const [title, setTitle] = useState("Creator sprint cut");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateSegment[]>([]);
  const [primaryClip, setPrimaryClip] = useState<GeneratedClip | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);
  const [analyzeEta, setAnalyzeEta] = useState<number | null>(null);
  const [generateEta, setGenerateEta] = useState<number | null>(null);
  const [etaStart, setEtaStart] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("QUEUED");
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const lastShownJobIdRef = useRef<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [stageMessage, setStageMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<JobStatusResponse["details"] | null>(null);
  const [inputSizeBytes, setInputSizeBytes] = useState<number | undefined>();
  const [outputSizeBytes, setOutputSizeBytes] = useState<number | undefined>();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const uploadTrackedRef = useRef(false);
  const generateTrackedRef = useRef(false);
  const clipGeneratedTrackedRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const [settings, setSettings] = useState<GenerateSettings>({
    clipLengths: [30, 45],
    numClips: 3,
    aggressiveness: "med",
    autoSelect: true,
    autoHook: true,
    soundEnhance: true,
    manualFacecamCrop: null,
    smartZoom: true,
  });

  const startJobListening = (jid: string) => {
    if (!jid) return
    try { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } } catch (_) {}
    const tick = async () => {
      try {
        const r = await apiFetch(`/api/jobs/${jid}`)
        if (!r.ok) {
          if (r.status === 404) return
          console.warn('[poll] received', r.status)
          return
        }
        const data = await r.json()
        const job = data?.job || data
        if (!job) return
        console.log('Polled status:', job.status)
        const prog = typeof job.progress === 'number' ? job.progress : (typeof job.overallProgress === 'number' ? job.overallProgress : 0)
        setProgressStep(Math.round(prog * 100))
        setJobStatus(job.status || job.phase || '')
        if ((job.status || job.phase || '').toLowerCase() === 'done') {
          if (pollRef.current) { try { clearInterval(pollRef.current) } catch (_) {} ; pollRef.current = null }
          const resultUrl = job.resultUrl || job.result?.videoUrl || job.outputUrl
          if (resultUrl) setOutputUrl(resultUrl)
          setGenerationDone(true)
          try {
            const lower = String(job.status || job.phase || '').toLowerCase()
            const jobIsComplete = lower === 'done' || lower === 'complete' || lower === 'ready_to_download' || lower === 'ready'
            if (jobIsComplete && jid && lastShownJobIdRef.current !== jid) {
              lastShownJobIdRef.current = jid
            }
          } catch (e) {
          }
        }
      } catch (e) {
        console.warn('[poll] fetch error', e)
      }
    }
    tick()
    pollRef.current = setInterval(tick, 2000) as unknown as number
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      event.currentTarget.value = ''
      setFile(null)
      return
    }

    console.log('[editor] selected:', selectedFile.name, selectedFile.type)
    const extOk = /\.mp4$/i.test(selectedFile.name) || /\.mov$/i.test(selectedFile.name) || /\.mkv$/i.test(selectedFile.name)
    const mimeOk = selectedFile.type === 'video/mp4' || selectedFile.type === 'video/quicktime' || selectedFile.type === 'video/x-m4v' || selectedFile.type === 'video/x-matroska'

    if (!extOk && !mimeOk) {
      setError('Only MP4, MOV, and MKV files are supported.')
      setAnalyzing(false)
      event.currentTarget.value = ''
      return
    }

    setError(null)
    setFile(selectedFile)
    const input = event.currentTarget
    try { input.value = '' } catch (_) {}
  }

  const handleModalDownload = async (jid?: string | null) => {
    if (!jid) return
    const endpoint = `/api/jobs/${jid}/download`
    try {
      const r = await fetch(`/api/jobs/${jid}/output-signed-url`)
      const data = await r.json().catch(() => ({}))
      console.log('[output-signed-url]', r.status, data)
    } catch (e) {
      console.warn('[output-signed-url] fetch failed', e)
    }
    try {
      const resp = await apiFetch(endpoint, { method: 'GET' })
      const contentType = resp.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await resp.json().catch(() => null)
        const url = data?.downloadUrl || data?.url || data?.download || null
        if (url) {
          setDownloadStarted(true)
          setShowCompleteModal(true)
          window.location.href = url
          return
        }
      }
    } catch (e) {
    }
    try {
      setDownloadStarted(true)
      setShowCompleteModal(true)
      window.location.href = apiUrl(endpoint)
    } catch (e) {
      console.warn('Download redirect failed', e)
    }
  }

  return (
    <ProtectedRoute>
      <PendingSubscriptionBanner />
      <div className="min-h-screen bg-[#07090f] px-4 sm:px-6 py-6 sm:py-10 text-white lg:px-16">
        <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold">Auto-Editor</h1>
              <PremiumBadge size="sm" />
            </div>
            <p className="text-white/60">Build {buildId}</p>
          </div>
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <EditorControls
                title={title}
                onTitleChange={setTitle}
                onFileChange={handleFileSelected}
                onOpenCrop={() => setShowCrop(true)}
                settings={settings}
                locked={analyzing}
                onSettingsChange={(next) => setSettings(next)}
              />

              <div className="relative rounded-2xl border border-white/6 bg-linear-to-b from-white/3 to-white/2 p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold">Preview & Status</h2>
                    <p className="text-sm text-white/60">Live preview and render progress</p>
                  </div>
                  <p className="text-sm text-white/50">{jobStatus}</p>
                </div>

                <div className="w-full rounded-md overflow-hidden bg-black/60 flex items-center justify-center h-48">
                  {outputUrl ? (
                    <video src={outputUrl} controls className="w-full h-full object-contain" />
                  ) : file ? (
                    <video src={fileUrl || URL.createObjectURL(file)} controls className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-white/50">No preview available</div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="h-2 w-full bg-white/6 rounded-full overflow-hidden">
                    <div className="h-2 bg-linear-to-r from-emerald-400 to-sky-400" style={{ width: `${progressStep}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-white/60">
                    <span>{progressStep}%</span>
                    <div className="flex items-center gap-3">
                      {outputUrl && (
                        <button onClick={() => handleModalDownload(jobId || undefined)} className="px-3 py-1 rounded-full bg-emerald-500/90 text-black font-medium">Download</button>
                      )}
                      <button onClick={() => setShowLogs((s) => !s)} className="px-3 py-1 rounded-full bg-white/6 text-white/90">Logs</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <SubscriptionCard onOpenUpgrade={() => setShowUpgradeModal(true)} />
            </div>
          </div>
          {billingStatus && (
            <UpgradeModal
              isOpen={showUpgradeModal}
              currentPlanId={billingStatus.planId}
              rendersUsed={billingStatus.rendersUsed}
              rendersAllowed={getPlan(billingStatus.planId).features.rendersPerMonth}
              onClose={() => setShowUpgradeModal(false)}
            />
          )}
          <CompletionModal
            isOpen={showCompleteModal}
            jobId={jobId}
            previewUrl={outputUrl}
            downloadStarted={downloadStarted}
            onClose={() => setShowCompleteModal(false)}
            onDownload={() => handleModalDownload(jobId)}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
