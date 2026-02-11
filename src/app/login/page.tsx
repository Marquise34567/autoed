'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { MobileNav } from '@/components/MobileNav';
import { UserNav } from '@/components/UserNav';
// Note: Using server-backed session endpoints (Firebase) for auth
import { trackPostHogEvent, trackPlausibleEvent } from '@/lib/analytics/client';
import { auth } from '@/lib/firebase.client'
import { signInWithEmailAndPassword } from 'firebase/auth'

type FormMode = 'login' | 'signup';

function AuthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initialMode = (searchParams.get('mode') as FormMode) || 'login';
  const [mode, setMode] = useState<FormMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check session on mount via server /api/auth/me (Firebase session cookie)
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('[login] Checking existing session via /api/auth/me...');
        const resp = await fetch('/api/auth/me', { method: 'GET' })
        const json = await resp.json().catch(() => null)
        if (resp.ok && json?.success && json.user) {
          console.log('[login] Active session found:', json.user.email)
          setIsLoggedIn(true)
        } else {
          console.log('[login] No active session')
        }
      } catch (err) {
        console.error('[login] Failed to check session:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      console.log('[login] User logged in, redirecting to /editor');
      router.replace('/editor');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-8 w-8"></div>
          <p className="mt-4 text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
        if (mode === 'login') {
        console.log('[login] Starting login for:', email);

        // Validate login form
        if (!email || !password) {
          setError('Email and password required');
          setIsSubmitting(false);
          return;
        }

          // Client-side Firebase sign-in (Web SDK)
          try {
            const auth = auth
            const cred = await signInWithEmailAndPassword(auth, email, password)
            const user = cred.user
            const idToken = await user.getIdToken()

            const resp = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
              credentials: 'include',
            })

            const json = await resp.json().catch(() => null)
            if (!resp.ok) {
              const msg = json?.error || resp.statusText || `HTTP ${resp.status}`
              console.error('[login] Login error (server):', msg)
              setError(msg || 'Invalid email or password')
              setIsSubmitting(false)
              return
            }

            console.log('[login] Login successful (server)')
            trackPostHogEvent('login_completed')
            trackPlausibleEvent('LoginSuccess')

            const rawNext = searchParams.get('next') || '/editor'
            const nextParam = rawNext.startsWith('/') ? rawNext : '/editor'
            router.replace(nextParam)
            return
          } catch (e: any) {
            console.error('[login] Client sign-in failed:', e)
            setError(e?.message || 'Login failed')
            setIsSubmitting(false)
            return
          }
      } else {
        console.log('[signup] Starting signup for:', email);
        trackPlausibleEvent('SignupClick');
        
        // Validate signup form
        if (!email || !password || !confirmPassword) {
          setError('All fields required');
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsSubmitting(false);
          return;
        }

        // Sign up via server Firebase endpoint
        try {
          const resp = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, confirmPassword }),
          });

          const json = await resp.json().catch(() => null);
          if (!resp.ok || !json?.success) {
            const msg = json?.error || resp.statusText || `HTTP ${resp.status}`;
            console.error('[signup] Signup error (server):', msg);
            setError(msg || 'Signup failed');
            setIsSubmitting(false);
            return;
          }

          console.log('[signup] Signup successful (server):', json.user?.email);
          trackPostHogEvent('signup_completed');

          // After server sets session cookie, confirm /api/auth/me and navigate
          const nextParam = searchParams.get('next') || '/pricing';
          const confirm = async () => {
            for (let i = 0; i < 6; i++) {
              try {
                const r = await fetch('/api/auth/me');
                if (r.ok) {
                  const j = await r.json().catch(() => null);
                  if (j?.success && j.user) return true;
                }
              } catch {}
              await new Promise((r) => setTimeout(r, 250));
            }
            return false;
          };

          // Navigate immediately after signup; keep confirmation as a background fallback
          router.replace(nextParam)
          (async () => {
            const confirm = async () => {
              for (let i = 0; i < 6; i++) {
                try {
                  const r = await fetch('/api/auth/me');
                  if (r.ok) {
                    const j = await r.json().catch(() => null);
                    if (j?.success && j.user) return true;
                  }
                } catch {}
                await new Promise((r) => setTimeout(r, 250));
              }
              return false;
            };
            const ok = await confirm();
            if (!ok) console.error('[signup] Session confirmation failed after signup');
          })();
          return;
        } catch (fetchErr) {
          console.error('[signup] Fetch signup failed:', fetchErr);
          setError('Network error during signup');
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err) {
      console.error('[auth] Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
      {/* Background gradient blurs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-90 w-90 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-16 py-4 sm:py-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition">
          <Logo />
          <span className="text-base sm:text-lg font-semibold tracking-tight">AutoEditor</span>
        </Link>
        <MobileNav>
          <UserNav />
        </MobileNav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-xl backdrop-blur">
            {/* Content Header */}
            <div className="mb-6 sm:mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-semibold">
                {mode === 'login' ? 'Welcome back' : 'Start your journey'}
              </h1>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-white/70 px-2">
                {mode === 'login'
                  ? 'Sign in to your account and access the editor'
                  : 'Create an account to turn videos into amazing clips'}
              </p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 sm:mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-3 sm:p-4 text-xs sm:text-sm text-green-300">
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 sm:mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 sm:p-4 text-xs sm:text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 sm:py-2.5 text-base sm:text-sm text-white placeholder-white/40 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 min-h-12"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 sm:py-2.5 text-base sm:text-sm text-white placeholder-white/40 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 min-h-12"
                />
              </div>

              {/* Confirm Password (Signup only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Re-enter your password"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 sm:py-2.5 text-base sm:text-sm text-white placeholder-white/40 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 min-h-12"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-white px-6 py-3.5 sm:py-2.5 text-base sm:text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 min-h-12"
              >
                {isSubmitting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                )}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center text-sm sm:text-xs text-white/70">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('signup');
                      setError('');
                      setSuccessMessage('');
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="font-semibold text-white hover:text-white/80 transition inline-flex items-center min-h-11"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccessMessage('');
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="font-semibold text-white hover:text-white/80 transition inline-flex items-center min-h-11"
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Back to Home Link */}
          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-white/60 hover:text-white transition">
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}