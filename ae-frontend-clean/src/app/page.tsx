import Link from "next/link"
import SignupButton from '@/components/Auth/SignupButton'
import { UserNav } from "@/components/UserNav"
import { Logo } from "@/components/Logo"
import { BetaBadge } from "@/components/BetaBadge"
import { MobileNav } from "@/components/MobileNav"
import WaitlistOverlay from '@/components/WaitlistOverlay'
import { PLANS } from "@/config/plans"
import { EDITOR_ROUTE, LOGIN_ROUTE } from '@/lib/routes'

export const metadata = {
  title: "AutoEditor – AI Video Editor for YouTube Creators",
  description:
    "AutoEditor is an AI video editor that automatically adds hooks, removes boring parts, improves pacing, and maximizes audience retention for content creators.",
  keywords: [
    "AI video editor",
    "AI YouTube editor",
    "automatic video editor",
    "AI video editing software",
    "video editor for YouTube",
    "AI content creator tool",
    "retention video editor",
    "automatic jump cut editor",
    "remove silence automatically",
    "AI hook generator",
    "smart video editor",
    "best AI video editor",
    "AI editing for creators"
  ],
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 -top-20 w-130 h-130 rounded-full bg-fuchsia-500/20 blur-[120px] animate-float" />
        <div className="absolute -right-20 top-[20%] w-90 h-90 rounded-full bg-cyan-500/20 blur-[120px] animate-float" style={{ animationDelay: '1.2s' }} />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-16 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Logo />
          <span className="text-base sm:text-lg font-semibold tracking-tight">AutoEditor</span>
          <BetaBadge />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <SignupButton className="rounded-full px-4 py-2 bg-linear-to-br from-white/95 to-white/80 text-black font-semibold" />
            <Link
              href={LOGIN_ROUTE}
              className="rounded-full px-4 py-2 border border-white/10 text-white/80 hover:bg-white/5 transition-colors text-sm flex items-center justify-center"
            >
              Log in
            </Link>
          </div>
          <MobileNav>
            <UserNav />
          </MobileNav>
        </div>
      </header>

      <main className="relative z-10 overflow-x-hidden">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-16 text-center pt-12 pb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/70">Premium AI Auto-Editor</div>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white/95 to-slate-200/80 animate-fade-up fade-delay-1">We Built an Editor That Thinks Like Top Creators.</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-white/70 animate-fade-up fade-delay-2">AutoEditor analyzes your footage, identifies the best moments, selects the perfect hook, and renders creator-ready clips with studio-grade audio enhancement.</p>
          <div className="mt-6" />

          <div className="mt-10 mx-auto max-w-4xl w-full px-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur card-entrance animate-fade-up fade-delay-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="text-base font-semibold">Auto-Editor</div>
                <div className="flex items-center gap-2 text-sm text-white/60"><div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />Processing</div>
              </div>
                <div className="mt-6">
                  <div className="text-xs font-medium text-white/70">Video Analysis</div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center mt-2">
                    <div className="mb-3 text-2xl">📹</div>
                    <p className="text-sm text-white/60">Analyzing video...</p>
                    <div className="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-full w-2/3 rounded-full" style={{ transition: 'width 1200ms ease-in-out' }} />
                    </div>
                    <p className="text-xs text-white/40 mt-2">2m 45s detected</p>
                  </div>
                </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-16 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Upload & Analyze', desc: 'Drop your long-form content. We detect highlights, hooks, and speaking density instantly.' },
              { title: 'Smart Auto-Edit', desc: 'AI scores candidates, applies hook selection, and optimizes pacing for retention.' },
              { title: 'Publish-Ready', desc: 'Vertical layout, facecam crops, and loudness-normalized audio in one click.' },
            ].map(card => (
              <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-base font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-white/70">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-16 pb-12">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Auto-Editor built for creators</h2>
              <p className="mt-3 text-sm text-white/70">Replace manual trimming with an AI pipeline tuned for modern short-form platforms.</p>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>• Highlights ranked by retention proxy scoring</li>
                <li>• Smart hook selection for the first 1–3 seconds</li>
                <li>• Facecam crop overrides with live preview</li>
                <li>• Studio-grade audio enhancement</li>
              </ul>
            </div>

            <div className="grid gap-4 grid-cols-2">
              {['Auto Editor','Hook Optimizer','Facecam Crop','Captions Ready','Vertical Export','Team Sharing'].map(feature => (
                <div key={feature} className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/80 text-center">{feature}</div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-16 pb-12">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-semibold">Simple, Transparent Pricing</h2>
            <p className="mt-3 text-sm text-white/70">Scale as your channel grows. Start free, upgrade when you need more.</p>
          </div>

          <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(PLANS).map(plan => (
              <div key={plan.id} className={`rounded-3xl border p-6 ${plan.highlighted ? 'border-blue-500/40 bg-white/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.highlighted && <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-200">Popular</span>}
                </div>
                <p className="mt-2 text-sm text-white/60">{plan.description}</p>
                <p className="mt-4 text-3xl font-semibold">{plan.monthlyPriceCents === 0 ? 'Free' : `$${(plan.monthlyPriceCents/100).toFixed(0)}`}{plan.monthlyPriceCents > 0 && <span className="text-sm text-white/60">/mo</span>}</p>
                <ul className="mt-6 space-y-2 text-sm text-white/70">
                  <li>• {plan.features.rendersPerMonth === 999999 ? 'Unlimited' : plan.features.rendersPerMonth} renders/month</li>
                  <li>• Up to {plan.features.maxVideoLengthMinutes} min videos</li>
                  <li>• {plan.features.exportQuality} export</li>
                  {!plan.features.hasWatermark && <li>• No watermark</li>}
                  {plan.features.advancedRetention && <li>• Advanced retention</li>}
                </ul>
                <Link href="/pricing" className="mt-6 block w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-black text-center">{plan.ctaText}</Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-white/50"><Link href="/pricing" className="underline hover:text-white">View detailed pricing & features →</Link></p>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-6 pb-20 lg:px-16">
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { q: 'How does the auto-editor choose clips?', a: 'We combine speech density, silence detection, audio energy, and hook signals to rank moments.' },
              { q: 'Can I override the facecam crop?', a: 'Yes. Manual crop lets you lock the perfect framing for vertical exports.' },
              { q: 'Does it work on Windows?', a: 'Yes. We resolve ffmpeg and ffprobe paths with Windows-compatible fallbacks.' },
              { q: 'What platforms are supported?', a: 'Export presets are optimized for TikTok, Reels, and Shorts.' },
            ].map(item => (
              <div key={item.q} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-base font-semibold">{item.q}</h3>
                <p className="mt-3 text-sm text-white/70">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <WaitlistOverlay />

      <footer className="border-t border-white/10 px-6 py-10 text-sm text-white/60 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span>© 2026 AutoEditor. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a className="transition hover:text-white" href="#pricing">Pricing</a>
            <a className="transition hover:text-white" href="#faq">Support</a>
            <Link className="transition hover:text-white" href={EDITOR_ROUTE}>Editor</Link>
            <Link className="transition hover:text-white" href={EDITOR_ROUTE}>Editor (Alt)</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
