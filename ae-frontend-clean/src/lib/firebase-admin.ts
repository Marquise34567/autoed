import admin from 'firebase-admin'

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
let privateKey = process.env.FIREBASE_PRIVATE_KEY

if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKey) {
    // Do not throw here; server routes will surface missing env vars as needed
    console.warn('[firebase-admin] missing firebase admin env vars')
  } else {
    // Replace escaped newlines in the private key if present
    privateKey = privateKey.replace(/\\n/g, '\n')
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    })
  }
}

export { admin }
