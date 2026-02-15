// Production-ready Express server entry
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config() } catch (e) {}
}
const express = require('express')
const cors = require('cors')
const { randomUUID } = require('crypto')

const app = express()

// Firebase Admin initialization (lazy safe init)
let firebaseAdminInitialized = false
let admin = null
function initFirebaseAdmin() {
  if (firebaseAdminInitialized) return { ok: true }
  try {
    admin = require('firebase-admin')
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET

    if (!projectId || !clientEmail || !privateKey || !storageBucket) {
      console.error('[firebase] not all env vars present for firebase admin init')
      return { ok: false, error: 'Missing Firebase configuration (check env vars)' }
    }

    // Handle escaped newlines in private key
    privateKey = privateKey.replace(/\\n/g, '\n')

    const credential = {
      projectId,
      clientEmail,
      privateKey
    }

    admin.initializeApp({
      credential: admin.credential.cert(credential),
      storageBucket
    })
    firebaseAdminInitialized = true
    console.log('[firebase] admin initialized successfully (secrets hidden)')
    return { ok: true }
  } catch (err) {
    console.error('[firebase] admin init error:', err && err.message ? err.message : err)
    return { ok: false, error: String(err) }
  }
}

// Body parsers
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// CORS configuration: allow production domains, vercel previews, and local dev
const allowedOrigins = [
  'https://autoeditor.app',
  'https://www.autoeditor.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]
const vercelPreviewRegex = /https:\/\/.*\.vercel\.app$/
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Use the cors middleware with the options above for all routes
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.get('/health', (_req, res) => res.json({ ok: true }))
app.get('/', (_req, res) => res.json({ message: 'autoed-backend-ready' }))

// Signed URL endpoints removed: frontend must use Firebase Web SDK `uploadBytesResumable`.
// This server intentionally does not provide signed upload URLs.

// Minimal userdoc route expected by frontend
app.get('/api/userdoc', (req, res) => {
  try {
    // If auth is required in future, respond 401 with JSON
    const auth = req.headers && req.headers.authorization
    if (auth === 'required') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Return a simple JSON payload so frontend no longer receives HTML 404
    return res.json({ ok: true })
  } catch (err) {
    console.error('/api/userdoc error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Fallback route in case proxy strips /api prefix
app.get('/userdoc', (req, res) => {
  try {
    const auth = req.headers && req.headers.authorization
    if (auth === 'required') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.json({ ok: true })
  } catch (err) {
    console.error('/userdoc error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Jobs route for frontend POSTs
app.post('/jobs', async (req, res) => {
  try {
    // Expect `storagePath` (relative path within Firebase Storage bucket) and optional `downloadURL`.
    const { storagePath, downloadURL, uid, jobId, options } = req.body || {}

    if (!storagePath) {
      return res.status(400).json({ error: 'Missing required field: storagePath' })
    }
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid' })
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET
    if (!bucketName) return res.status(500).json({ error: 'Server misconfiguration: FIREBASE_STORAGE_BUCKET missing' })

    // Normalize storagePath: strip leading slashes if present
    const normalizedPath = String(storagePath).replace(/^\/+/, '')
    const gsUri = `gs://${bucketName}/${normalizedPath}`

    const createdJobId = jobId || randomUUID()

    // Here, the worker/process that handles the job should read the original
    // video from `gsUri`. We return the accepted job info including canonical gsUri.
    return res.status(200).json({
      ok: true,
      jobId: createdJobId,
      received: { storagePath: normalizedPath, downloadURL: downloadURL || null, uid, gsUri },
      message: 'Job accepted'
    })
  } catch (err) {
    console.error('Job route error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/proxy/upload-url — return a signed upload URL for client use
app.post('/api/proxy/upload-url', async (req, res) => {
  try {
    const { storagePath, contentType } = req.body || {}
    if (!storagePath) return res.status(400).json({ error: 'Missing required field: storagePath' })

    // Initialize Firebase Admin SDK
    const fb = initFirebaseAdmin()
    if (!fb.ok) return res.status(500).json({ error: 'Firebase admin not configured' })

    // Normalize path
    const normalizedPath = String(storagePath).replace(/^\/+/, '')

    // Generate a V4 signed URL for a write (PUT) operation — short expiry
    const bucket = admin.storage().bucket()
    const file = bucket.file(normalizedPath)
    const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
    })

    return res.json({
      ok: true,
      url,
      method: 'PUT',
      headers: { 'Content-Type': contentType || 'application/octet-stream' },
      storagePath: normalizedPath,
    })
  } catch (err) {
    console.error('/api/proxy/upload-url error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log('autoed-backend-ready listening', PORT)
})
