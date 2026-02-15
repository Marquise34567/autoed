"use client";

import { auth, isFirebaseConfigured } from '@/lib/firebase.client'
import { apiFetch } from '@/lib/client/apiClient'

/**
 * Minimal client helper to initiate a secure download.
 * Usage: await startDownload(jobId)
 * This requests a fresh signed URL and redirects the browser immediately.
 */
export async function startDownload(jobId: string) {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars in Vercel.')
  const user = auth?.currentUser
  if (!user) throw new Error('Not authenticated')
  const idToken = await user.getIdToken(true)

    const resp = await apiFetch('/api/proxy/video/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
       Authorization: `Bearer ${idToken}`, // Retaining the Authorization header
    },
    body: JSON.stringify({ jobId }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`API Error ${resp.status}: ${text}`)
  }

  const data = await resp.json()
  const url = data?.url
  if (!url) throw new Error('No download URL returned')

  // Redirect to the signed download URL immediately
  window.location.href = url
}
