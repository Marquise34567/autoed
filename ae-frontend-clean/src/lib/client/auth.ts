/**
 * Client-side auth utilities
 * Used to check authentication before making sensitive API calls
 */
"use client";

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Check if user is currently authenticated
 * Returns user object if authenticated, null otherwise
 */
export async function checkAuth(): Promise<AuthUser | null> {
  try {

    // If Firebase not configured, avoid importing SDK and return null
    const { isFirebaseConfigured } = await import('@/lib/firebase.client')
      .then((m) => ({ isFirebaseConfigured: (m as any).isFirebaseConfigured || (() => false) }))
      .catch(() => ({ isFirebaseConfigured: () => false }));

    if (!isFirebaseConfigured()) return null;

    // Use Firebase client SDK to determine current user. If auth state isn't
    // initialized yet, wait briefly for onAuthStateChanged.
    const { auth } = await import('@/lib/firebase.client').then((m) => ({ auth: (m as any).auth ?? (m as any).default?.auth })).catch(() => ({ auth: null }));

    if (!auth) return null;

    // Do not create temporary listeners here. Rely on the single global
    // AuthProvider's onAuthStateChanged listener for deterministic state.
    if ((auth as any).currentUser) {
      const u = (auth as any).currentUser;
      return { id: u.uid, email: u.email };
    }

    return null;
  } catch (error) {
    console.error('[auth:checkAuth:exception] Failed to check authentication:', error);
    return null;
  }
}

/**
 * Require authentication or redirect to login
 * Used before making calls to protected endpoints
 */
import { makeLoginUrl } from '@/lib/routes'

export async function requireAuthOrRedirect(
  redirectTo: string,
  router: any
): Promise<AuthUser | null> {
  const user = await checkAuth();
  if (!user) {
    router.push(makeLoginUrl(redirectTo));
    return null;
  }
  return user;
}
