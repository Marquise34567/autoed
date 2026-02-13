// Central API base URL for frontend network requests.
// Use `NEXT_PUBLIC_API_URL` when provided. If missing, during development default
// to the Railway backend so local dev talks to the deployed backend.
const RAILWAY_FALLBACK = 'https://remarkable-comfort-production-4a9a.up.railway.app'
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'development' ? RAILWAY_FALLBACK : 'http://localhost:5000')

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.log(`[api] Using API_BASE=${API_BASE}`)
}
