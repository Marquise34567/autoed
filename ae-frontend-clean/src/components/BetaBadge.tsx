'use client';

/**
 * BetaBadge Component
 * 
 * A premium, subtle badge indicating beta status.
 * Designed to be easily removable when product graduates from beta.
 * 
 * Usage: <BetaBadge />
 */
export function BetaBadge() {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border border-purple-400/30 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-200 shadow-sm ring-1 ring-purple-400/10"
      aria-label="Beta release"
      title="Currently in beta — features may change"
    >
      Beta
    </span>
  );
}
