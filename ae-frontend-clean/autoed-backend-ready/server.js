// server.js — dedicated API service (Express)
// Runs only the HTTP API and does NOT include worker logic.
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config() } catch (e) {}
}
const express = require('express')
const cors = require('cors')
const { randomUUID } = require('crypto')

const app = express()

// Firebase Admin lazy init
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
    console.log('[firebase] admin initialized successfully')
    return { ok: true }
  } catch (err) {
    console.error('[firebase] admin init error:', err && err.message ? err.message : err)
    return { ok: false, error: String(err) }
  }
}

// Middleware
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// CORS: allow all for simplicity (adjust for production)
// CORS: allow production, vercel previews, and localhost dev
const allowedOrigins = ['https://autoeditor.app', 'https://www.autoeditor.app', 'http://localhost:3000', 'http://127.0.0.1:3000']
const vercelPreviewRegex = /https:\/\/.*\.vercel\.app$/
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOptions))

app.get('/health', (_req, res) => res.json({ ok: true }))

// POST /api/jobs — create a job record (no processing here)
app.post('/api/jobs', async (req, res) => {
  try {
    const { storagePath, downloadURL, uid: bodyUid, jobId, options } = req.body || {}

    // Prefer Firebase ID token in Authorization header; fall back to provided uid
    let uid = bodyUid || null
    const authHeader = req.headers.authorization || req.headers.Authorization || ''
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const fb = initFirebaseAdmin()
      if (!fb.ok) return res.status(500).json({ error: 'Firebase admin not configured' })
      try {
        const decoded = await admin.auth().verifyIdToken(token)
        uid = decoded.uid
      } catch (err) {
        console.warn('Invalid ID token on /api/jobs:', err && err.message ? err.message : err)
        return res.status(401).json({ error: 'Invalid ID token' })
      }
    }

    if (!storagePath) return res.status(400).json({ error: 'Missing required field: storagePath' })
    if (!uid) return res.status(401).json({ error: 'Missing uid or valid ID token' })

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET
    if (!bucketName) return res.status(500).json({ error: 'Server misconfiguration: FIREBASE_STORAGE_BUCKET missing' })

    const normalizedPath = String(storagePath).replace(/^\/+/, '')
    const gsUri = `gs://${bucketName}/${normalizedPath}`
    const createdJobId = jobId || randomUUID()

    // Persist a minimal job record in Firestore so the worker can pick it up
    const fb2 = initFirebaseAdmin()
    if (!fb2.ok) return res.status(500).json({ error: 'Firebase admin not configured' })
    const db = admin.firestore()
    const docRef = db.collection('jobs').doc(createdJobId)
    const now = Date.now()
    const base = {
      id: createdJobId,
      uid: uid,
      phase: 'UPLOADING',
      overallProgress: 0,
      overallEtaSec: null,
      message: 'Created',
      createdAt: now,
      updatedAt: now,
      objectPathOriginal: null,
      objectPathNormalized: normalizedPath,
      finalVideoPath: null,
      error: null,
      logs: [],
      storagePath: normalizedPath,
      downloadURL: downloadURL || null
    }
    await docRef.set(base)

    return res.status(200).json({ ok: true, jobId: createdJobId, received: { storagePath: normalizedPath, downloadURL: downloadURL || null, uid, gsUri }, message: 'Job accepted' })
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

    const fb = initFirebaseAdmin()
    if (!fb.ok) return res.status(500).json({ error: 'Firebase admin not configured' })

    const normalizedPath = String(storagePath).replace(/^\/+/, '')
    const bucket = admin.storage().bucket()
    const file = bucket.file(normalizedPath)
    const expiresAt = Date.now() + 15 * 60 * 1000
    const [url] = await file.getSignedUrl({ version: 'v4', action: 'write', expires: expiresAt })

    return res.json({ ok: true, url, method: 'PUT', headers: { 'Content-Type': contentType || 'application/octet-stream' }, storagePath: normalizedPath })
  } catch (err) {
    console.error('/api/proxy/upload-url error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Global error handlers to avoid process crash
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err && err.stack ? err.stack : err)
})
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log('API server listening on', PORT)
})

module.exports = { initFirebaseAdmin }
