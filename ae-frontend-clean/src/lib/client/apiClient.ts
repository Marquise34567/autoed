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
  if (!ENV_BASE) throw missingBaseError()
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${ENV_BASE.replace(/\/$/, '')}${pathOrUrl.startsWith('/') ? pathOrUrl : '/' + pathOrUrl}`

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
