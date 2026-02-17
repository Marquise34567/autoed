import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getMissingEnv(): string[] {
  return Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
}

const missing = getMissingEnv();
const configured = missing.length === 0;

if (!configured) {
  // Log a clear, production-safe error — don't throw so app UI stays up
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[firebase] Firebase client not configured. Missing NEXT_PUBLIC_FIREBASE_* env vars:', missing.join(', '));
    } else {
      // In production, avoid noisy payloads in logs — emit a concise warning
      console.warn('[firebase] Firebase client not configured. Missing NEXT_PUBLIC_FIREBASE_* env vars.');
    }
  } catch (_) {}
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

if (configured) {
  try {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig as any);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    storageInstance = getStorage(appInstance);
  } catch (e) {
    try { console.warn('[firebase] Failed to initialize Firebase client SDK:', e) } catch (_) {}
    appInstance = null;
    authInstance = null;
    dbInstance = null;
    storageInstance = null;
  }
}

export function isFirebaseConfigured() {
  return configured && !!appInstance;
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
