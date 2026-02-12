"use client"

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Client-only firebase initializer. Uses NEXT_PUBLIC_ env vars which must be
// present at build time to be embedded into the client bundle.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

let _auth: any = null
let _db: any = null

try {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
  _auth = getAuth(app)
  _db = getFirestore(app)
} catch (e) {
  // If initialization fails, surface in console during development only.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('Firebase client initialization failed:', e)
  }
  _auth = null
  _db = null
}

export const auth = _auth
export const db = _db

export default { auth, db }
// Compatibility wrapper — prefer imports from '@/lib/firebase/client'
export * from './firebase/client'
// Bridge re-exports to the canonical client initializer
export * from './firebase/client'
export { default } from './firebase/client'
