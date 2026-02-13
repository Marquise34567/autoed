"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, authReady } = useAuth()
  const [status, setStatus] = useState<'pending'|'active'|'failed'|'unknown'>('pending')
  const [plan, setPlan] = useState<string | null>(null)

  const sessionId = searchParams?.get('session_id') || ''
  const next = searchParams?.get('next') || '/editor'

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      // Not signed in - redirect to login retaining next -> this page will reload after sign in
      router.replace(`/login?next=/payment-success?session_id=${encodeURIComponent(sessionId)}&next=${encodeURIComponent(next)}`)
      return
    }

    const uid = auth.currentUser?.uid || user.id || (user as any)?.uid
    const userDocRef = doc(db, 'users', uid)
    const unsub = onSnapshot(userDocRef, (snap) => {
      const data = (snap.exists() ? snap.data() : null) as any
      const planVal = data?.plan || null
      const statusVal = data?.status || null
      setPlan(planVal)
      if (statusVal === 'active' || statusVal === 'trialing') {
        setStatus('active')
      } else if (statusVal === 'incomplete' || statusVal === 'past_due' || statusVal === 'canceled') {
        setStatus('failed')
      } else {
        setStatus('pending')
      }
    }, (err) => {
      console.warn('payment-success: snapshot error', err)
      setStatus('unknown')
    })

    return () => unsub()
  }, [authReady, user, sessionId])

  useEffect(() => {
    if (status === 'active') {
      // short delay so user can see the animation and message
      const t = setTimeout(() => {
        router.replace(next)
      }, 2200)
      return () => clearTimeout(t)
    }
  }, [status, next])

  return (
    <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
      <div className="relative w-full max-w-2xl">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-20%] h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
          <div className="absolute right-[-10%] top-[20%] h-90 w-90 rounded-full bg-cyan-500/20 blur-[120px]" />
        </div>

        <div className="relative z-10 rounded-2xl sm:rounded-3xl border border-white/10 bg-linear-to-b from-white/5 to-white/0 p-8 sm:p-12 backdrop-blur text-center">
          <div className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-blue-400 flex items-center justify-center shadow-lg mb-6 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-12 h-12 text-white"><path fill="currentColor" d="M12 2l2.9 6.3L21 9l-5 3.8L17.8 19 12 15.9 6.2 19 7 12.8 2 9l6.1-0.7L12 2z"/></svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold">Thanks — you're all set{plan ? ` (${plan})` : ''}!</h1>
          <p className="mt-3 text-white/70">We received your payment. Your premium features will be available shortly.</p>

          <div className="mt-8">
            {status === 'pending' && <p className="text-white/60">Activating subscription…</p>}
            {status === 'active' && <p className="text-emerald-400 font-semibold">Subscription active — redirecting…</p>}
            {status === 'failed' && <p className="text-red-400">Subscription not active yet. If you believe this is an error, contact support.</p>}
            {status === 'unknown' && <p className="text-white/60">Checking status…</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
