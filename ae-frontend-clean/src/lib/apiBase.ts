// Utility to build absolute backend API URLs from a single env var.
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  // On the client (browser) always return a relative path so requests are
  // same-origin and will hit the Next.js app. The server-side will resolve
  // to the configured backend URL when needed.
  if (typeof window !== 'undefined') return p

  const envBase = (process.env.NEXT_PUBLIC_API_BASE_URL && String(process.env.NEXT_PUBLIC_API_BASE_URL).trim()) || (process.env.NEXT_PUBLIC_API_URL && String(process.env.NEXT_PUBLIC_API_URL).trim()) || ''
  const base = envBase.replace(/\/+$/, '')
  if (!base) {
    try { console.warn('[apiUrl] NEXT_PUBLIC_API_BASE_URL not set; using relative path', p) } catch (_) {}
    return p
  }
  return `${base}${p}`
}

export default apiUrl
