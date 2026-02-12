'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { EDITOR_ROUTE } from '@/lib/routes'

export function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'confirming' | 'confirmed' | 'error' | 'billing_disabled'>('confirming');
  const [pollingTime, setPollingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const POLLING_INTERVAL = 1500; // 1.5 seconds
  const MAX_POLLING_TIME = 60000; // 60 seconds

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setError('No session ID found');
      return;
    }

    // TODO: Implement polling logic to confirm payment
    // For now, show pending state
    const timer = setTimeout(() => {
      setStatus('confirmed');
      router.push(EDITOR_ROUTE);
    }, 3000);

    return () => clearTimeout(timer);
  }, [sessionId, router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-6">
        <div className="max-w-md">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-white/70 mb-6">{error}</p>
            <a
              href="/pricing"
              className="inline-block rounded-full bg-white px-6 py-2.5 font-semibold text-black hover:bg-white/90 transition"
            >
              Back to Pricing
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-6">
        <div className="max-w-md">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-semibold mb-2">Payment Pending</h1>
            <p className="text-white/70 mb-6">
              Payment received! Your subscription is pending activation. You'll be redirected shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      {/* Background gradient blurs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-90 w-90 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur text-center">
            {/* Spinner */}
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
              </div>
            </div>

            <h1 className="text-2xl font-semibold mb-2">Payment Processing</h1>
            <p className="text-white/70 mb-6">
              We're confirming your payment with Stripe. This usually takes a few seconds.
            </p>

            {/* Progress indicator */}
            <div className="mb-6 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min((pollingTime / MAX_POLLING_TIME) * 100, 90)}%`,
                }}
              />
            </div>

            <p className="text-xs text-white/50">
              {Math.round(pollingTime / 1000)}s elapsed
            </p>

            {/* Help text */}
            <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/70">
                Don't close this page. You will be automatically redirected once we confirm your payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
