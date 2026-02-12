"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { makeLoginUrl } from '@/lib/routes'
import { auth } from '@/lib/firebase/client'
import { getRendersLeft, planFeatures } from '@/lib/plans'

export default function SubscriptionCard({ user }:{ user: any }){
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
    <div className="w-full h-full relative rounded-3xl p-6 sm:p-6 bg-linear-to-br from-[#071018]/85 via-[#09101a]/75 to-[#071018]/85 border border-white/6 ring-1 ring-white/6 shadow-2xl backdrop-blur-md overflow-auto transition-transform duration-300 hover:-translate-y-1">
      {/* Premium badge */}
      {plan !== 'free' && (
        <div className="absolute -top-3 -left-3 bg-linear-to-r from-[#7c3aed] to-[#06b6d4] text-xs text-white px-3 py-1 rounded-full shadow-2xl font-semibold ring-1 ring-white/8">PREMIUM</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-white/60 tracking-wider">Subscription</div>
          <div className="text-lg font-bold text-white mt-1">{plan?.toString().charAt(0).toUpperCase() + plan?.toString().slice(1)}</div>
          <div className="text-xs text-white/60 mt-1">{status === 'active' ? 'Active plan' : 'No active subscription'}</div>
        </div>
        <div className="flex flex-col items-end">
          <div className="px-2 py-1 rounded-full bg-white/6 text-xs text-white capitalize">{status}</div>
          <div className="text-xs text-white/50 mt-2">Renews</div>
          <div className="text-sm font-medium text-white">{renewDate}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-xs text-white/60">Renders left</div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">{rendersLeft === 'unlimited' ? '∞' : rendersLeft}</div>
            <div className="text-xs text-white/50">{rendersLeft === 'unlimited' ? 'Unlimited' : `of ${rendersLimit}`}</div>
          </div>
        </div>

        <div className="w-18 h-18 flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-16 h-16">
            <path className="text-white/6" d="M18 2a16 16 0 1 0 0 32 16 16 0 0 0 0-32Z" fill="currentColor" />
            <circle strokeWidth="3" strokeLinecap="round" stroke="url(#g)" strokeDasharray={`${Math.round(pct*100)},100`} cx="18" cy="18" r="14" fill="none" />
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="mt-4 text-sm text-white/70">Unlocked</div>
      <ul className="mt-2 text-xs text-white/60 space-y-2">
        {features.slice(0,4).map((f:string)=> (
          <li key={f} className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white text-xs">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {plan === 'free' ? (
          <>
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={trialLoading}
              className="col-span-2 inline-flex items-center justify-center gap-3 px-5 py-3 rounded-3xl bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white text-sm font-semibold shadow-[0_16px_40px_rgba(124,58,237,0.18)] hover:-translate-y-px transition-transform disabled:opacity-60"
            >
                {trialLoading ? 'Opening pricing…' : 'Start 7‑day free trial'}
            </button>
            <a href="/pricing" className="col-span-2 mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-3xl bg-white/6 text-white text-sm font-semibold shadow-sm">See pricing</a>
          </>
        ) : (
        <div className="relative">
            <input type="hidden" name="uid" value={user?.uid} />
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-3xl bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white font-semibold shadow-[0_8px_30px_rgba(99,102,241,0.18)]">Manage billing</button>
          </div>
        )}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-3xl bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white font-semibold shadow-[0_8px_30px_rgba(99,102,241,0.18)]"
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
