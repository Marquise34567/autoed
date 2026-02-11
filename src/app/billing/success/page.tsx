"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth, db } from '@/lib/firebaseClient'
import { doc, onSnapshot } from 'firebase/firestore'

export default function BillingSuccessPage() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params?.get('session_id')
  const [message, setMessage] = useState('Waiting for confirmation...')

  useEffect(() => {
    let unsub: (() => void) | undefined
    let timer: any
    async function waitForStatus() {
      const user = auth.currentUser
      if (!user) {
        setMessage('Please sign in to complete setup. Redirecting to login...')
        setTimeout(() => router.push('/login?next=/billing/success'), 1500)
        return
      }

      const userRef = doc(db, 'users', user.uid)
      try {
        unsub = onSnapshot(userRef, (snap) => {
          const data = snap.exists() ? snap.data() as any : null
          const status = data?.status
          if (status === 'active' || status === 'trialing') {
            setMessage('Subscription confirmed — redirecting to editor...')
            setTimeout(() => router.push('/editor'), 800)
            if (unsub) unsub()
          } else {
            setMessage('Waiting for payment confirmation...')
          }
        }, (err) => {
          console.error('[billing success] snapshot error', err)
          // Avoid uncaught permission-denied errors; show helpful message
          setMessage('Waiting for confirmation (snapshot error). If this persists, check authentication and Firestore rules.')
        })
      } catch (err) {
        console.error('[billing success] failed to subscribe', err)
        setMessage('Unable to subscribe to status updates. Redirecting to /editor...')
        timer = setTimeout(() => router.push('/editor'), 2500)
      }
    }

    waitForStatus()

    return () => {
      if (unsub) unsub()
      if (timer) clearTimeout(timer)
    }
  }, [router, sessionId])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Thank you — completing setup</h1>
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}
'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { trackPostHogEvent, trackPlausibleEvent } from '@/lib/analytics/client';

