/**
 * Client-side helper to upload a video file directly to Supabase Storage
 * via a signed URL (no serverless function payload size limits)
 */

import { API_BASE } from '@/lib/api'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export async function uploadVideoToStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ storagePath: string; uploadUrl: string }> {
  // Step 0: Validate file before uploading
  if (!file.type.startsWith('video/')) {
    throw new Error(`Invalid file type: ${file.type}. Must be a video file.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB. Maximum is 2GB.`
    )
  }

  console.log(`[storage-upload] Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

  // Determine exact contentType to use for signing and upload.
  const contentType =
    file.name.toLowerCase().endsWith('.mkv') || (file.type || '').toLowerCase().includes('matroska')
      ? 'video/matroska'
      : (file.type || 'application/octet-stream')

  // Step 1: Get the signed upload URL from the server
  console.log(`[storage-upload] Requesting signed URL from ${API_BASE}/api/upload-url...`)
  const uploadUrlResponse = await fetch(`${API_BASE}/api/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: contentType,
      size: file.size,
    }),
  })

  if (!uploadUrlResponse.ok) {
    const text = await uploadUrlResponse.text().catch(() => '')
    throw new Error(`API Error ${uploadUrlResponse.status}: ${text}`)
  }

  let uploadUrl: string
  let path: string
  try {
    const data = (await uploadUrlResponse.json()) as any
    // Prefer the new `uploadUrl` or `url`, but support legacy `signedUrl` for compatibility.
    if (data.uploadUrl || data.url) {
      uploadUrl = data.uploadUrl || data.url
      path = data.path || data.storagePath
      console.log(`[storage-upload] ✓ Got upload URL (new format)`)
    } else if (data.signedUrl) {
      uploadUrl = data.signedUrl
      path = data.path
      console.log(`[storage-upload] ✓ Got signed URL (legacy format)`)
    } else {
      throw new Error('Missing signed/upload URL in response')
    }
  } catch (e) {
    throw new Error(`Invalid response from ${API_BASE}/api/upload-url: ${e}`)
  }
  // Step 2: Upload the file directly to Google Cloud Storage via signed URL using fetch + PUT
  // Follow the strict pattern: use PUT, send only Content-Type header, and raw file as body.
  try {
    if (!uploadUrl) throw new Error('Missing uploadUrl')
    // Detect whether the signed URL explicitly requires the Content-Type header
    // by reading the `X-Goog-SignedHeaders` query param. If the signed headers
    // include `content-type`, we must set it exactly; otherwise we omit headers.
    let uploadResponse: Response
    let signedHeaders = ''
    try {
      const urlObj = new URL(uploadUrl)
      signedHeaders = (urlObj.searchParams.get('X-Goog-SignedHeaders') || urlObj.searchParams.get('x-goog-signedheaders') || '').toLowerCase()
      console.log(`[storage-upload] signedHeaders for uploadUrl: ${signedHeaders}`)
      console.log(`[storage-upload] contentType used for signing/upload: ${contentType}`)

      if (signedHeaders.includes('content-type')) {
        console.log('[storage-upload] PUT will include Content-Type header')
        uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: file,
        })
      } else {
        console.log('[storage-upload] PUT will NOT include any custom headers')
        uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
        })
      }
    } catch (err) {
      throw new Error(`Upload request error: ${String(err)}`)
    }

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text().catch(() => '')
      console.error(`[storage-upload] upload failed status=${uploadResponse.status} statusText=${uploadResponse.statusText} response=${text}`)
      // If the signed URL requires Content-Type and we received 403, try a single
      // heuristic retry: many mkv files report mime `video/x-matroska` in the browser
      // but some signers use `video/matroska`. Retry with stripped `x-` prefix.
      if (uploadResponse.status === 403 && signedHeaders.includes('content-type')) {
        try {
          const altType = contentType.replace('x-', '')
          if (altType && altType !== file.type) {
            console.log(`[storage-upload] retrying upload with alternative Content-Type: ${altType}`)
            const retryResp = await fetch(uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': altType },
              body: file,
            })
            if (retryResp.ok) {
              if (onProgress) try { onProgress(100) } catch (_) {}
              return { storagePath: path, uploadUrl }
            }
            const retryText = await retryResp.text().catch(() => '')
            console.error(`[storage-upload] retry failed status=${retryResp.status} response=${retryText}`)
          }
        } catch (e) {
          console.error('[storage-upload] retry error', e)
        }
      }
      throw new Error(`Upload failed with status ${uploadResponse.status}`)
    }

    // Optionally report final progress as 100%
    if (onProgress) try { onProgress(100) } catch (_) {}

    return { storagePath: path, uploadUrl }
  } catch (e) {
    throw new Error(`Upload error: ${e && (e as any).message ? (e as any).message : String(e)}`)
  }
}
