/**
 * Client-side helper to upload a video file directly to Firebase Storage
 * using the Web SDK's resumable upload API (`uploadBytesResumable`).
 */

import { apiFetch } from '@/lib/client/apiClient'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export async function uploadVideoToStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ storagePath: string; downloadURL: string }> {
  if (!file.name && !file.type) throw new Error('Invalid file')

  if (!file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.mkv')) {
    throw new Error(`Invalid file type: ${file.type}. Must be a video file.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB. Maximum is 2GB.`
    )
  }

  const path = '/api/upload'

  // Note: `fetch` doesn't provide upload progress natively. We call onProgress(0)
  // before starting and onProgress(100) after completion so UI can update.
  try { if (onProgress) onProgress(0) } catch (_) {}

  const form = new FormData()
  form.append('file', file, file.name)

  const resp = await apiFetch(path, { method: 'POST', body: form })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Upload failed: ${resp.status} ${text}`)
  }

  const data = await resp.json().catch(() => ({}))
  const storagePath = data.storagePath || data.path || data.storage_path
  const downloadURL = data.downloadUrl || data.downloadURL || data.url || data.download_url
  if (!storagePath || !downloadURL) throw new Error('Upload succeeded but backend did not return storagePath/downloadUrl')

  try { if (onProgress) onProgress(100) } catch (_) {}
  return { storagePath, downloadURL }
}
