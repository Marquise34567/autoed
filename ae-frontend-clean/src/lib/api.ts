// Central API base URL for frontend network requests.
// Use `NEXT_PUBLIC_API_URL` in your Vercel / Railway environment to point to your backend.
// Fallback to the Railway app URL when the env var is not set.
const RAILWAY_FALLBACK = 'https://remarkable-comfort-production-4a9a.up.railway.app'
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL && String(process.env.NEXT_PUBLIC_API_URL).trim()) || RAILWAY_FALLBACK

// Always log the resolved API base to help debugging (will show in browser console).
/* eslint-disable no-console */
console.log(`[api] Resolved API_BASE=${API_BASE}`)
/* eslint-enable no-console */
