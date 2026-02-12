/** PRICE_MAP contains the real Stripe Price IDs for each plan/interval. */
export const PRICE_MAP: Record<
  string,
  { monthly: string; annual: string; trialEligible?: boolean }
> = {
  starter: {
    monthly: 'price_1SxGi4EaNugKFIUDs1LiuO32',
    annual: 'price_1SyognEaNugKFIUDpSymrOIr',
    trialEligible: true,
  },
  creator: {
    monthly: 'price_1SxGi4EaNugKFIUDNDuGUjfG',
    annual: 'price_1SyohCEaNugKFIUDInsQdYhIl',
    trialEligible: true,
  },
  studio: {
    monthly: 'price_1SxGi4EaNugKFIUDLsqUMe4u',
    annual: 'price_1SyohlEaNugKFIUD9ZB6n8DL',
    trialEligible: true,
  },
};

export function getPriceIdFor(planId: string, interval: 'monthly' | 'annual') {
  const entry = PRICE_MAP[planId];
  if (!entry) return null;
  return interval === 'annual' ? entry.annual : entry.monthly;
}

// Free-trial Stripe Price ID (shared across plans)
export const FREE_TRIAL_PRICE = 'price_1SyoifEaNugKFIUDgg243r6V';
