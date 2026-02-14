"use client"

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { EDITOR_ROUTE } from '@/lib/routes'

export default function LoginForm({ initialMode }: { initialMode?: 'login' | 'signup' } = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, signup, user, authReady } = useAuth()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // TEMP debug: show auth state in login form
  React.useEffect(() => {
    try {
      console.log('[auth]', { authReady, uid: user?.id, path: typeof window !== 'undefined' ? window.location.pathname : '' })
    } catch (_) {}
  }, [authReady, user])

  const paramMode = searchParams?.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState<'login'|'signup'>(initialMode || paramMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const nextParamRaw = searchParams?.get('redirect') || searchParams?.get('next') || searchParams?.get('returnTo')
      const nextParam = nextParamRaw && nextParamRaw.startsWith('/') ? nextParamRaw : EDITOR_ROUTE

      if (mode === 'signup') {
        if (!email || !password || !confirmPassword) throw new Error('All fields required')
        if (password !== confirmPassword) throw new Error('Passwords do not match')
        if (password.length < 6) throw new Error('Password must be at least 6 characters')
        // Create account
        await signup(email, password)
        // Ensure user is signed in, then redirect to editor
        try {
          await login(email, password)
        } catch (loginErr) {
          // If login after signup fails, surface error
          throw loginErr
        }
        router.replace(nextParam)
        return
      }

      // login flow
      if (mode === 'login') {
        if (!email || !password) throw new Error('Email and password required')
        await login(email, password)
        router.replace(nextParam)
        return
      }
    } catch (e: any) {
      const code = e?.code || ''
      let message = e?.message || 'Authentication failed'
      if (code === 'auth/invalid-credential' || code === 'auth/invalid-api-key') {
        message = 'Authentication configuration error. Please verify your Firebase API key and auth settings.'
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-password') {
        message = 'Invalid email or password.'
      } else if (code === 'auth/user-not-found') {
        message = 'No account found for that email.'
      } else if (code === 'auth/too-many-requests') {
        message = 'Too many login attempts. Please try again later.'
      } else if (code === 'auth/email-already-in-use') {
        message = 'An account with that email already exists.'
      } else if (code === 'auth/invalid-email') {
        message = 'Invalid email address.'
      } else if (code === 'auth/weak-password') {
        message = 'Password is too weak.'
      }
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <div className={`rounded-2xl sm:rounded-3xl border border-white/10 bg-linear-to-b from-white/5 to-white/0 p-6 sm:p-8 shadow-xl backdrop-blur transform transition-all duration-500 ease-out ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}>
        <div className="mb-6 sm:mb-8 text-center">
          <img src="/favicon.svg" alt="AutoEditor" className="mx-auto h-10 w-auto mb-3" />
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/70 mx-auto">AutoEditor</div>
          <h1 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/70">{mode === 'login' ? 'Sign in to access the editor and your projects' : 'Create an account to start transforming your videos'}</p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-red-300 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Email Address</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white placeholder-white/40" />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white placeholder-white/40" />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white placeholder-white/40" />
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-white px-6 py-3.5 text-base font-semibold text-black">
            {isSubmitting ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/70">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={()=>{ setMode('signup'); setError(null); }} className="font-semibold">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={()=>{ setMode('login'); setError(null); }} className="font-semibold">Log in</button></>
          )}
        </div>
      </div>
    </div>
  )
}
