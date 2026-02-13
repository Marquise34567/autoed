"use client";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function getOrCreateUserDoc(uid: string) {
  console.info("[userdoc] uid", uid);
  try { console.log("Navigator online:", navigator.onLine) } catch (_) {}
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    console.info("[userdoc] exists", snap.exists());
    const data = snap.exists() ? snap.data() : null;
    console.info("[userdoc] data", data);
    if (snap.exists()) return data;

    // Create safe default document and re-fetch
    const defaults = {
      plan: "free",
      rendersRemaining: 0,
      rendersLimit: 12,
      rendersUsed: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, defaults, { merge: true });

    const snap2 = await getDoc(ref);
    console.info("[userdoc] exists (after create)", snap2.exists());
    const data2 = snap2.exists() ? snap2.data() : null;
    console.info("[userdoc] data (after create)", data2);
    return snap2.exists() ? data2 : null;
  } catch (err) {
    // Log full error for debugging
    console.warn("[firestore] getOrCreateUserDoc failed:", err);

    try {
      const e = err as any;
      const msg = (e && (e.message || e.toString()) || '').toLowerCase();
      const code = e && e.code;
      // If Firestore indicates the client is offline/unavailable, return a safe fallback
      if (code === 'unavailable' || msg.includes('client is offline') || msg.includes('offline') || msg.includes('failed to get document')) {
        console.info('[userdoc] offline fallback returned for uid', uid);
        return { plan: 'starter', status: 'unknown', source: 'fallback' } as any;
      }
    } catch (_) {}

    return null;
  }
}

// Backwards-compatible alias
export { getOrCreateUserDoc as safeGetUserDoc };
