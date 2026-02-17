"use client"

import React, { useRef, useState, useEffect } from 'react'
import styles from './EditorClientV2Modern.module.css'
import { useAuth } from '@/lib/auth/useAuth'
import { uploadVideoToStorage } from '@/lib/client/storage-upload'
import { apiFetch } from '@/lib/client/apiClient'

type Props = { compact?: boolean }

export default function EditorClientV2Modern({ compact }: Props) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [jobUrl, setJobUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try { console.log('EditorClientV2Modern mounted') } catch (_) {}
  }, [])

  const openPicker = () => fileRef.current?.click()

  const onFile = async (f?: File) => {
    if (!f) return
    setFile(f)
    setError(null)
    setJobUrl(null)
    try {
      setUploading(true)
      setProgress(0)
      const onProgress = (pct: number) => setProgress(Math.round(pct))
      const { storagePath } = await uploadVideoToStorage(f, onProgress)
      const body = { storagePath, filename: f.name, contentType: f.type }
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error(`Job creation failed: ${res.status}`)
      }

      // Robust parse and logging
      const text = await res.text().catch(() => '')
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        try { console.log('[jobs] create response text (non-json):', text) } catch (_) {}
        data = { _rawText: text }
      }

      try { console.log('JOB RESPONSE:', data) } catch (_) {}

      const newJobId = data?.jobId || data?.id || data?.job?.id

      if (!newJobId) {
        try { console.error('Unexpected job response:', data) } catch (_) {}
        let jsonStr = ''
        try { jsonStr = JSON.stringify(data) } catch (_) { jsonStr = String(data) }
        throw new Error(`Backend did not return jobId. Response: ${jsonStr}`)
      }

      setJobId(newJobId)
      if (data?.resultUrl) setJobUrl(data.resultUrl)
      setUploading(false)
    } catch (e: any) {
      setUploading(false)
      setError(e?.message || 'Upload failed')
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo} />
          <div className={styles.title}>AutoEditor Pro</div>
          <div className={styles.subtitle}>AI-powered clip trimming & pacing — premium</div>
        </div>
        <div className={styles.account}>
          <div className={styles.mono}>{user?.email || 'Not signed in'}</div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.editorArea}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleLarge}>Upload & Analyze</div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.metaCol}>
                <button className={styles.gradientBtn} onClick={openPicker} disabled={isUploading}>{isUploading ? 'Uploading…' : (file ? 'Replace file' : 'Choose file')}</button>
                <input ref={fileRef} type="file" hidden accept="video/*,.mp4,.mov,.mkv,.webm" onChange={(e) => onFile(e.target.files?.[0] ?? undefined)} />
                <div className={styles.smallMeta}>MP4 / MOV / WEBM • up to 1GB</div>
                {file && <div className={styles.mono}>{file.name}</div>}
                <div style={{ marginTop: 12 }}>
                  <button className={styles.primary} onClick={openPicker} disabled={isUploading}>Upload Video</button>
                  <button className={styles.ghost} onClick={() => { setFile(null); setJobUrl(null); setError(null); setProgress(0) }} style={{ marginLeft: 8 }}>Reset</button>
                </div>
                {error && <div className={styles.error} style={{ marginTop: 8 }}>{error}</div>}
              </div>

              <div className={styles.previewArea}>
                {jobUrl ? (
                  <video src={jobUrl} controls className={styles.previewVideo} />
                ) : (
                  <div className={styles.previewPlaceholder}>Result preview will appear here after processing</div>
                )}
                <div className={styles.progressWrap}>
                  <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                </div>
                <div className={styles.mono} style={{ marginTop: 8 }}>{progress}%</div>
                <div style={{ marginTop: 8 }}>
                  <button className={styles.ghost} disabled={!jobUrl} onClick={() => jobUrl && window.open(jobUrl, '_blank')}>Download</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
