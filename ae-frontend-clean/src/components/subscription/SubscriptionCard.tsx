"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { makeLoginUrl } from '@/lib/routes'
import { auth, isFirebaseConfigured } from '@/lib/firebase.client'
import { getRendersLeft, planFeatures } from '@/lib/plans'

export default function SubscriptionCard({ user }:{ user: any }){
  if (!isFirebaseConfigured()) {
    return (
      <div className="w-full h-full relative rounded-3xl p-6 bg-linear-to-br from-[#071018]/85 via-[#09101a]/75 to-[#071018]/85 border border-white/6 ring-1 ring-white/6 shadow-2xl backdrop-blur-md text-center">
        <div className="text-sm text-yellow-300">Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars in Vercel.</div>
      </div>
    )
  }
  const router = useRouter()
  const plan = (user?.plan || 'free')
  const status = user?.subscriptionStatus || (plan === 'free' ? 'inactive' : 'active')
  const rendersLeft = getRendersLeft({ rendersLimit: user?.rendersLimit, rendersUsed: user?.rendersUsed })
  const features = planFeatures(plan)

  const renewDate = user?.currentPeriodEnd ? new Date(user.currentPeriodEnd.seconds * 1000).toLocaleDateString() : (user?.trialEnd ? new Date(user.trialEnd.seconds * 1000).toLocaleDateString() : '—')

  const rendersNumeric = rendersLeft === 'unlimited' ? null : Number(rendersLeft)
  const rendersLimit = user?.rendersLimit || (plan === 'free' ? 12 : (plan === 'starter' ? 100 : 1000))
  const pct = rendersNumeric === null ? 1 : Math.max(0, Math.min(1, rendersNumeric / rendersLimit))

  const [loading, setLoading] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      const { signOut } = await import('firebase/auth')
      await signOut(auth)
    } catch (e) {
      // proceed to redirect regardless
    } finally {
      router.replace('/')
    }
  }

  const handleStartTrial = async () => {
    // Redirect users to the pricing page to start a trial or choose a plan.
    // We intentionally do not start trials directly from this card to centralize pricing flows.
    try {
      router.push('/pricing')
    } catch (e) {
      window.location.href = '/pricing'
    }
  }

  return (
    <div className="w-full h-full relative rounded-2xl p-6 sm:p-6 bg-gradient-to-br from-[#04050a] via-[#071018] to-[#07101a] border border-white/6 shadow-[0_30px_60px_rgba(3,6,23,0.7)] backdrop-blur-lg overflow-hidden transition-transform duration-300 hover:-translate-y-1">
      {/* Plan badge */}
      <div className="absolute -top-4 -left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-md" style={{background: plan !== 'free' ? 'linear-gradient(90deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.06)'}}>
        {plan !== 'free' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l2.9 6.26L21 9.27l-5 3.86L17.8 21 12 17.77 6.2 21 7 13.13 2 9.27l6.1-1.01L12 2z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="1.2"/></svg>
        )}
        <span>{plan !== 'free' ? 'PREMIUM' : 'FREE'}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-white/60 tracking-wider">Subscription</div>
          <div className="text-2xl font-extrabold text-white mt-1">{plan?.toString().charAt(0).toUpperCase() + plan?.toString().slice(1)}</div>
          <div className="text-sm text-white/60 mt-1">{status === 'active' ? 'Active plan' : 'No active subscription'}</div>
        </div>
        <div className="flex flex-col items-end">
          <div className="px-3 py-1 rounded-full bg-white/6 text-xs text-white capitalize">{status}</div>
          <div className="text-xs text-white/50 mt-2">Renews</div>
          <div className="text-sm font-medium text-white">{renewDate}</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-xs text-white/60">Renders left</div>
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-extrabold text-white tracking-tight">{rendersLeft === 'unlimited' ? '∞' : rendersLeft}</div>
            <div className="text-sm text-white/50">{rendersLeft === 'unlimited' ? 'Unlimited' : `of ${rendersLimit}`}</div>
          </div>
        </div>

        <div className="w-20 h-20 flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-20 h-20">
            <circle cx="18" cy="18" r="16" fill="rgba(255,255,255,0.02)" />
            <circle strokeWidth="3.5" strokeLinecap="round" stroke="url(#g)" strokeDasharray={`${Math.round(pct*100)},100`} cx="18" cy="18" r="12" fill="none" />
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="mt-5 text-sm text-white/70">Unlocked</div>
      <ul className="mt-3 text-sm text-white/70 grid grid-cols-1 gap-2">
        {features.slice(0,4).map((f:string)=> (
          <li key={f} className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white text-xs shadow">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {plan === 'free' ? (
          <>
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={trialLoading}
              className="col-span-2 inline-flex items-center justify-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white text-sm font-semibold shadow-[0_20px_50px_rgba(99,102,241,0.12)] hover:-translate-y-px transition-transform disabled:opacity-60"
            >
                {trialLoading ? 'Opening pricing…' : 'Start 7‑day free trial'}
            </button>
            <a href="/pricing" className="col-span-2 mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-white/8 text-white text-sm font-semibold">See pricing</a>
          </>
        ) : (
        <form className="relative" action="/api/manage-billing" method="post">
            <input type="hidden" name="uid" value={user?.uid ?? ''} />
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-white font-semibold shadow-[0_12px_40px_rgba(99,102,241,0.12)]">Manage billing</button>
        </form>
        )}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-white/12 bg-transparent text-white font-semibold hover:bg-white/6 transition"
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
