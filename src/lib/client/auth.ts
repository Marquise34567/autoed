/**
 * Client-side auth utilities
 * Used to check authentication before making sensitive API calls
 */

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
    console.log('[auth:checkAuth] Calling /api/auth/me with credentials:include...');
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    console.log('[auth:checkAuth] Response status:', response.status);
    console.log('[auth:checkAuth] Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('[auth:checkAuth:unauthorized] Not authenticated. Status:', response.status);
      console.log('[auth:checkAuth:unauthorized] Error detail:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('[auth:checkAuth] Response data:', { success: data.success, hasUser: !!data.user });
    
    if (data.user) {
      console.log('[auth:checkAuth:success] User authenticated:', data.user.id);
      return data.user;
    }

    console.log('[auth:checkAuth:no_user] Response ok but no user in data');
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
export async function requireAuthOrRedirect(
  redirectTo: string,
  router: any
): Promise<AuthUser | null> {
  const user = await checkAuth();

  if (!user) {
    console.log('[auth] Unauthorized attempt, redirecting to login. Will return to:', redirectTo);
    // Redirect to login with callback
    const loginUrl = `/login?redirect=${encodeURIComponent(redirectTo)}`;
    router.push(loginUrl);
    return null;
  }

  return user;
}
