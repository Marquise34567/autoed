// Central API base URL for frontend network requests.
// Use `NEXT_PUBLIC_API_URL` in your Vercel environment to point to your backend.
// IMPORTANT: We avoid hardcoding production backend URLs in source to prevent
// browsers from calling the backend directly. The frontend should call
// Next.js proxy routes (e.g. `/api/proxy/...`) which forward to the backend.
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL && String(process.env.NEXT_PUBLIC_API_URL).trim()) || ''

if (!API_BASE) {
	/* eslint-disable no-console */
	console.warn('[api] NEXT_PUBLIC_API_URL is not set; using proxy routes (/api/proxy/...)')
	/* eslint-enable no-console */
}
