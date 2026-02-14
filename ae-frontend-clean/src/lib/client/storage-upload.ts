/**
 * Client-side helper to upload a video file directly to Firebase Storage
 * using the Web SDK's resumable upload API (`uploadBytesResumable`).
 */

import { storage, auth as firebaseAuth, isFirebaseConfigured } from '@/lib/firebase.client'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export async function uploadVideoToStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ storagePath: string; downloadURL: string }> {
  // Ensure Firebase client SDK is initialized
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.')

  if (!file.name && !file.type) throw new Error('Invalid file')

  if (!file.type.startsWith('video/') && !file.name.toLowerCase().endsWith('.mkv')) {
    throw new Error(`Invalid file type: ${file.type}. Must be a video file.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB. Maximum is 2GB.`
    )
  }

  // Normalize contentType (ensure consistent matroska type)
  const contentType =
    file.name.toLowerCase().endsWith('.mkv') || (file.type || '').toLowerCase().includes('matroska')
      ? 'video/matroska'
      : (file.type || 'application/octet-stream')

  // Resolve UID from Firebase Auth if available
  const currentUser = (firebaseAuth && (firebaseAuth as any).currentUser) || null
  const uid = (currentUser && (currentUser.uid || currentUser.id)) || 'anon'

  const safeName = String(file.name).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
  const timestamp = Date.now()
  const storagePath = `uploads/${uid}/${timestamp}-${safeName}`

  const ref = storageRef(storage as any, storagePath)
  const metadata = { contentType }
  const uploadTask = uploadBytesResumable(ref, file, metadata)

  return await new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        if (snapshot.totalBytes && onProgress) {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          try { onProgress(pct) } catch (_) {}
        }
      },
      (err) => {
        reject(new Error(`Firebase upload error: ${String(err)}`))
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(ref)
          resolve({ storagePath, downloadURL })
        } catch (e) {
          reject(new Error(`Failed to get download URL: ${String(e)}`))
        }
      }
    )
  })
}
