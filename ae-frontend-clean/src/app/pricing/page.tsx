'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PLANS, getAnnualDiscount, formatPrice, getMonthlyEquivalent, type PlanId } from '@/config/plans';
import { Logo } from '@/components/Logo';
import { BetaBadge } from '@/components/BetaBadge';
import { MobileNav } from '@/components/MobileNav';
import { UserNav } from '@/components/UserNav';
import { createCheckoutUrl, storeReturnTo, getCurrentPath } from '@/lib/client/returnTo';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { trackPostHogEvent, trackPlausibleEvent } from '@/lib/analytics/client';
import { auth } from '@/lib/firebase.client';
import { EDITOR_ROUTE, LOGIN_ROUTE, makeLoginUrl } from '@/lib/routes';
import { getPriceIdFor } from '@/config/stripePrices';
import { startCheckout } from '@/lib/stripe/client';
import { useSearchParams } from 'next/navigation';
type BillingPeriod = 'monthly' | 'annual';

function PricingPageContent() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);


  // Verify pricing page mounted
  useEffect(() => {
    setIsClient(true);
    const planCount = Object.keys(PLANS).length;
    console.log('[PricingPage] Mounted, plans loaded:', planCount);
    if (planCount === 0) {
      console.warn('[PricingPage] WARNING: No plans loaded!');
    }
  }, []);

  const handleUpgrade = async (planId: string) => {
    // Skip checkout for free plan
    if (planId === 'free') {
      router.push(EDITOR_ROUTE);
      return;
    }

    try {
      setError(null);
      trackPostHogEvent('pricing_plan_clicked', { plan: planId });

      const fbUser = auth.currentUser;
      const nextPath = EDITOR_ROUTE;

      // If user not logged in, send to login with checkout intent preserved
      if (!fbUser) {
        const redirect = `/login?next=${encodeURIComponent('/pricing')}&intent=checkout&plan=${encodeURIComponent(planId)}&interval=${encodeURIComponent(billingPeriod)}`;
        router.push(redirect);
        return;
      }

      // Get priceId for selected plan/interval
      const priceId = getPriceIdFor(planId, billingPeriod);
      if (!priceId) throw new Error('No priceId configured for plan');

      trackPlausibleEvent('CheckoutStart');
      const url = await startCheckout({ priceId, plan: planId, interval: billingPeriod, trial: false, next: nextPath });
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[PricingPage:handleUpgrade] Error:', msg);
      trackPostHogEvent('checkout_failed', { reason: msg });
      trackPlausibleEvent('CheckoutFail');
      setError(`Unable to process upgrade: ${msg}`);
    }
  };

  const handleStartTrial = async (planId: string) => {
    try {
      setError(null);
      trackPostHogEvent('pricing_trial_clicked', { plan: planId });

      const fbUser = auth.currentUser;
      // If not logged in, redirect to login with trial intent preserved
      if (!fbUser) {
        const redirect = `/login?next=${encodeURIComponent('/pricing')}&intent=checkout&plan=${encodeURIComponent(planId)}&interval=${encodeURIComponent(billingPeriod)}&trial=1`;
        router.push(redirect);
        return;
      }

      const priceId = getPriceIdFor(planId, billingPeriod);
      if (!priceId) throw new Error('No priceId configured for plan');

      const url = await startCheckout({ priceId, plan: planId, interval: billingPeriod, trial: true, next: EDITOR_ROUTE });
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[PricingPage:handleStartTrial] Error:', msg);
      setError(`Unable to start trial: ${msg}`);
    }
  };

  // Auto-trigger checkout if returned from login with intent=checkout and user is signed in
  const searchParams = useSearchParams();
  useEffect(() => {
    const intent = searchParams?.get('intent');
    if (intent !== 'checkout') return;
    const plan = searchParams.get('plan');
    const interval = (searchParams.get('interval') as 'monthly' | 'annual') || 'monthly';
    const trial = searchParams.get('trial') === '1' || searchParams.get('trial') === 'true';

    if (!plan) return;
    const fbUser = auth.currentUser;
    if (!fbUser) return; // user still not logged in

    (async () => {
      try {
        const priceId = getPriceIdFor(plan, interval);
        if (!priceId) throw new Error('No priceId configured for plan');
        const url = await startCheckout({ priceId, plan, interval, trial, next: EDITOR_ROUTE });
        window.location.href = url;
      } catch (e) {
        console.error('[PricingPage] Auto-checkout failed', e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSearchParams(), auth.currentUser]);

  const plans = Object.values(PLANS);
  const plansByPrice = plans.sort((a, b) => a.monthlyPriceCents - b.monthlyPriceCents);

  // Debug info (visible in dev mode)
  const debugInfo = process.env.NODE_ENV === 'development' ? {
    plansLoaded: plans.length,
    timestamp: new Date().toISOString(),
    isClient,
  } : null;

  return (
    <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
      {/* Background gradient blurs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-90 w-90 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      {/* Debug Banner (Dev Only) */}
      {debugInfo && (
        <div className="fixed top-0 left-0 right-0 bg-blue-950/70 text-blue-200 px-4 py-2 text-xs z-40 border-b border-blue-500/20">
          <span>🐛 DEV: {debugInfo.plansLoaded} plans | {debugInfo.isClient ? '✓' : '⏳'} client ready</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-3 text-center z-50 mt-10">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-4 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-16 py-4 sm:py-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition">
          <Logo />
          <span className="text-base sm:text-lg font-semibold tracking-tight">AutoEditor</span>
          <BetaBadge />
        </Link>
        <MobileNav>
          <UserNav />
        </MobileNav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-16 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold px-4">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/70 max-w-2xl mx-auto px-4">
            Scale as your channel grows. Start free, upgrade when you need more.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8 sm:mb-12 px-4">
          <div className="inline-flex items-center gap-2 sm:gap-4 bg-white/5 rounded-full p-1 border border-white/10 w-full sm:w-auto max-w-sm sm:max-w-none">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`flex-1 sm:flex-none px-6 sm:px-8 py-2.5 sm:py-2 rounded-full font-medium transition-all text-sm min-h-11 ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`flex-1 sm:flex-none px-6 sm:px-8 py-2.5 sm:py-2 rounded-full font-medium transition-all relative text-sm min-h-11 ${
                billingPeriod === 'annual'
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Annual
              <span className="absolute -top-7 sm:-top-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-bold bg-emerald-500 text-white px-2 py-1 rounded whitespace-nowrap">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto mb-12 sm:mb-16">
          {plansByPrice.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.monthlyPriceCents : plan.annualPriceCents;
            const displayPrice = formatPrice(price);
            const monthlyEquivalent = billingPeriod === 'annual' && price > 0 ? getMonthlyEquivalent(price) : null;
            const discount = billingPeriod === 'annual' && price > 0 ? getAnnualDiscount(plan.monthlyPriceCents, plan.annualPriceCents) : 0;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl sm:rounded-3xl border transition-all overflow-visible ${
                  plan.highlighted
                    ? 'border-blue-500/40 bg-white/10 sm:scale-105'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/7 active:scale-95 sm:active:scale-100'
                }`}
              >
                {/* Most Popular Badge */}
                {plan.highlighted && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-blue-500/20 border border-blue-500/40 text-blue-200 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap">
                      Popular
                    </span>
                  </div>
                )}

                <div className="p-5 sm:p-6">
                  {/* Plan Name & Description */}
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/60 text-xs sm:text-sm mb-4 sm:mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-5 sm:mb-6">
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl sm:text-3xl font-semibold text-white">
                        {price === 0 ? 'Free' : displayPrice}
                      </span>
                      {price > 0 && (
                        <span className="text-white/60 text-sm">
                          /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    {monthlyEquivalent && (
                      <p className="text-[10px] sm:text-xs text-white/50">{monthlyEquivalent}/month when billed annually</p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-3 sm:py-2.5 rounded-full font-semibold text-sm transition-all mb-5 sm:mb-6 min-h-11 ${
                      plan.highlighted
                        ? 'bg-white text-black shadow-lg shadow-white/10 hover:bg-white/90'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    {plan.ctaText}
                  </button>

                  {/* Free trial button for paid plans */}
                  {plan.monthlyPriceCents > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={() => handleStartTrial(plan.id)}
                        className="w-full py-2 rounded-full text-sm font-medium bg-transparent border border-dashed border-white/10 text-white/80 hover:bg-white/6"
                      >
                        Start free trial
                      </button>
                    </div>
                  )}

                  {/* Features - Condensed */}
                  <div className="space-y-2 text-xs sm:text-sm">
                    {/* Renders */}
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                      <div className="text-white/70">
                        {plan.features.rendersPerMonth >= 999999
                          ? 'Unlimited renders'
                          : `${plan.features.rendersPerMonth} renders/month`}
                      </div>
                    </div>

                    {/* Max Video Length */}
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                      <div className="text-white/70">
                        {plan.features.maxVideoLengthMinutes >= 999
                          ? 'Unlimited video length'
                          : `Up to ${plan.features.maxVideoLengthMinutes} min videos`}
                      </div>
                    </div>

                    {/* Export Quality */}
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                      <div className="text-white/70">
                        {plan.features.exportQuality === '4k' ? '4K' : plan.features.exportQuality} quality
                      </div>
                    </div>

                    {/* Watermark */}
                    <div className="flex items-start gap-2">
                      {plan.features.hasWatermark ? (
                        <span className="text-white/40 shrink-0 mt-0.5">✗</span>
                      ) : (
                        <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                      )}
                      <div className="text-white/70">
                        {plan.features.hasWatermark ? 'Watermark' : 'No watermark'}
                      </div>
                    </div>

                    {/* Queue Priority */}
                    {plan.features.queuePriority !== 'background' && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                        <div className="text-white/70">
                          {plan.features.queuePriority === 'standard'
                            ? 'Standard speed'
                            : plan.features.queuePriority === 'priority'
                            ? 'Priority queue'
                            : 'Ultra priority'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Billing Note */}
        <div className="text-center text-white/70 text-sm mb-16">
          <p>All plans include access to retention-first editing, hook detection, silence removal, and pacing analysis.</p>
          <p className="mt-2">
            Need more? Email{' '}
            <a href="mailto:sales@auto-editor.ai" className="text-white hover:text-white/80 underline">
              sales@auto-editor.ai
            </a>{' '}
            for custom enterprise plans.
          </p>
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold text-white mb-8 text-center">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-white/70 font-semibold">Feature</th>
                  {plansByPrice.map((plan) => (
                    <th key={plan.id} className="text-center py-4 px-6 text-white font-semibold">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Renders per month</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-white/80">
                      {plan.features.rendersPerMonth >= 999999 ? '∞' : plan.features.rendersPerMonth}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Max video length</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-white/80">
                      {plan.features.maxVideoLengthMinutes >= 999 ? '∞' : `${plan.features.maxVideoLengthMinutes}m`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Export quality</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-white/80">
                      {plan.features.exportQuality === '4k' ? '4K' : plan.features.exportQuality}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">No watermark</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6">
                      {plan.features.hasWatermark ? (
                        <span className="text-white/40">—</span>
                      ) : (
                        <span className="text-emerald-400 text-lg">✓</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Priority queue</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6">
                      {plan.features.queuePriority === 'background' ? (
                        <span className="text-white/40">—</span>
                      ) : (
                        <span className="text-emerald-400 text-lg">✓</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Batch uploads</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6 text-white/80">
                      {plan.features.batchUploadSize === 1 ? '—' : plan.features.batchUploadSize >= 999 ? '∞' : plan.features.batchUploadSize}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6 text-white/70">Advanced retention</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6">
                      {plan.features.advancedRetention ? (
                        <span className="text-emerald-400 text-lg">✓</span>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-6 text-white/70">API access</td>
                  {plansByPrice.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-6">
                      {plan.features.apiAccess ? (
                        <span className="text-emerald-400 text-lg">✓</span>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Back Links */}
        <div className="text-center mt-16 space-y-2">
          <p>
            <Link
              href="/"
              className="text-white/70 hover:text-white transition underline"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <ErrorBoundary>
      <PricingPageContent />
    </ErrorBoundary>
  );
}
