import Link from "next/link";
import { UserNav } from "@/components/UserNav";
import { Logo } from "@/components/Logo";
import { BetaBadge } from "@/components/BetaBadge";
import { MobileNav } from "@/components/MobileNav";
import { PLANS } from "@/config/plans";

export default function Home() {
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
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto px-4 sm:px-0">
            <Link
              href="/login?mode=signup"
              className="rounded-full bg-white px-6 py-3 sm:py-3.5 text-sm font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-white/90 text-center min-h-11 flex items-center justify-center"
            >
              Sign Up
            </Link>
          </div>

          {/* Editor Demo Preview */}
          <div className="mt-10 sm:mt-16 mx-auto max-w-4xl w-full px-2 sm:px-0">
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-linear-to-b from-white/5 to-white/0 p-4 sm:p-8 backdrop-blur overflow-hidden">
              {/* Mock Editor Interface */}
              <div className="space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
                  <div className="text-base sm:text-lg font-semibold">Auto-Editor</div>
                  <div className="flex gap-1.5 sm:gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-xs text-white/50 hidden sm:inline">Processing</span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Left - Upload/Progress */}
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

                  {/* Right - Clips Preview */}
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

                {/* Stats */}
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
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 sm:gap-6 px-4 sm:px-6 lg:px-16 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                title: "Upload & Analyze",
                desc: "Drop your long-form content. We detect highlights, hooks, and speaking density instantly.",
              },
              {
                title: "Smart Auto-Edit",
                desc: "AI scores candidates, applies hook selection, and optimizes pacing for retention.",
              },
              {
                title: "Publish-Ready",
                desc: "Vertical layout, facecam crops, and loudness-normalized audio in one click.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 shadow-lg shadow-black/40 backdrop-blur"
              >
                <h3 className="text-base sm:text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 sm:mt-3 text-sm text-white/70">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-16 pb-12 sm:pb-20"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-linear-to-br from-white/10 via-white/5 to-transparent p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold">Auto-Editor built for creators</h2>
              <p className="mt-3 sm:mt-4 text-sm text-white/70">
              Replace manual trimming with an AI pipeline tuned for modern short-form
              platforms.
            </p>
              <ul className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-sm text-white/70">
              <li>• Highlights ranked by retention proxy scoring</li>
              <li>• Smart hook selection for the first 1–3 seconds</li>
              <li>• Facecam crop overrides with live preview</li>
              <li>• Studio-grade audio enhancement</li>
            </ul>
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-2">
              {[
                "Auto Editor",
                "Hook Optimizer",
                "Facecam Crop",
                "Captions Ready",
                "Vertical Export",
                "Team Sharing",
              ].map((feature) => (
                <div
                  key={feature}
                  className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 text-xs sm:text-sm text-white/80 text-center sm:text-left"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-16 pb-12 sm:pb-20"
        >
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold">Simple, Transparent Pricing</h2>
            <p className="mt-3 sm:mt-4 text-sm text-white/70 px-4">
              Scale as your channel grows. Start free, upgrade when you need more.
            </p>
          </div>
          <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(PLANS).map((plan) => (
              <div
                key={plan.id}
                className={`rounded-3xl border p-6 shadow-xl backdrop-blur ${
                  plan.highlighted
                    ? "border-blue-500/40 bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.highlighted && (
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-200">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-white/60">{plan.description}</p>
                <p className="mt-4 text-3xl font-semibold">
                  {plan.monthlyPriceCents === 0 ? "Free" : `$${(plan.monthlyPriceCents / 100).toFixed(0)}`}
                  {plan.monthlyPriceCents > 0 && <span className="text-sm text-white/60">/mo</span>}
                </p>
                <ul className="mt-6 space-y-2 text-sm text-white/70">
                  <li>• {plan.features.rendersPerMonth === 999999 ? "Unlimited" : plan.features.rendersPerMonth} renders/month</li>
                  <li>• Up to {plan.features.maxVideoLengthMinutes} min videos</li>
                  <li>• {plan.features.exportQuality} export</li>
                  {!plan.features.hasWatermark && <li>• No watermark</li>}
                  {plan.features.advancedRetention && <li>• Advanced retention</li>}
                </ul>
                <Link
                  href="/pricing"
                  className="mt-6 block w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 text-center"
                >
                  {plan.ctaText}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-white/50">
            <Link href="/pricing" className="underline hover:text-white">
              View detailed pricing & features →
            </Link>
          </p>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-6 pb-20 lg:px-16">
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                q: "How does the auto-editor choose clips?",
                a: "We combine speech density, silence detection, audio energy, and hook signals to rank moments.",
              },
              {
                q: "Can I override the facecam crop?",
                a: "Yes. Manual crop lets you lock the perfect framing for vertical exports.",
              },
              {
                q: "Does it work on Windows?",
                a: "Yes. We resolve ffmpeg and ffprobe paths with Windows-compatible fallbacks.",
              },
              {
                q: "What platforms are supported?",
                a: "Export presets are optimized for TikTok, Reels, and Shorts.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-base font-semibold">{item.q}</h3>
                <p className="mt-3 text-sm text-white/70">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-10 text-sm text-white/60 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span>© 2026 AutoEditor. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-white" href="#faq">
              Support
            </a>
            <Link className="transition hover:text-white" href="/editor">
              Editor
            </Link>
            <Link className="transition hover:text-white" href="/login?next=/editor">
              Editor (Alt)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
