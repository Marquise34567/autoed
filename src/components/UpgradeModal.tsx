/**
 * Upgrade Modal Component
 * Shown when user hits render limit
 */

import Link from 'next/link';
import { getPlan } from '@/config/plans';
import type { PlanId } from '@/config/plans';

interface UpgradeModalProps {
  isOpen: boolean;
  currentPlanId: PlanId;
  rendersUsed: number;
  rendersAllowed: number;
  onClose: () => void;
}

export default function UpgradeModal({
  isOpen,
  currentPlanId,
  rendersUsed,
  rendersAllowed,
  onClose,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const currentPlan = getPlan(currentPlanId);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-4 sm:p-6">
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-2xl inline-flex items-center justify-center min-h-11 min-w-11"
        >
          ✕
        </button>

        {/* Content */}
        <div className="mb-6">
          <div className="inline-block bg-orange-500/20 border border-orange-500/30 rounded-lg px-3 py-1.5 mb-4">
            <p className="text-orange-400 text-xs sm:text-sm font-semibold">Render Limit Reached</p>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            You've used all {rendersAllowed} renders this month
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mb-4">
            You're on the <span className="font-semibold text-slate-300">{currentPlan.name}</span> plan. Upgrade for more renders and exclusive features.
          </p>
        </div>

        {/* Usage Stats */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 text-sm">Renders used this month</span>
            <span className="text-white font-bold">{rendersUsed}/{rendersAllowed}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full"
              style={{ width: `${Math.min(100, (rendersUsed / rendersAllowed) * 100)}%` }}
            />
          </div>
        </div>

        {/* Plan Recommendations */}
        <div className="space-y-3 mb-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
            Upgrade Options
          </p>

          {/* Starter */}
          <Link
            href="/pricing"
            className="block p-3 rounded-lg border border-slate-700 hover:border-blue-500 hover:bg-slate-800/70 transition-all min-h-11"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-semibold">Starter</p>
                <p className="text-slate-400 text-xs mt-1">20 renders/month, 1080p, no watermark</p>
              </div>
              <p className="text-blue-400 font-bold text-sm">$9/mo</p>
            </div>
          </Link>

          {/* Creator */}
          <Link
            href="/pricing"
            className="block p-3 rounded-lg border border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 transition-all min-h-11"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-semibold">Creator ⭐ Popular</p>
                <p className="text-slate-400 text-xs mt-1">100 renders/month, 4K, priority queue</p>
              </div>
              <p className="text-blue-400 font-bold text-sm">$29/mo</p>
            </div>
          </Link>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Link
            href="/pricing"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-center min-h-11 inline-flex items-center justify-center"
          >
            View All Plans
          </Link>
          <button
            onClick={onClose}
            className="w-full border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-semibold py-2.5 rounded-lg transition-colors min-h-11"
          >
            Maybe Later
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-slate-500 text-center mt-4">
          Render limit resets monthly. No charges until you upgrade.
        </p>
      </div>
    </div>
  );
}
