import React from 'react'
import PremiumBadge from '@/components/PremiumBadge'

type Props = {
  onOpenUpgrade: () => void
}

export default function SubscriptionCard({ onOpenUpgrade }: Props) {
  return (
    <div className="relative rounded-2xl border border-white/6 bg-gradient-to-b from-black/20 to-white/2 p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pro Creator</h3>
          <p className="text-sm text-white/60">Unlimited exports, priority rendering</p>
        </div>
        <div className="flex items-center gap-2">
          <PremiumBadge size="sm" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/60">
        <div>
          <div className="font-medium text-white/90">Renders</div>
          <div className="mt-1">12 / month</div>
        </div>
        <div>
          <div className="font-medium text-white/90">Storage</div>
          <div className="mt-1">50GB used</div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <button onClick={onOpenUpgrade} className="w-full py-2 rounded-xl bg-emerald-500 text-black font-semibold">Upgrade / Manage</button>
        <button className="w-full py-2 rounded-xl border border-white/8 text-white/90">View billing</button>
      </div>
    </div>
  )
}
