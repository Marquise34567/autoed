import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Initialize Firebase Admin SDK once
let adminInitialized = false
async function initFirebaseAdminIfNeeded() {
  if (adminInitialized) return
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing Firebase admin credentials in environment')
  }

  // Lazy import to keep it server-only
  const { initializeApp, cert, getApps } = await import('firebase-admin/app')
  const { getStorage } = await import('firebase-admin/storage')

  if (!getApps().length) {
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    })
  }
  // ensure bucket is accessible by calling getStorage()
  getStorage()
  adminInitialized = true
}

function jsonResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function OPTIONS() {
  return jsonResponse({ ok: true })
}

export async function POST(request: Request) {
  try {
    // Ensure JSON body
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return jsonResponse({ error: 'Expected application/json body' }, 400)
    }

    const body = await request.json()
    const { filename, contentType: fileContentType } = body || {}
    if (!filename || !fileContentType) {
      return jsonResponse({ error: 'Missing required parameters: filename and contentType' }, 400)
    }

    // Validate envs
    const missingEnv: string[] = []
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env
    if (!FIREBASE_PROJECT_ID) missingEnv.push('FIREBASE_PROJECT_ID')
    if (!FIREBASE_CLIENT_EMAIL) missingEnv.push('FIREBASE_CLIENT_EMAIL')
    if (!FIREBASE_PRIVATE_KEY) missingEnv.push('FIREBASE_PRIVATE_KEY')
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET
    if (!bucketName) missingEnv.push('FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET')
    if (missingEnv.length > 0) {
      return jsonResponse({ error: 'Missing environment variables', missingEnv }, 500)
    }

    await initFirebaseAdminIfNeeded()

    const { getStorage } = await import('firebase-admin/storage')
    const storage = getStorage()
    const bucket = storage.bucket(bucketName as string)

    // Create a safe storage path
    const timestamp = Date.now()
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `uploads/${timestamp}-${safeFilename}`

    const file = bucket.file(storagePath)

    // Create signed URL for PUT (write) - expires in ~15 minutes
    const expires = Date.now() + 15 * 60 * 1000
    const [url] = await file.getSignedUrl({
      action: 'write',
      expires,
      contentType: fileContentType,
    } as any)

    // Return CORS-safe JSON with URL and suggested method/headers
    return jsonResponse({ url, method: 'PUT', headers: { 'Content-Type': fileContentType }, storagePath }, 200)
  } catch (err: any) {
    const message = err?.message || String(err)
    return jsonResponse({ error: 'Failed to create signed upload URL', details: message }, 500)
  }
}
