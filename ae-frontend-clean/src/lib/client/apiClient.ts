"use client"

import { API_BASE as CENTRAL_API_BASE } from '@/lib/api'
import { auth, isFirebaseConfigured } from '@/lib/firebase.client'

const ENV_BASE = process.env.NEXT_PUBLIC_API_URL || CENTRAL_API_BASE || ''

function missingBaseError() {
  const msg = 'NEXT_PUBLIC_API_URL is not configured. Set this env var in Vercel.'
  try { console.error('[apiClient] ' + msg) } catch (_) {}
  return new Error(msg)
}

async function getAuthHeader(): Promise<Record<string,string>> {
  if (!isFirebaseConfigured()) return {}
  const current = auth.currentUser
  if (!current) throw new Error('Please sign in again')
  const token = await current.getIdToken(true)
  if (!token) throw new Error('Please sign in again')
  return { Authorization: `Bearer ${token}` }
}

export async function apiFetch(pathOrUrl: string, opts: RequestInit = {}) {
  // Allow same-origin calls when ENV_BASE is not set. This lets browser
  // requests use relative `/api/...` routes which Vercel will proxy.
  // If caller passed an absolute URL, use it. If caller passed a leading-slash
  // path (e.g. `/api/jobs`) keep it as a same-origin relative URL so the
  // browser will call the Next.js `/api/*` route and Vercel can proxy it.
  // Otherwise, fall back to ENV_BASE when provided (useful for server-side callers).
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : (pathOrUrl.startsWith('/')
        ? pathOrUrl
        : (ENV_BASE ? `${ENV_BASE.replace(/\/$/, '')}/${pathOrUrl}` : `/${pathOrUrl}`))

  const headers: Record<string,string> = { ...(opts.headers as Record<string,string> || {}) }
  // attach auth header when available
  try {
    const ah = await getAuthHeader()
    Object.assign(headers, ah)
  } catch (e: any) {
    // bubble auth errors to caller
    throw e
  }

  const r = await fetch(url, { ...opts, headers })
  return r
}

export { ENV_BASE as API_BASE }
