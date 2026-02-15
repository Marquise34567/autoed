'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/client/apiClient'
import { apiUrl } from '@/lib/apiBase'

/**
 * PendingSubscriptionBanner
 * 
 * Shows when user has paid but subscription is not yet activated
 * (WEBHOOKS_LIVE=false or webhook processing pending)
 * 
 * Usage: Add to editor or layout pages
 */
export function PendingSubscriptionBanner() {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check for ?pending=1 in URL (redirect from success handler)
    const urlParams = new URLSearchParams(window.location.search);
    const pendingParam = urlParams.get('pending');

    if (pendingParam === '1') {
      setIsPending(true);
      setMessage('Payment received! Your subscription will be activated once webhooks are enabled.');
      return;
    }

    // Check billing status API for pending verification
      apiFetch(apiUrl('/api/proxy/billing/status'))
        .then(async (res) => {
          if (!res.ok) {
            const txt = await res.text().catch(() => '')
            throw new Error(`API Error ${res.status}: ${txt}`)
          }
          return res.json()
        })
      .then(data => {
        if (data.ok && data.isPending) {
          setIsPending(true);
          setMessage(data.message || 'Subscription pending verification');
        }
      })
      .catch(err => {
        console.error('[PendingBanner] Failed to check status:', err);
      });
  }, []);

  if (!isPending) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600/95 backdrop-blur-sm border-b border-amber-400/30">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg 
              className="w-5 h-5 text-white animate-pulse" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              🔒 Subscription Pending Verification
            </p>
            <p className="text-white/90 text-xs mt-0.5">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="text-xs text-white hover:text-white/80 underline whitespace-nowrap"
          >
            View Plans
          </Link>
          <button
            onClick={() => setIsPending(false)}
            className="text-white hover:text-white/80 transition"
            aria-label="Dismiss"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
