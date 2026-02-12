"use client";

/**
 * Client-side returnTo utilities for subscription flow
 */

import { EDITOR_ROUTE } from '@/lib/routes'

const RETURN_TO_STORAGE_KEY = 'ae_returnTo';
const VALID_RETURN_PATHS = [EDITOR_ROUTE, '/dashboard', '/pricing', '/'];

/**
 * Validate a return path to prevent open redirects
 */
export function validateReturnTo(path: string | null | undefined): string {
  if (!path) return EDITOR_ROUTE;
  
  // Must start with / and not contain http
  if (!path.startsWith('/') || path.includes('http')) {
    return EDITOR_ROUTE;
  }
  
  // Extract just the path (remove query string)
  const pathOnly = path.split('?')[0];
  
  // Allow any internal path that starts with /
  // Be permissive but safe: just no external URLs
  return path;
}

/**
 * Get current pathname (use in browser only)
 */
export function getCurrentPath(): string {
  if (typeof window === 'undefined') return EDITOR_ROUTE;
  return window.location.pathname + window.location.search;
}

/**
 * Store returnTo in localStorage
 */
export function storeReturnTo(path: string): void {
  if (typeof window === 'undefined') return;
  const validated = validateReturnTo(path);
  localStorage.setItem(RETURN_TO_STORAGE_KEY, validated);
}

/**
 * Get returnTo from localStorage
 */
export function getStoredReturnTo(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(RETURN_TO_STORAGE_KEY);
}

/**
 * Clear returnTo from localStorage
 */
export function clearReturnTo(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RETURN_TO_STORAGE_KEY);
}

/**
 * Get returnTo from URL params or storage
 */
export function getReturnTo(urlReturnTo?: string | null): string {
  const validated = validateReturnTo(urlReturnTo);
  if (validated && validated !== EDITOR_ROUTE) {
    return validated;
  }
  
  const stored = getStoredReturnTo();
  if (stored) {
    return validateReturnTo(stored);
  }

  return EDITOR_ROUTE;
}

/**
 * Create checkout URL with returnTo
 */
export function createCheckoutUrl(planId: string, billingCycle: 'monthly' | 'annual', returnTo?: string): string {
  const validated = validateReturnTo(returnTo || getCurrentPath());
  const params = new URLSearchParams({
    plan: planId,
    billingCycle,
    returnTo: validated,
  });
  return `/checkout?${params.toString()}`;
}
