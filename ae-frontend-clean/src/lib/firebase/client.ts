// firebase client initialization - guarded so importing this module on the server
// will not attempt to initialize the browser SDK at module load time.
// The Firebase Web SDK must only run in the browser.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const isBrowser = typeof window !== "undefined";

let _auth: any = null;
let _db: any = null;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

if (isBrowser) {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    _auth = getAuth(app);
    _db = getFirestore(app);
  } catch (e) {
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
