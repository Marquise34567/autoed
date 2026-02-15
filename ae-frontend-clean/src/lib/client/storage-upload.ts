/**
 * Client-side helper to upload a video file directly to Firebase Storage
 * using the Web SDK's resumable upload API (`uploadBytesResumable`).
 */

import { auth as firebaseAuth } from '@/lib/firebase.client'

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

  // Upload file to backend endpoint instead of direct cloud storage
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL
  if (!backendBase) throw new Error('NEXT_PUBLIC_BACKEND_URL (or NEXT_PUBLIC_API_URL) is not configured')

  const path = '/api/upload'
  const url = `${backendBase.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`

  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)

    // Attach auth token if available
    ;(async () => {
      try {
        const current = (firebaseAuth as any)?.currentUser
        if (current && typeof current.getIdToken === 'function') {
          const token = await current.getIdToken(true)
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }
      } catch (_) {}
    })()

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        try { onProgress((ev.loaded / ev.total) * 100) } catch (_) {}
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText || '{}')
          const storagePath = data.storagePath || data.path || data.storage_path
          const downloadURL = data.downloadUrl || data.downloadURL || data.url || data.download_url
          if (!storagePath || !downloadURL) {
            reject(new Error('Upload succeeded but backend did not return storagePath/downloadUrl'))
            return
          }
          resolve({ storagePath, downloadURL })
        } catch (e) {
          reject(new Error(`Invalid JSON response from upload endpoint: ${String(e)}`))
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText || ''}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))

    const form = new FormData()
    form.append('file', file, file.name)
    try { xhr.send(form) } catch (e) { reject(new Error(`Failed to send upload: ${String(e)}`)) }
  })
}
