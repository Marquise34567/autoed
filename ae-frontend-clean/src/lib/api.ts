// Central API base URL for frontend network requests.
// Use `NEXT_PUBLIC_API_URL` when provided. If missing, during development default
// to the Railway backend so local dev talks to the deployed backend.
const RAILWAY_FALLBACK = 'https://remarkable-comfort-production-4a9a.up.railway.app'
// Prefer explicit env vars. If missing, default to the Railway backend
// This avoids falling back to localhost in production which can cause 404s.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || RAILWAY_FALLBACK

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.log(`[api] Using API_BASE=${API_BASE}`)
}
