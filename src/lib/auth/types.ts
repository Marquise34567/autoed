/**
 * Authentication Types
 * Shared types for auth system
 */

export interface User {
  id: string;
  email: string;
  createdAt: number;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export type AuthMode = 'login' | 'signup';
