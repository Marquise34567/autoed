"use client";

import Link from "next/link";
import { UserNav } from "@/components/UserNav";
import { Logo } from "@/components/Logo";
import { BetaBadge } from "@/components/BetaBadge";
import { MobileNav } from "@/components/MobileNav";
import { PLANS } from "@/config/plans";
import { EDITOR_ROUTE, LOGIN_ROUTE } from '@/lib/routes'
import { useAuth } from '@/lib/auth/useAuth'

export default function HomeClient() {
  const { user, authReady } = useAuth()

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
        <MobileNav>
          <UserNav />
        </MobileNav>
      </header>

      <main className="relative z-10 overflow-x-hidden">
        <section className="mx-auto flex max-w-6xl flex-col items-center px-4 sm:px-6 lg:px-16 pb-12 sm:pb-20 pt-8 sm:pt-12 lg:pt-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/70">
            Premium AI Auto-Editor
          </div>
          <h1 className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight px-2">
            We Cut The Boring Parts so your videos actually get watched
          </h1>
          <p className="mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-white/70 px-4">
            AutoEditor analyzes your footage, identifies the best moments, selects
            the perfect hook, and renders creator-ready clips with studio-grade
            audio enhancement.
          </p>
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
              <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-linear-to-b from-white/5 to-white/0 p-4 sm:p-8 backdrop-blur overflow-hidden">
                {/* Mock Editor Interface (static preview for unauthenticated users) */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
                    <div className="text-base sm:text-lg font-semibold">Auto-Editor</div>
                    <div className="flex gap-1.5 sm:gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-xs text-white/50 hidden sm:inline">Processing</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-xs sm:text-sm font-medium text-white/70">Video Analysis</div>
                      <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 text-center">
                        <div className="mb-3 sm:mb-4 text-2xl sm:text-3xl">📹</div>
                        <p className="text-sm text-white/60">Analyzing video...</p>
                        <div className="mt-3 sm:mt-4 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-500 h-full w-2/3 animate-pulse rounded-full"></div>
                        </div>
                        <p className="text-xs text-white/40 mt-2">2m 45s detected</p>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-xs sm:text-sm font-medium text-white/70">Generated Clips</div>
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-2 sm:p-3 flex items-center gap-2 sm:gap-3 hover:bg-white/10 transition cursor-pointer">
                            <div className="h-10 sm:h-12 w-16 sm:w-20 shrink-0 rounded bg-linear-to-r from-blue-500/30 to-purple-500/30 flex items-center justify-center text-xs text-white/50">
                              00:{10 + i * 5}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-white/80 truncate">Clip {i}</div>
                              <div className="text-xs text-white/40">{30 + i * 5}s duration</div>
                            </div>
                            <div className="text-green-400 text-xs font-semibold">{90 + i * 2}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-white/10">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-semibold text-blue-400">3</div>
                      <div className="text-[10px] sm:text-xs text-white/50 mt-1">Clips Ready</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-semibold text-emerald-400">45s</div>
                      <div className="text-[10px] sm:text-xs text-white/50 mt-1">Avg Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-semibold text-purple-400">94%</div>
                      <div className="text-[10px] sm:text-xs text-white/50 mt-1">Quality Score</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
