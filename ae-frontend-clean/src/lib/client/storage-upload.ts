/**
 * Client-side helper to upload a video file directly to Supabase Storage
 * via a signed URL (no serverless function payload size limits)
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export async function uploadVideoToStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ storagePath: string; signedUrl: string }> {
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

  // Step 1: Get the signed upload URL from the server
  console.log(`[storage-upload] Requesting signed URL from /api/upload-url...`)
  const uploadUrlResponse = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })

  if (!uploadUrlResponse.ok) {
    const text = await uploadUrlResponse.text().catch(() => '')
    throw new Error(`API Error ${uploadUrlResponse.status}: ${text}`)
  }

  let signedUrl: string
  let path: string
  try {
    const data = (await uploadUrlResponse.json()) as any
    // Support both new { url, method, headers, storagePath } and legacy { signedUrl, path }
    if (data.url) {
      signedUrl = data.url
      path = data.storagePath || data.path
      console.log(`[storage-upload] ✓ Got signed URL (new format)`)
    } else if (data.signedUrl) {
      signedUrl = data.signedUrl
      path = data.path
      console.log(`[storage-upload] ✓ Got signed URL (legacy format)`)
    } else {
      throw new Error('Missing signed URL in response')
    }
  } catch (e) {
    throw new Error(`Invalid response from /api/upload-url: ${e}`)
  }

  // Step 2: Upload the file directly to Supabase Storage via signed URL
  // Use XMLHttpRequest or fetch with progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      // Successful upload
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ storagePath: path, signedUrl });
        return
      }

      // Some browsers report CORS failures as status 0 or network errors.
      if (xhr.status === 0) {
        reject(new Error("Storage CORS is not configured for this domain. Run scripts/set-storage-cors.sh"));
        return
      }

      reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
    });

    xhr.addEventListener("error", () => {
      // Often a CORS issue shows up as a network error with status 0
      if (xhr.status === 0) {
        reject(new Error("Storage CORS is not configured for this domain. Run scripts/set-storage-cors.sh"));
        return
      }
      reject(new Error("Upload failed due to network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was aborted"));
    });

    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}
