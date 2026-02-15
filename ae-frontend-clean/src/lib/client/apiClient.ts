"use client"

import { API_BASE as CENTRAL_API_BASE } from '@/lib/api'
import { auth, isFirebaseConfigured } from '@/lib/firebase.client'

// Final API URL: prefer explicit NEXT_PUBLIC_API_URL, fallback to central API_BASE
const ENV_BASE = (process.env.NEXT_PUBLIC_API_URL && String(process.env.NEXT_PUBLIC_API_URL).trim()) || CENTRAL_API_BASE || ''

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
  // Determine final URL to call.
  // Rules:
  // - If `pathOrUrl` is an absolute URL (starts with http), use it as-is.
  // - Otherwise, build a full URL using ENV_BASE (preferred) so frontend
  //   always contacts the configured backend service.
  // - This enforces that `/api/*` requests go to `${ENV_BASE}/api/...` rather
  //   than to a same-origin relative path.
  const base = ENV_BASE.replace(/\/$/, '')
  let url: string
  if (pathOrUrl.startsWith('http')) {
    url = pathOrUrl
  } else if (pathOrUrl.startsWith('/')) {
    // If this is the proxy route, keep it as a same-origin relative path
    if (pathOrUrl.startsWith('/api/proxy/')) {
      url = pathOrUrl
    } else {
      // Ensure other paths like `/api/upload` resolve to the configured backend
      url = base + pathOrUrl
    }
  } else {
    url = base + '/' + pathOrUrl
  }

  // Log the resolved URL for debugging (inline with user's request)
  try { console.log('[apiFetch] final url ->', url) } catch (_) {}

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
