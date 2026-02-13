"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function getOrCreateUserDoc(uid: string) {
  if (!uid) {
    console.warn("[userdoc] no uid provided");
    return null;
  }

  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      console.log("[userdoc] found existing doc");
      return snap.data();
    }

    console.log("[userdoc] creating new doc");

    const newDoc = {
      plan: "starter",
      createdAt: Date.now(),
    };

    await setDoc(ref, newDoc);
    return newDoc;
  } catch (error: any) {
    console.warn(
      "[userdoc] Firestore read failed — returning safe fallback",
      error?.message
    );

    // 🔥 CRITICAL: Never throw. Always return safe object.
    return {
      plan: "starter",
      status: "unknown",
      source: "fallback",
    };
  }
}