interface BillingStatus {
  plan: string;
  status: string;
  billingMode: string;
}

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const upgradeTrackedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string>('');
  const [timedOut, setTimedOut] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setStatus('error');
      return;
    }

    // Listen for Firestore user doc changes - webhook will update the user document when subscription is active
    let unsub: () => void = () => {}
    ;(async () => {
      try {
        if (!sessionId) return
        console.log('[billing-success] Listening for Firestore user update for session:', sessionId)

        // We expect Stripe webhook to write users/{uid} doc. To map session -> uid, we can fetch the session from Stripe using a server endpoint.
        const resp = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`)
        const json = await resp.json()
        if (!resp.ok) throw new Error(json.error || 'Failed to lookup session')
        const uid = json.uid
        if (!uid) throw new Error('Session missing uid')

        // Listen to Firestore doc
        const { auth, db } = await import('@/lib/firebase.client')
        const { doc, onSnapshot } = await import('firebase/firestore')
        const userDoc = doc(auth.firestore, 'users', uid)
        const snapUnsub = onSnapshot(userDoc, (snap) => {
          const data = snap.data()
          const status = data?.status || data?.subscriptionStatus || 'inactive'
          const plan = data?.plan || 'free'
          setBillingStatus({ plan, status, billingMode: data?.billingMode || 'live' })
          if (status === 'active' || status === 'trialing') {
            // redirect to editor
            router.replace('/editor')
          }
        })
        // store unsubscribe and mark page ready
        unsub = snapUnsub
        setStatus('success')

        // start a 30s timeout — if webhook doesn't update Firestore, show retry UI
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = window.setTimeout(() => {
          setTimedOut(true)
        }, 30000)
      } catch (err) {
        console.error('[billing-success] Error setting up listener', err)
        setError('Failed to confirm subscription')
        setStatus('error')
      }
    })()
    return () => {
      try {
        unsub()
      } catch (e) {}
      try {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      } catch (e) {}
    }
  }, [sessionId]);

  const handleRetry = async () => {
    setTimedOut(false)
    try {
      if (!sessionId) return
      // Re-check session -> uid and fetch the user doc once
      const resp = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`)
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Failed to lookup session')
      const uid = json.uid
      if (!uid) throw new Error('Session missing uid')

      const { auth, db } = await import('@/lib/firebase.client')
      const { doc, getDoc } = await import('firebase/firestore')
      const userDoc = doc(auth.firestore, 'users', uid)
      const snap = await getDoc(userDoc)
      const data = snap.data()
      const status = data?.status || data?.subscriptionStatus || 'inactive'
      const plan = data?.plan || 'free'
      setBillingStatus({ plan, status, billingMode: data?.billingMode || 'live' })

      if (status === 'active' || status === 'trialing') {
        // clear timeout and redirect
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
        router.replace('/editor')
        return
      }

      // restart the 30s timer
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setTimedOut(true), 30000)
    } catch (err) {
      console.error('[billing-success] retry failed', err)
      setError('Retry failed — please try again.')
      setTimedOut(true)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-12 w-12 mb-4"></div>
          <p className="text-lg text-white/70">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
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
        </header>

        {/* Error Content */}
        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 sm:px-6">
          <div className="w-full max-w-md">
            <div className="rounded-2xl sm:rounded-3xl border border-red-500/50 bg-red-500/10 p-6 sm:p-8 shadow-xl backdrop-blur">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">✕</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold mb-3">Payment Error</h1>
                <p className="text-white/70 mb-6">{error}</p>
                <div className="flex gap-3">
                  <Link
                    href="/pricing"
                    className="flex-1 rounded-full bg-white/10 border border-white/20 px-4 py-3 text-sm font-semibold hover:bg-white/20 transition"
                  >
                    Try Again
                  </Link>
                  <Link
                    href="/editor"
                    className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-white/90 transition"
                  >
                    Continue
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Success state
  const isPending = billingStatus?.status === 'pending';
  const isActive = billingStatus?.status === 'active';

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
      </header>

      {/* Success Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-xl backdrop-blur">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <span className="text-4xl">✓</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-semibold mb-3">
                Payment Successful!
              </h1>

              <p className="text-white/70 mb-6">
                Thank you for subscribing to the{' '}
                <span className="font-semibold text-white capitalize">{billingStatus?.plan}</span> plan.
              </p>

              {/* Status Badge */}
              {isPending && (
                <div className="mb-6 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                  <p className="text-sm text-yellow-200">
                    <strong>Status: Activation Pending</strong>
                  </p>
                  <p className="text-xs text-yellow-200/70 mt-2">
                    {billingStatus?.billingMode === 'soft' ? (
                      'Test mode: Use manual activation to unlock features'
                    ) : (
                      'Your subscription will be activated shortly'
                    )}
                  </p>
                </div>
              )}

              {isActive && (
                <div className="mb-6 p-4 rounded-lg border border-green-500/50 bg-green-500/10">
                  <p className="text-sm text-green-200">
                    <strong>Status: Active</strong>
                  </p>
                  <p className="text-xs text-green-200/70 mt-2">
                    Your subscription is now active. Start creating!
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {timedOut && billingStatus?.status !== 'active' && billingStatus?.status !== 'trialing' && (
                  <div className="mb-4 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                    <p className="text-sm text-yellow-200 mb-2"><strong>Activation taking longer than expected</strong></p>
                    <p className="text-xs text-yellow-200/70 mb-3">We haven't received confirmation yet — this can take a few seconds. You can retry or wait a moment.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRetry}
                        className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                      >
                        Retry
                      </button>
                      <Link
                        href="/support"
                        className="flex-1 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                      >
                        Get help
                      </Link>
                    </div>
                  </div>
                )}
                <Link
                  href="/editor"
                  className="block w-full rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-white/90"
                >
                  Go to Editor
                </Link>
                <Link
                  href="/pricing"
                  className="block w-full rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-12 w-12"></div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
