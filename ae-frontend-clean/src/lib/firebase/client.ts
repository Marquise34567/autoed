// firebase client initialization - guarded so importing this module on the server
// will not attempt to initialize the browser SDK at module load time.
// The Firebase Web SDK must only run in the browser.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const isBrowser = typeof window !== "undefined";

let _auth: any = null;
let _db: any = null;

function missingEnvVars() {
  const required = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];
  // Check only these exact NEXT_PUBLIC keys and return which are missing/empty
  return required.filter((k) => {
    const v = (process.env as any)[k];
    return !v;
  });
}

if (isBrowser) {
  const missing = missingEnvVars();
  if (missing.length) {
    const msg = `Missing NEXT_PUBLIC Firebase env vars: ${missing.join(", ")}`;
    if (process.env.NODE_ENV !== "production") {
      // In development, throw so developers notice immediately.
      throw new Error(msg);
    } else {
      // In production (Vercel) log a clear error but do not crash render.
      // This avoids build/runtime crashes while still surfacing the issue in logs.
      // eslint-disable-next-line no-console
      console.error(msg);
    }
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

  // Client-only boolean presence debug (do NOT log actual secret values)
  try {
    // eslint-disable-next-line no-console
    console.log("firebase env present?", {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  } catch (e) {
    // ignore logging errors
  }

  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    _auth = getAuth(app);
    _db = getFirestore(app);
  } catch (e) {
    // If initialization fails, surface a clear error in dev and log in prod.
    const errMsg = `Firebase initialization failed: ${e instanceof Error ? e.message : String(e)}`;
    if (process.env.NODE_ENV !== "production") throw new Error(errMsg);
    // eslint-disable-next-line no-console
    console.error(errMsg);
    _auth = null;
    _db = null;
  }
} else {
  _auth = null;
  _db = null;
}

export const auth = _auth;
export const db = _db;
