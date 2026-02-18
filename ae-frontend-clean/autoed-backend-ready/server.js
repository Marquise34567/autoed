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

// Debug endpoint to echo selected incoming headers (safe) — used to verify proxy/header forwarding
app.get('/api/debug/echo-auth', (req, res) => {
  try {
    const received = {}
    const safeKeys = ['content-type', 'user-agent', 'x-forwarded-for', 'x-forwarded-proto', 'host']
    for (const k of safeKeys) {
      const v = req.get(k)
      if (v) received[k] = v
    }

    const authHeader = req.get('authorization') || req.get('Authorization') || ''
    const hasAuthHeader = !!authHeader
    let authHeaderPrefix = 'Missing'
    if (hasAuthHeader) {
      if (authHeader.startsWith('Bearer ')) authHeaderPrefix = 'Bearer'
      else authHeaderPrefix = 'Other'
    }

    return res.json({ ok: true, hasAuthHeader, authHeaderPrefix, receivedHeaders: received })
  } catch (err) {
    console.error('/api/debug/echo-auth error', err)
    return res.status(500).json({ ok: false, error: 'internal' })
  }
})

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

// --- Local relationship/family AI helper + routes (no OpenAI) ---
function normalizeTone(tone) {
  const t = (tone || '').toLowerCase();
  if (t.includes('play')) return 'playful';
  if (t.includes('sweet') || t.includes('warm')) return 'sweet';
  if (t.includes('direct')) return 'direct';
  return 'confident';
}

function detectTopic(text) {
  const t = (text || '').toLowerCase();
  const has = (words) => words.some((w) => t.includes(w));
  if (has(['break up', 'breakup', 'dump', 'ended', 'ex', 'no contact'])) return 'breakup';
  if (has(['cheat', 'cheated', 'lying', 'trust', 'sneak', 'dm', 'texting other'])) return 'trust';
  if (has(['fight', 'argue', 'argument', 'mad at', 'upset', 'silent treatment'])) return 'conflict';
  if (has(['family', 'mom', 'dad', 'parents', 'brother', 'sister', 'in-law', 'in laws'])) return 'family';
  if (has(['relationship', 'bf', 'girlfriend', 'boyfriend', 'partner', 'marriage', 'husband', 'wife'])) return 'relationship';
  if (has(['date', 'first date', 'second date', 'hang out', 'link', 'meet up'])) return 'dating';
  if (has(['boundary', 'boundaries', 'respect', 'space', 'clingy', 'needy'])) return 'boundaries';
  if (has(['what do i say', 'reply', 'respond', 'text', 'message', 'snap'])) return 'texting';
  return 'general';
}

function buildReplies(tone, topic, userMessage) {
  const confident = [
    "I’m down. What day works this week?",
    "Let’s keep it simple—when are you free?",
    "I like you. Let’s make a plan."
  ];

  const playful = [
    "Okay bet 😄 when are we doing this?",
    "Cool—don’t tease me. What day you free?",
    "Say less. Pick a day 😌"
  ];

  const sweet = [
    "I’d like that. What day works for you?",
    "That sounds nice—when are you free this week?",
    "I’m happy you said that. Let’s make a plan."
  ];

  const direct = [
    "When are you free to talk about this?",
    "What do you want from me going forward?",
    "I need clarity—are we doing this or not?"
  ];

  if (topic === 'family') {
    confident[0] = 'I hear you. What would feel respectful to you and your family right now?';
    sweet[0] = 'That sounds heavy. Do you want comfort, advice, or a plan for what to say?';
    direct[0] = "What’s the exact outcome you want with your family here?";
  }

  if (topic === 'conflict') {
    confident[0] = 'I want to understand you—not win. Can we talk calmly about what happened?';
    sweet[0] = 'I’m sorry this hurt. I care about us—can we reset and talk it through?';
    direct[0] = 'This pattern isn’t working. Let’s talk today and agree on a better way.';
  }

  if (topic === 'breakup') {
    confident[0] = 'I respect your decision. I’m going to take space and focus on myself.';
    sweet[0] = 'I’m sad, but I respect it. I’m going to step back and heal.';
    direct[0] = 'Understood. I won’t argue—take care.';
  }

  if (topic === 'trust') {
    confident[0] = 'I need honesty to feel safe. Can you tell me the full truth so we can decide what’s next?';
    sweet[0] = 'I want to rebuild trust, but I need openness. Can we talk honestly about what happened?';
    direct[0] = 'If there’s cheating or lying, I’m out. Tell me the truth right now.';
  }

  return { confident, playful, sweet, direct };
}

