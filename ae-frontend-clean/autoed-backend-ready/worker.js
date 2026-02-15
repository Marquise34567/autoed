// worker.js — background worker process
// Connects to Firebase Admin and continuously scans the 'jobs' collection
// for queued jobs and processes them. This process must not exit.
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config() } catch (e) {}
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

// Safe Firebase admin init
let admin = null
function initFirebaseAdmin() {
  if (admin) return { ok: true }
  try {
    admin = require('firebase-admin')
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    if (!projectId || !clientEmail || !privateKey) {
      console.error('[worker][firebase] missing env vars')
      return { ok: false }
    }
    privateKey = privateKey.replace(/\\n/g, '\n')
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    })
    console.log('[worker] firebase admin initialized')
    return { ok: true }
  } catch (err) {
    console.error('[worker] firebase admin init error', err)
    return { ok: false }
  }
}

// Robust error handlers to keep process alive
process.on('uncaughtException', (err) => {
  console.error('[worker] uncaughtException', err && err.stack ? err.stack : err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[worker] unhandledRejection', reason)
})

async function processJob(doc) {
  const id = doc.id
  const data = doc.data() || {}
  console.log(`[worker] processing job ${id} — storagePath=${data.storagePath || data.objectPathNormalized}`)
  const db = admin.firestore()
  try {
    // mark as processing
    await db.collection('jobs').doc(id).set({ phase: 'PROCESSING', updatedAt: Date.now(), message: 'Processing' }, { merge: true })

    // Simulate work: replace this block with the real processing logic
    for (let p = 1; p <= 5; p++) {
      await sleep(1000)
      await db.collection('jobs').doc(id).set({ overallProgress: p / 5 }, { merge: true })
    }

    // After processing, write a result URL (in production this would be the rendered file URL)
    const resultUrl = data.downloadURL || `gs://${process.env.FIREBASE_STORAGE_BUCKET}/${data.storagePath || data.objectPathNormalized}`
    await db.collection('jobs').doc(id).set({ phase: 'DONE', overallProgress: 1, updatedAt: Date.now(), resultUrl }, { merge: true })
    console.log(`[worker] completed job ${id}`)
  } catch (err) {
    console.error(`[worker] job ${id} failed:`, err)
    try {
      await db.collection('jobs').doc(id).set({ phase: 'FAILED', error: String(err), updatedAt: Date.now() }, { merge: true })
    } catch (e) {
      console.error('[worker] failed to mark job as failed', e)
    }
  }
}

async function scanLoop() {
  const fb = initFirebaseAdmin()
  if (!fb.ok) {
    console.error('[worker] firebase admin not initialized — retrying in 5s')
    setTimeout(scanLoop, 5000)
    return
  }
  const db = admin.firestore()

  console.log('[worker] alive; starting queue scan...')
  // Continuous loop using setInterval-like behavior but with async control
  while (true) {
    try {
      // Query for jobs in UPLOADING / QUEUED state
      const q = db.collection('jobs').where('phase', 'in', ['UPLOADING', 'QUEUED', 'CREATED']).limit(5)
      const snap = await q.get()
      if (!snap.empty) {
        for (const doc of snap.docs) {
          // double-check and process one by one
          const data = doc.data() || {}
          const phase = (data.phase || '').toString().toUpperCase()
          if (phase === 'UPLOADING' || phase === 'QUEUED' || phase === 'CREATED') {
            try {
              await processJob(doc)
            } catch (e) {
              console.error('[worker] error processing job', e)
            }
          }
        }
      }
    } catch (err) {
      console.error('[worker] scan error', err)
    }

    // wait 5 seconds between scans
    await sleep(5000)
  }
}

// Start the worker
scanLoop().catch((e) => {
  console.error('[worker] fatal error in scanLoop', e)
})

// Keep the process alive (redundant but explicit)
setInterval(() => {}, 1 << 30)
