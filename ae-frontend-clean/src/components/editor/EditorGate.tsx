"use client"

import { useEffect, useState } from 'react'
import EditorClientV2 from '@/app/editor/EditorClientV2'
import { useAuth } from '@/lib/auth/useAuth'
import LoginForm from '@/components/Auth/LoginForm'
import { useRouter } from 'next/navigation'
import { makeLoginUrl } from '@/lib/routes'
import { Logo } from '@/components/Logo'
import { BetaBadge } from '@/components/BetaBadge'
import { MobileNav } from '@/components/MobileNav'
import { UserNav } from '@/components/UserNav'
import UpgradeModal from '@/components/UpgradeModal'
import SubscriptionCard from '@/components/subscription/SubscriptionCard'
import { auth, db as firestore } from '@/lib/firebase/client'
import { doc, getDoc } from 'firebase/firestore'
import { isPremium } from '@/lib/subscription'

export default function EditorGate() {
  const { user, authReady } = useAuth()
  const router = useRouter()
  const [userDoc, setUserDoc] = useState<any | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  // TEMP debug: show who is causing redirects
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[auth]', { authReady, uid: user?.id, path: typeof window !== 'undefined' ? window.location.pathname : '' })
    } catch (_) {}
  }, [authReady, user])

  useEffect(() => {
    if (!authReady) return

    if (!user) {
      // Not signed in - redirect to /login preserving intended return path
      try {
        router.replace(`/login?next=${encodeURIComponent('/editor')}`)
      } catch (_) {}
      return
    }

    // Do NOT redirect to /pricing on mount. Editor view is allowed for all
    // authenticated users. Subscription checks should be performed at action
    // time (requirePremium).
  }, [authReady, user])

  // Show loading while waiting for authReady
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-8 w-8"></div>
          <p className="mt-4 text-white/60">Loading auth...</p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-3 text-xs text-white/60">{`authReady: ${String(authReady)}\nuser: ${user?.id ?? 'null'}\nurl: ${typeof window !== 'undefined' ? window.location.href : ''}`}</pre>
          )}
        </div>
      </div>
    )
  }

  // If not authenticated, we should have redirected; show fallback.
  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-8 w-8"></div>
          <p className="mt-4 text-white/60">Redirecting to sign in...</p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-3 text-xs text-white/60">{`authReady: ${String(authReady)}\nuser: ${user?.id ?? 'null'}\nurl: ${typeof window !== 'undefined' ? window.location.href : ''}`}</pre>
          )}
        </div>
      </div>
    )
  }

  // Load user doc to determine plan status for showing Upgrade CTA
  useEffect(() => {
    let active = true
    if (!authReady) return
    if (!user) {
      setUserDoc(null)
      return
    }

    const load = async () => {
      try {
        const ref = doc(firestore, 'users', user.id)
        const snap = await getDoc(ref)
        if (!active) return
        if (snap.exists()) setUserDoc(snap.data())
        else setUserDoc({ uid: user.id, plan: 'free', rendersLimit: 12, rendersUsed: 0 })
      } catch (e) {
        if (active) setUserDoc({ uid: user.id, plan: 'free', rendersLimit: 12, rendersUsed: 0 })
      }
    }
    load()
    return () => { active = false }
  }, [authReady, user])

  // Render editor inside a landing-style card and background to match landing page
  return (
    <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 -top-20 w-[520px] h-[520px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-80px] top-[20%] w-[360px] h-[360px] rounded-full bg-cyan-500/20 blur-[120px]" style={{ animationDelay: '1.2s' }} />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-16 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Logo />
          <span className="text-base sm:text-lg font-semibold tracking-tight">AutoEditor</span>
          <BetaBadge />
        </div>
        <div className="flex items-center gap-3">
          {/* Show Upgrade CTA for authenticated, non-premium users */}
          {user && userDoc && !isPremium(userDoc) && (
            <button
              onClick={() => setShowUpgrade(true)}
              className="rounded-full px-4 py-2 bg-amber-500/10 text-amber-200 text-sm font-semibold border border-amber-400/20 hover:bg-amber-500/20 transition-colors"
            >
              Upgrade
            </button>
          )}
          <MobileNav>
            <UserNav />
          </MobileNav>
        </div>
      </header>

      <main className="relative z-10 min-h-screen">
        {/* Premium badge overlay when the user has a premium plan */}
        {userDoc && isPremium(userDoc) && (
          <div className="absolute right-6 top-6 z-20 hidden sm:block">
            <span className="rounded-full bg-amber-400/10 text-amber-200 px-3 py-1 text-xs font-semibold">Pro</span>
          </div>
        )}

        {/* Render the editor full screen — EditorClientV2/EditorShell handle internal layout */}
        <div className="w-full">
          <EditorClientV2 />
        </div>

        {/* Floating subscription card removed — Sidebar renders the single SubscriptionCard inside the editor */}
      </main>

      {/* Upgrade modal (passes user plan info when available) */}
      <UpgradeModal
        isOpen={showUpgrade}
        currentPlanId={userDoc?.plan || 'free'}
        rendersUsed={userDoc?.rendersUsed ?? 0}
        rendersAllowed={userDoc?.rendersLimit ?? 12}
        onClose={() => setShowUpgrade(false)}
      />
    </div>
  )
}
