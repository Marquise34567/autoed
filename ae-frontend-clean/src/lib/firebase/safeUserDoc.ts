"use client";

import { doc, getDoc, setDoc, enableNetwork } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getOrCreateUserDoc(uid: string) {
  if (!uid) return null;

  const ref = doc(db, "users", uid);

  // If the browser says we're online, explicitly enable Firestore network.
  // This fixes cases where Firestore got stuck in an "offline" state.
  if (typeof window !== "undefined" && navigator.onLine) {
    try {
      await enableNetwork(db);
    } catch {
      // ignore
    }
  }

  // Try read once, then retry once if Firestore claims "offline"
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const snap = await getDoc(ref);

      if (snap.exists()) return snap.data();

      const newDoc = { plan: "starter", createdAt: Date.now() };
      await setDoc(ref, newDoc, { merge: true });
      return newDoc;
    } catch (err: any) {
      const msg = String(err?.message || err);

      const isOffline =
        msg.toLowerCase().includes("client is offline") ||
        msg.toLowerCase().includes("offline");

      // Retry once after a short delay if it looks like a transient offline state
      if (isOffline && attempt === 1) {
        await sleep(600);
        continue;
      }

      // FINAL fallback (do not throw)
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[userdoc] Firestore failed after retry — fallback returned:",
          msg
        );
      }

      return { plan: "starter", status: "unknown", source: "fallback" };
    }
  }

  return { plan: "starter", status: "unknown", source: "fallback" };
}
