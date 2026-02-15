/**
 * Client-side helper to upload a video file directly to Firebase Storage
 * using the Web SDK's resumable upload API (`uploadBytesResumable`).
 */

import { auth, storage, isFirebaseConfigured } from '@/lib/firebase.client'
import { ref, uploadBytesResumable } from 'firebase/storage'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export async function uploadVideoToStorage(
  file: File,
  onProgress?: (percent: number, transferred?: number, total?: number) => void
): Promise<{ storagePath: string }> {
  if (!file.name) throw new Error('Invalid file')

  if (!file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.mkv')) {
    throw new Error(`Invalid file type: ${file.type}. Must be a video file.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB. Maximum is 2GB.`
    )
  }

  if (!isFirebaseConfigured() || !auth || !storage) {
    throw new Error('Firebase is not configured in the browser. Set NEXT_PUBLIC_FIREBASE_* env vars.')
  }

  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `uploads/${user.uid}/${Date.now()}-${safeName}`

  const storageRef = ref(storage, path)

  return await new Promise((resolve, reject) => {
    try { if (onProgress) onProgress(0, 0, file.size) } catch (_) {}
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type || 'application/octet-stream' })
    task.on(
      'state_changed',
      (snap) => {
        try {
          const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0
          if (onProgress) onProgress(pct, snap.bytesTransferred, snap.totalBytes)
        } catch (_) {}
      },
      (err) => reject(err),
      async () => {
        try { if (onProgress) onProgress(100, file.size, file.size) } catch (_) {}
        resolve({ storagePath: path })
      }
    )
  })
}