function buildStrategy(topic, tone) {
  const baseDo = [
    'Keep messages under 1–2 sentences',
    'Ask one clear question',
    'Stay calm and grounded',
    'Match their energy without chasing'
  ];
  const baseDont = [
    'Over-explain',
    'Double-text immediately',
    'Argue over text if it’s emotional',
    'Try to “win” the conversation'
  ];

  const headlineMap = {
    dating: 'Move it forward with a clear plan',
    texting: 'Keep it short, confident, and easy to reply to',
    relationship: 'Lead with clarity and respect',
    family: 'Stay respectful and set a calm plan',
    conflict: 'De-escalate, then solve the real issue',
    breakup: 'Protect your dignity and heal',
    trust: 'Ask for truth + set boundaries',
    boundaries: 'Be firm, kind, and specific',
    general: 'Clarity beats confusion'
  };

  const whyMap = {
    dating: 'A specific plan removes uncertainty and makes it easy to say yes.',
    texting: 'Short messages feel confident and reduce anxiety for both people.',
    relationship: 'Respectful clarity prevents mixed signals and resentment.',
    family: 'Family situations improve when you stay calm and focus on outcomes.',
    conflict: 'De-escalation stops damage; then you can fix the real problem.',
    breakup: 'Dignity now saves you pain later and speeds up healing.',
    trust: 'You can’t rebuild without full honesty and clear boundaries.',
    boundaries: 'Specific boundaries prevent repeated issues and protect your peace.',
    general: 'Clear intent creates faster, healthier outcomes.'
  };

  const headline = headlineMap[topic] || headlineMap.general;
  const why = whyMap[topic] || whyMap.general;

  const doExtra = {
    conflict: ['Use ‘I feel / I need’ language', 'Propose a quick call if text is escalating'],
    family: ['Name the boundary kindly', 'Offer a compromise if appropriate'],
    trust: ['Ask for specifics once, not endlessly', 'Decide consequences ahead of time'],
    breakup: ['Mute/unfollow if needed', 'Talk to friends, sleep, hydrate—stabilize'],
    boundaries: ['State the boundary + consequence once', 'Follow through calmly']
  };

  const dontExtra = {
    conflict: ['Bring up 10 old problems at once', 'Insult or label them'],
    trust: ['Become a detective forever', 'Threaten unless you mean it'],
    breakup: ['Beg', 'Send long paragraphs'],
    family: ['Yell or disrespect', 'Let guilt decide for you'],
    boundaries: ['Set boundaries you won’t enforce', 'Argue about your boundary']
  };

  const doList = [...baseDo, ...(doExtra[topic] || [])];
  const dontList = [...baseDont, ...(dontExtra[topic] || [])];

  if (tone === 'playful') doList.unshift('Add one light, positive line (no sarcasm)');
  if (tone === 'direct') doList.unshift('Be concise and specific');
  if (tone === 'sweet') doList.unshift('Add warmth without over-apologizing');

  return { headline, why, do: doList, dont: dontList };
}

function buildDatePlan(topic) {
  if (topic === 'dating') {
    return {
      idea: 'Low-pressure first date: coffee + short walk',
      textToSend: 'Let’s do coffee this week—are you free Thursday or Saturday?',
      logistics: ['Pick 2 time options', 'Keep it 60–90 minutes', 'Choose an easy location']
    };
  }
  if (topic === 'family') {
    return {
      idea: 'Calm 10-minute talk focused on the outcome',
      textToSend: 'Can we talk for 10 minutes tonight? I want to handle this respectfully and find a plan.',
      logistics: ['Choose a calm time', 'Write 2–3 key points', 'End with a clear next step']
    };
  }
  if (topic === 'conflict') {
    return {
      idea: 'Reset + solve: short call then agreement',
      textToSend: 'I don’t want to argue over text. Can we do a quick call later and reset?',
      logistics: ['Start with one apology if needed', 'Name the issue in one sentence', 'Agree on one change each']
    };
  }
  return {
    idea: 'Simple next step',
    textToSend: 'What would feel best to you as the next step—talking now or making a plan for later?',
    logistics: ['Ask one question', 'Keep it respectful', 'Move to a call if it’s emotional']
  };
}

function generateLocalAI(body) {
  const tone = normalizeTone(body.tone);
  const userMessage = (body.userMessage || '').trim();
  const topic = detectTopic(`${body.situation || ''}\n${userMessage}`);

  const strategy = buildStrategy(topic, tone);
  const replies = buildReplies(tone, topic, userMessage);
  const datePlan = buildDatePlan(topic);

  return { strategy, replies, datePlan };
}

app.post('/api/advice', (req, res) => {
  const body = req.body || {};
  if (!body.userMessage || typeof body.userMessage !== 'string') {
    return res.status(400).json({ error: 'Missing userMessage (string)' });
  }
  const data = generateLocalAI(body);
  return res.json(data);
});

app.get('/api/advice', (_req, res) => {
  res.status(200).json({ ok: true, note: 'This endpoint is POST-only. Send a POST request to /api/advice with JSON body.' });
});

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
