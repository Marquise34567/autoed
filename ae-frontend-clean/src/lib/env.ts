/**
 * Server-side environment helpers.
 * Use these from server code to read required env vars and emit friendly errors.
 */

export function getRequiredServerEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    // Throwing here surfaces a clear error message during server build/runtime.
    throw new Error(`Required server env var ${name} is not set`)
  }
  return v
}

export const REQUIRED = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '',
}

export default {
  getRequiredServerEnv,
  REQUIRED,
}
/**
 * Environment Variable Helpers
 * 
 * Centralized, type-safe access to environment variables.
 * All values are read at module load time to ensure consistency.
 */

/**
 * Check if billing is live in production.
 * BILLING_LIVE must be explicitly set to "true" (case-sensitive).
 * 
 * This is a server-only variable - use only in API routes, server actions, or components.
 */
export const BILLING_LIVE = process.env.BILLING_LIVE === "true";

/**
 * Check if we're in development mode.
 * Used to show dev-only UI elements and debug panels.
 */
export const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Get the app URL (for redirects and links).
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

/**
 * Stripe public key (safe to expose to client).
 */
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/**
 * Supabase URL (safe to expose to client).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Supabase anon key (safe to expose to client).
 */
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
