// Central API base URL for frontend network requests.
// Use `NEXT_PUBLIC_API_URL` in your Vercel environment to point to your backend.
// Do NOT hardcode production backend URLs here; set `NEXT_PUBLIC_API_URL` instead.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ''

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  if (!API_BASE) console.warn('[api] WARNING: NEXT_PUBLIC_API_URL is not set — frontend will call relative /api/* paths in development')
  else console.log(`[api] Using API_BASE=${API_BASE}`)
}
