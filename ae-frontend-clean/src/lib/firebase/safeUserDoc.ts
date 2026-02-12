"use client";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function safeGetUserDoc(uid: string) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn("[firestore] user doc failed but continuing:", err);
    return null;
  }
}
