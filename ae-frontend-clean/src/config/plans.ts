/**
 * SaaS Pricing & Entitlement Config
 *
 * Single source of truth for all plan definitions.
 * Easily swappable for Stripe later.
 */

export const PLAN_IDS = {
  FREE: 'free',
  STARTER: 'starter',
  CREATOR: 'creator',
  STUDIO: 'studio',
} as const;

export type PlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS];

export interface PlanFeatures {
  /** Renders allowed per billing period */
  rendersPerMonth: number;
  /** Max input video length in minutes */
  maxVideoLengthMinutes: number;
  /** Max file upload size in MB */
  maxUploadMB: number;
  /** Max export resolution: '720p' | '1080p' | '4k' */
  exportQuality: '720p' | '1080p' | '4k';
  /** Whether watermark is added */
  hasWatermark: boolean;
  /** Priority in render queue: 'background' | 'standard' | 'priority' | 'ultra' */
  queuePriority: 'background' | 'standard' | 'priority' | 'ultra';
  /** Max batch uploads per session */
  batchUploadSize: number;
  /** Access to advanced retention options (hook strength, aggressive cuts, etc) */
  advancedRetention: boolean;
  /** Team seats (Free/Starter = 1 personal, others can invite) */
  teamSeats: number;
  /** API access for webhooks and batch processing */
  apiAccess: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly price in USD cents (e.g., 900 = $9.00) */
  monthlyPriceCents: number;
  /** Annual price in USD cents with ~20% discount */
  annualPriceCents: number;
  features: PlanFeatures;
  /** Show "Most Popular" badge */
  highlighted: boolean;
  /** CTA text for this plan */
  ctaText: string;
}

export const PLANS: Record<PlanId, Plan> = {
  [PLAN_IDS.FREE]: {
    id: PLAN_IDS.FREE,
    name: 'Free',
    description: 'Try retention-first editing. Perfect for exploring the magic.',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    features: {
      rendersPerMonth: 12, // ~3/week
      maxVideoLengthMinutes: 10,
      maxUploadMB: 50,
      exportQuality: '720p',
      hasWatermark: true,
      queuePriority: 'background',
      batchUploadSize: 1,
      advancedRetention: false,
      teamSeats: 1,
      apiAccess: false,
    },
    highlighted: false,
    ctaText: 'Subscribe',
  },

  [PLAN_IDS.STARTER]: {
    id: PLAN_IDS.STARTER,
    name: 'Starter',
    description: 'For creators who want to edit more videos without compromise.',
    monthlyPriceCents: 900, // $9/mo
    annualPriceCents: 7200, // ~$6/mo ($72/year, ~20% off)
    features: {
      rendersPerMonth: 20,
      maxVideoLengthMinutes: 30,
      maxUploadMB: 500,
      exportQuality: '1080p',
      hasWatermark: false,
      queuePriority: 'standard',
      batchUploadSize: 1,
      advancedRetention: true, // Hook, silence removal, pacing
      teamSeats: 1,
      apiAccess: false,
    },
    highlighted: false,
    ctaText: 'Subscribe',
  },

  [PLAN_IDS.CREATOR]: {
    id: PLAN_IDS.CREATOR,
    name: 'Creator',
    description: 'Scale your content. Priority queue, batch uploads, advanced retention.',
    monthlyPriceCents: 2900, // $29/mo
    annualPriceCents: 23200, // ~$19.30/mo ($232/year, ~20% off)
    features: {
      rendersPerMonth: 100,
      maxVideoLengthMinutes: 120,
      maxUploadMB: 2000, // 2GB
      exportQuality: '4k',
      hasWatermark: false,
      queuePriority: 'priority',
      batchUploadSize: 5,
      advancedRetention: true,
      teamSeats: 1,
      apiAccess: false,
    },
    highlighted: true, // "Most Popular"
    ctaText: 'Subscribe',
  },

  [PLAN_IDS.STUDIO]: {
    id: PLAN_IDS.STUDIO,
    name: 'Studio',
    description: 'For teams and agencies. Unlimited renders, priority access, team seats, API.',
    monthlyPriceCents: 9900, // $99/mo
    annualPriceCents: 79200, // ~$66/mo ($792/year, ~20% off)
    features: {
      rendersPerMonth: 999999, // Effectively unlimited
      maxVideoLengthMinutes: 999, // No practical limit
      maxUploadMB: 5000, // 5GB per file
      exportQuality: '4k',
      hasWatermark: false,
      queuePriority: 'ultra',
      batchUploadSize: 999, // Unlimited queue
      advancedRetention: true,
      teamSeats: 5,
      apiAccess: true,
    },
    highlighted: false,
    ctaText: 'Subscribe',
  },
};

export const ALL_PLAN_IDS = Object.values(PLAN_IDS);

/**
 * Get plan by ID. Default to FREE if not found.
 */
export function getPlan(planId: PlanId | string): Plan {
  return PLANS[planId as PlanId] || PLANS[PLAN_IDS.FREE];
}

/**
 * Format price for display.
 * @param cents USD cents (e.g., 900 = $9.00)
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get monthly equivalent of annual price.
 * For display: "~$19/month (when billed annually)"
 */
export function getMonthlyEquivalent(annualCents: number): string {
  const monthly = annualCents / 12;
  return `~$${(monthly / 100).toFixed(2)}`;
}

/**
 * Calculate discount percentage.
 */
export function getAnnualDiscount(monthlyPrice: number, annualPrice: number): number {
  const annualIfMonthly = monthlyPrice * 12;
  if (annualIfMonthly === 0) return 0;
  return Math.round(((annualIfMonthly - annualPrice) / annualIfMonthly) * 100);
}
