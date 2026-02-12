// Central route constants
export const LOGIN_ROUTE = '/login'
export const EDITOR_ROUTE = '/editor'

export function makeLoginUrl(returnTo?: string) {
  if (!returnTo) return LOGIN_ROUTE
  const safe = returnTo.startsWith('/') ? returnTo : undefined
  return safe ? `${LOGIN_ROUTE}?returnTo=${encodeURIComponent(safe)}` : LOGIN_ROUTE
}

export function isSafeReturnPath(path?: string | null) {
  if (!path) return false
  if (!path.startsWith('/')) return false
  if (path.includes('http')) return false
  return true
}
