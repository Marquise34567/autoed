"use client";

import { auth, isFirebaseConfigured } from "@/lib/firebase.client";
import { apiFetch } from '@/lib/client/apiClient'
import { apiUrl } from '@/lib/apiBase'

export async function getOrCreateUserDoc(_uid: string) {
  console.info("[userdoc] fetch via server route");
  if (!isFirebaseConfigured()) {
    console.warn('[userdoc] Firebase not configured; returning fallback userdoc')
    return { plan: 'starter', status: 'unknown', source: 'fallback' }
  }

  try {
    try { console.log("Navigator online:", navigator.onLine) } catch (_) {}

    const currentUser = auth?.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : null;

    const headers: Record<string,string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await apiFetch(apiUrl('/api/proxy/userdoc'), { headers, cache: 'no-store' })
    if (!res.ok) {
      console.warn('[userdoc] server responded non-OK', res.status)
      // Fallback so editor remains usable even when userdoc fetch fails
      return { plan: 'starter', rendersLeft: 12, uid: null }
    }
    const data = await res.json()
    console.info('[userdoc] server data', data)
    return data
  } catch (err) {
    console.warn('[userdoc] fetch failed, using fallback userdoc')
    return { plan: 'starter', rendersLeft: 12, uid: null }
  }
}
