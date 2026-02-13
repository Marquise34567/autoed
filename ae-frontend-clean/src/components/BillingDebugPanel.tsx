'use client';

/**
 * Billing Debug Panel
 * Development-only component for testing and debugging the billing system
 * Only visible in development mode with BILLING_MODE=soft
 */

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api'

interface BillingStatus {
  plan: string;
  status: string;
  stripe_subscription_id: string | null;
  updated_at: string;
}

export function BillingDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Only show in development with soft billing
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    const isSoft = process.env.NEXT_PUBLIC_BILLING_MODE === 'soft';
    if (!isDev || !isSoft) {
      setIsVisible(false);
      return;
    }
    setIsVisible(true);
  }, []);

  if (!isVisible) {
    return null;
  }

  async function refreshStatus() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/status`);
      if (res.ok) {
        const data = await res.json();
        setBillingStatus(data);
        setMessage('Status loaded');
      } else {
        const text = await res.text().catch(() => '')
        setMessage(`API Error ${res.status}: ${text}`);
      }
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/manual-activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'starter' }),
      });
      if (res.ok) {
        setMessage('Activated! Refreshing...');
        await refreshStatus();
      } else {
        const text = await res.text().catch(() => '')
        setMessage(`API Error ${res.status}: ${text}`);
      }
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    if (!confirm('Reset to free tier? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setMessage('Reset! Refreshing...');
        await refreshStatus();
      } else {
        const text = await res.text().catch(() => '')
        setMessage(`API Error ${res.status}: ${text}`);
      }
    } catch (err) {
      setMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-slate-900 text-white rounded-lg shadow-xl p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">🔧 Billing Debug</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {billingStatus ? (
          <div className="text-xs space-y-1 mb-3 bg-slate-800 p-2 rounded">
            <div>
              <span className="text-slate-400">Plan:</span>{' '}
              <span className="font-mono text-blue-300">{billingStatus.plan}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>{' '}
              <span
                className={`font-mono ${
                  billingStatus.status === 'active'
                    ? 'text-green-300'
                    : billingStatus.status === 'pending'
                      ? 'text-yellow-300'
                      : 'text-red-300'
                }`}
              >
                {billingStatus.status}
              </span>
            </div>
            <div className="text-slate-500">
              {new Date(billingStatus.updated_at).toLocaleTimeString()}
            </div>
          </div>
        ) : null}

        {message && (
          <div className="text-xs text-slate-300 mb-2 p-1 bg-slate-800 rounded">
            {message}
          </div>
        )}

        <div className="flex gap-1">
          <button
            onClick={refreshStatus}
            disabled={loading}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 px-2 py-1 rounded transition"
          >
            {loading ? '...' : 'Refresh'}
          </button>
          <button
            onClick={activate}
            disabled={loading}
            className="flex-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-slate-800 px-2 py-1 rounded transition"
          >
            {loading ? '...' : 'Activate'}
          </button>
          <button
            onClick={reset}
            disabled={loading}
            className="flex-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-slate-800 px-2 py-1 rounded transition"
          >
            {loading ? '...' : 'Reset'}
          </button>
        </div>

        <div className="text-xs text-slate-500 mt-2">Dev mode only</div>
      </div>
    </div>
  );
}
