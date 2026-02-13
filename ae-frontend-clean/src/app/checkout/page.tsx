'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EDITOR_ROUTE } from '@/lib/routes'
import { auth, isFirebaseConfigured } from '@/lib/firebase.client'
import { getIdToken } from 'firebase/auth'
import { Logo } from '@/components/Logo';
import { PLANS, type PlanId } from '@/config/plans';
import { validateReturnTo } from '@/lib/client/returnTo';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planId = searchParams.get('plan') as PlanId || 'starter';
  const billingCycle = (searchParams.get('billingCycle') || 'monthly') as 'monthly' | 'annual';
  const returnTo = validateReturnTo(searchParams.get('returnTo'));

  const plan = PLANS[planId];
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = billingCycle === 'monthly' ? plan.monthlyPriceCents : plan.annualPriceCents;
  const displayPrice = price === 0 ? 'Free' : `$${(price / 100).toFixed(0)}`;
  const billingPeriodText = billingCycle === 'monthly' ? '/month' : '/year';

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string,string> = {'Content-Type': 'application/json'}
      try {
        const current = auth?.currentUser as any
        if (current) {
          const idToken = await getIdToken(current)
          if (idToken) headers['Authorization'] = `Bearer ${idToken}`
        }
      } catch (e) {
        // ignore token retrieval errors; server will enforce auth if required
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          returnTo,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setError('Please sign in to upgrade')
        setIsLoading(false)
        return
      }

      if (!response.ok || !data.url) {
        setError(data.error || 'Checkout failed, try again')
        setIsLoading(false)
        return
      }

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      {!isFirebaseConfigured() && (
        <div className="fixed inset-x-0 top-16 z-50 flex items-center justify-center">
          <div className="bg-yellow-600/95 text-black px-4 py-2 rounded">Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars in Vercel.</div>
        </div>
      )}
      {/* Background gradient blurs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[360px] w-[360px] rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-16">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">AutoEditor</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="w-full max-w-md px-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            {/* Header */}
            <h1 className="text-2xl font-semibold mb-2">Checkout</h1>
            <p className="text-white/70 text-sm mb-6">Review your selection before paying</p>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Plan Summary */}
            <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{plan.name}</h3>
                <span className="text-blue-400 text-xs font-semibold uppercase px-2 py-1 bg-blue-500/20 rounded">
                  {billingCycle}
                </span>
              </div>
              <p className="text-white/70 text-sm mb-4">{plan.description}</p>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-white">
                  {displayPrice}
                </span>
                {price > 0 && (
                  <span className="text-white/60 text-sm">{billingPeriodText}</span>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="mb-6 space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-blue-400">✓</span>
                <span className="text-white/70">
                  {plan.features.rendersPerMonth >= 999999
                    ? 'Unlimited renders'
                    : `${plan.features.rendersPerMonth} renders/month`}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400">✓</span>
                <span className="text-white/70">
                  Up to {plan.features.maxVideoLengthMinutes === 999 ? 'unlimited' : plan.features.maxVideoLengthMinutes} minute videos
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400">✓</span>
                <span className="text-white/70">{plan.features.exportQuality} quality export</span>
              </div>
              {!plan.features.hasWatermark && (
                <div className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-white/70">No watermark</span>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full rounded-full bg-white px-6 py-2.5 font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
            >
              {isLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              )}
              {isLoading ? 'Processing...' : 'Continue to Payment'}
            </button>

            {/* Cancel / Back */}
            <Link
              href={returnTo}
              className="block w-full text-center py-2.5 rounded-full border border-white/10 text-white/70 hover:text-white transition font-medium text-sm"
            >
              Back to {returnTo === EDITOR_ROUTE ? 'editor' : 'previous page'}
            </Link>

            {/* Footer Text */}
            <p className="text-xs text-white/50 text-center mt-6">
              Payments processed securely by Stripe. You will not be charged until you complete the payment flow.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
