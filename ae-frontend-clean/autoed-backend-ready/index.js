// Production-ready Express server entry
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config() } catch (e) {}
}
const express = require('express')
const cors = require('cors')
const { randomUUID } = require('crypto')

const app = express()

// Body parsers
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

// CORS configuration: allow the two production domains and any vercel preview
const allowedOrigins = [
  'https://autoeditor.app',
  'https://www.autoeditor.app'
]
const vercelPreviewRegex = /https:\/\/.*\.vercel\.app$/
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  }
}

// Preflight and headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  next()
})
app.options('*', cors(corsOptions))

app.get('/health', (_req, res) => res.json({ ok: true }))
app.get('/', (_req, res) => res.json({ message: 'autoed-backend-ready' }))

// Jobs route for frontend POSTs
app.post('/jobs', async (req, res) => {
  try {
    const { filePath, downloadURL, uid, jobId, options } = req.body || {}

    if (!filePath && !downloadURL) {
      return res.status(400).json({ error: 'Missing filePath or downloadURL' })
    }
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid' })
    }

    const createdJobId = jobId || randomUUID()

    // Accept job and return confirmation
    return res.status(200).json({
      ok: true,
      jobId: createdJobId,
      received: { filePath, downloadURL, uid },
      message: 'Job accepted'
    })
  } catch (err) {
    console.error('Job route error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log('autoed-backend-ready listening', PORT)
})
