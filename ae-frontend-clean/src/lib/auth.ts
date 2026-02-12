/**
 * Auth Utilities
 * Server-side auth helpers for protected routes and data fetching
 */

import { createSupabaseServerClient } from './supabaseServer'
import { redirect } from 'next/navigation'

/**
 * Get the currently authenticated user on the server
 * Returns null if not authenticated
 */
export async function getUserServer() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('[auth] Failed to get user:', error)
    return null
  }
}

/**
 * Require user to be authenticated, otherwise redirect to login
 * Use this in Server Components or API routes that need auth
 */
export async function requireUserServer(returnTo?: string) {
  const user = await getUserServer()
  if (!user) {
    const path = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login'
    redirect(path)
  }
  return user
}
