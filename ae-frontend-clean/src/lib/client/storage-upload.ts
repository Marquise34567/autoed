/**
 * Client-side helper to upload a video file directly to Firebase Storage
 * using the Web SDK's resumable upload API (`uploadBytesResumable`).
 */

import { apiFetch } from '@/lib/client/apiClient'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export async function uploadVideoToStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ storagePath: string; jobId: string }> {
  if (!file.name) throw new Error('Invalid file')

  if (!file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.mkv')) {
    throw new Error(`Invalid file type: ${file.type}. Must be a video file.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB. Maximum is 2GB.`
    )
  }

  try { if (onProgress) onProgress(0) } catch (_) {}

  // STEP 1: Request a signed upload URL (small JSON call via proxy)
  const signedResp = await apiFetch('/api/proxy/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size }),
  })
  try { console.log('[upload] /api/proxy/upload-url status', signedResp.status) } catch (_) {}
  if (!signedResp.ok) {
    const txt = await signedResp.text().catch(()=>'')
    throw new Error(`Signed URL request failed: ${signedResp.status} ${txt}`)
  }
  const signedJson: any = await signedResp.json().catch(()=>({}))
  const uploadUrl: string | undefined = signedJson?.uploadUrl || signedJson?.url
  const storagePath: string | undefined = signedJson?.storagePath || signedJson?.path
  const jobId: string | undefined = signedJson?.jobId || signedJson?.jobID || signedJson?.id
  if (!uploadUrl || !storagePath || !jobId) {
    throw new Error('Signed URL response missing uploadUrl, storagePath, or jobId')
  }

  // STEP 2: Upload file bytes directly to storage (no proxy)
  const putResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  try { console.log('[upload] direct PUT status', putResp.status, { uploadUrl }) } catch (_) {}
  if (!putResp.ok) {
    const txt = await putResp.text().catch(()=>'')
    throw new Error(`Direct upload failed: ${putResp.status} ${txt}`)
  }

  try { if (onProgress) onProgress(100) } catch (_) {}
  return { storagePath, jobId }
}
