export type PlanKey = 'free' | 'starter' | 'creator' | 'studio'

export interface PlanConfig {
  key: PlanKey
  label: string
  priceMonthly?: number
  rendersLimit: number | 'unlimited'
  maxMinutes: number
  exportQuality: '720p'|'1080p'|'4k'
  watermark: boolean
  advancedRetention: boolean
  teamSeats?: boolean
  apiAccess?: boolean
}

const PLANS: Record<PlanKey, PlanConfig> = {
  free: {
    key: 'free', label: 'Free', rendersLimit: 12, maxMinutes: 10,
    exportQuality: '720p', watermark: true, advancedRetention: false
  },
  starter: {
    key: 'starter', label: 'Starter', priceMonthly: 9, rendersLimit: 20, maxMinutes: 30,
    exportQuality: '1080p', watermark: false, advancedRetention: true
  },
  creator: {
    key: 'creator', label: 'Creator', priceMonthly: 29, rendersLimit: 100, maxMinutes: 120,
    exportQuality: '4k', watermark: false, advancedRetention: true
  },
  studio: {
    key: 'studio', label: 'Studio', priceMonthly: 99, rendersLimit: 'unlimited', maxMinutes: 999,
    exportQuality: '4k', watermark: false, advancedRetention: true, teamSeats: true, apiAccess: true
  }
}

export function getPlanConfig(plan: PlanKey | string){
  return PLANS[(plan as PlanKey) || 'free']
}

export function getRendersLeft(userDoc: { rendersLimit?: number | 'unlimited'; rendersUsed?: number }){
  const limit = userDoc?.rendersLimit ?? PLANS.free.rendersLimit
  if (limit === 'unlimited') return 'unlimited'
  const used = userDoc?.rendersUsed ?? 0
  return Math.max(0, (limit as number) - used)
}

export function planFeatures(plan: PlanKey | string){
  const p = getPlanConfig(plan)
  const feats: string[] = []
  feats.push(`${p.rendersLimit === 'unlimited' ? 'Unlimited' : p.rendersLimit + ' renders/month'}`)
  feats.push(`Up to ${p.maxMinutes} min videos`)
  feats.push(`${p.exportQuality} export`)
  if (!p.watermark) feats.push('No watermark')
  if (p.advancedRetention) feats.push('Advanced retention')
  if (p.teamSeats) feats.push('Team seats (coming soon)')
  if (p.apiAccess) feats.push('API access (coming soon)')
  return feats
}
export type PlanId = 'free' | 'starter' | 'creator' | 'studio';

export interface PlanLimits {
  rendersPerMonth: number;
  maxVideoLengthMinutes: number;
  exportQuality: '720p' | '1080p' | '4k';
  hasWatermark: boolean;
  queuePriority: 'standard' | 'priority' | 'ultra';
  teamFeatures: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    rendersPerMonth: 12,
    maxVideoLengthMinutes: 10,
    exportQuality: '720p',
    hasWatermark: true,
    queuePriority: 'standard',
    teamFeatures: false,
    apiAccess: false,
  },
  starter: {
    rendersPerMonth: 20,
    maxVideoLengthMinutes: 30,
    exportQuality: '1080p',
    hasWatermark: false,
    queuePriority: 'standard',
    teamFeatures: false,
    apiAccess: false,
  },
  creator: {
    rendersPerMonth: 100,
    maxVideoLengthMinutes: 120,
    exportQuality: '4k',
    hasWatermark: false,
    queuePriority: 'priority',
    teamFeatures: false,
    apiAccess: false,
  },
  studio: {
    rendersPerMonth: 999999, // unlimited
    maxVideoLengthMinutes: 999,
    exportQuality: '4k',
    hasWatermark: false,
    queuePriority: 'ultra',
    teamFeatures: true,
    apiAccess: true,
  },
};

export const STRIPE_PRICE_LOOKUP_KEYS: Record<Exclude<PlanId, 'free'>, string> = {
  starter: 'starter_monthly',
  creator: 'creator_monthly',
  studio: 'studio_monthly',
};
