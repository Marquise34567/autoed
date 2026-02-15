// Utility to build absolute backend API URLs from a single env var.
export function apiUrl(path: string): string {
  const envBase = (process.env.NEXT_PUBLIC_API_BASE_URL && String(process.env.NEXT_PUBLIC_API_BASE_URL).trim()) || (process.env.NEXT_PUBLIC_API_URL && String(process.env.NEXT_PUBLIC_API_URL).trim()) || ''
  const base = envBase.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  if (!base) {
    // If no base is configured, return the path as-is (relative). Caller should handle warnings.
    try { console.warn('[apiUrl] NEXT_PUBLIC_API_BASE_URL not set; using relative path', p) } catch (_) {}
    return p
  }
  return `${base}${p}`
}

export default apiUrl
