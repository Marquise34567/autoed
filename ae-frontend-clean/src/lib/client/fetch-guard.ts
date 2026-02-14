// Development-time safeguard to detect legacy signed-URL calls.
export function initFetchGuard() {
  if (typeof window === 'undefined') return
  try {
    // only enable in development to avoid affecting production behavior
    if (process.env.NODE_ENV !== 'development') return
  } catch (_) {
    return
  }

  const globalAny: any = window as any
  if (globalAny.__fetchGuardInstalled) return
  const origFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : (input as Request).url || ''
      if (url.includes('/api/upload-url') || url.includes('/api/upload')) {
        const msg = `Blocked legacy upload URL call: ${url}`
        // throw in dev to make the issue obvious; still log
        console.error(msg)
        throw new Error(msg)
      }
    } catch (e) {
      // if guarding fails for any reason, don't block the request
    }
    return origFetch(input, init)
  }
  globalAny.__fetchGuardInstalled = true
}
