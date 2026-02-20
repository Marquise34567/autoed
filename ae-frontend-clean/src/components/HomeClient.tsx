"use client";

import Link from "next/link";
import { UserNav } from "@/components/UserNav";
import { Logo } from "@/components/Logo";
import { BetaBadge } from "@/components/BetaBadge";
import { MobileNav } from "@/components/MobileNav";
import { PLANS } from "@/config/plans";
import { EDITOR_ROUTE, LOGIN_ROUTE } from '@/lib/routes'
import { useAuth } from '@/lib/auth/useAuth'
import { useState } from 'react'
import HomeDemoEditor from '@/components/HomeDemoEditor'
import LoginForm from '@/components/Auth/LoginForm'
import WaitlistModal from '@/components/WaitlistModal'

export default function HomeClient() {
  const { user, authReady } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [showWaitlist, setShowWaitlist] = useState(false)

  return (
    <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-90 w-90 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-16 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Logo />
          <span className="text-base sm:text-lg font-semibold tracking-tight">AutoEditor</span>
          <BetaBadge />
        </div>
        <div className="flex items-center gap-4">
          {!authReady || !user ? (
            <>
              <button onClick={()=>{ setShowAuthModal(true); setAuthMode('login') }} className="rounded-full border border-white/20 px-4 py-2 text-white/80 transition hover:border-white/40 hover:text-white">Sign in</button>
              <button onClick={()=>{ setShowAuthModal(true); setAuthMode('signup') }} className="rounded-full bg-linear-to-r from-pink-500 to-yellow-400 text-black font-semibold px-4 py-2">Sign up</button>
            </>
          ) : null}
          <MobileNav>
            <UserNav />
          </MobileNav>
        </div>
      </header>

      <main className="relative z-10 overflow-x-hidden">
        <section className="mx-auto flex max-w-6xl flex-col items-center px-4 sm:px-6 lg:px-16 pb-12 sm:pb-20 pt-8 sm:pt-12 lg:pt-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/70">
            Premium AI Auto-Editor
          </div>
          <h1 className="mt-6 sm:mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white/95 to-slate-200/80 px-2">
            We Built an Editor That Thinks Like Top Creators.
          </h1>
          <p className="mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-white/70 px-4">
            AutoEditor analyzes your footage, identifies the best moments, selects
            the perfect hook, and renders creator-ready clips with studio-grade
            audio enhancement.
          </p>

          {/* Under construction ribbon + premium join button */}
          <div className="mt-6 flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/6 border border-white/10 px-3 py-1 text-sm text-white/80">
              <span className="font-semibold">Under Construction</span>
              <span className="text-xs text-white/60">Launching soon</span>
            </div>
            <button
              onClick={() => setShowWaitlist(true)}
              className="rounded-full px-4 py-2 bg-linear-to-r from-pink-500 to-yellow-400 text-black font-semibold shadow-md hover:brightness-105 transition"
            >
              Join Waitlist
            </button>
          </div>
          {!user && (
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto px-4 sm:px-0">
              <Link className="transition hover:text-white" href={`${LOGIN_ROUTE}?mode=signup`}>
                Sign Up
              </Link>
            </div>
          )}

          {/* Editor Demo Preview */}
          {!user && (
            <div className="mt-10 sm:mt-16 mx-auto max-w-4xl w-full px-2 sm:px-0">
              <HomeDemoEditor />
            </div>
          )}
        
        {/* Auth Modal for landing page only */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowAuthModal(false)} />
            <div className="relative z-10 max-w-lg w-full mx-4">
              <div className="p-2">
                <LoginForm initialMode={authMode} />
              </div>
            </div>
          </div>
        )}
        {showWaitlist && (
          <WaitlistModal open={showWaitlist} onClose={() => setShowWaitlist(false)} />
        )}
        </section>
      </main>
    </div>
  );
}
