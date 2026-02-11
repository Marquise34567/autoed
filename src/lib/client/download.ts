import { auth } from '@/lib/firebase.client'

/**
 * Minimal client helper to initiate a secure download.
 * Usage: await startDownload(jobId)
 * This requests a fresh signed URL and redirects the browser immediately.
 */
export async function startDownload(jobId: string) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const idToken = await user.getIdToken(true)

  const resp = await fetch('/api/video/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ jobId }),
  })

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body?.error || 'Failed to generate download URL')
  }

  const data = await resp.json()
  const url = data?.url
  if (!url) throw new Error('No download URL returned')

  // Redirect to the signed download URL immediately
  window.location.href = url
}
