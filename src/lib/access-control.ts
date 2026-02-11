/**
 * Feature Access Control
 * Server-side plan → feature gating
 */

import { PLANS, type PlanId } from '@/config/plans'

export type FeatureKey = 
  | 'basic_export'
  | 'priority_queue'
  | 'advanced_retention'
  | 'batch_upload'
  | 'api_access'
  | '1080p_export'
  | '4k_export'

/**
 * Check if a plan has access to a feature
 */
export function hasAccess(planId: PlanId | string, feature: FeatureKey): boolean {
  const plan = PLANS[planId as PlanId]
  if (!plan) return false

  switch (feature) {
    case 'basic_export':
      return true // All plans can export
    
    case '1080p_export':
      return plan.features.exportQuality === '1080p' || plan.features.exportQuality === '4k'
    
    case '4k_export':
      return plan.features.exportQuality === '4k'
    
    case 'priority_queue':
      return plan.features.queuePriority === 'priority' || plan.features.queuePriority === 'ultra'
    
    case 'advanced_retention':
      return plan.features.advancedRetention
    
    case 'batch_upload':
      return plan.features.batchUploadSize > 1
    
    case 'api_access':
      return plan.features.apiAccess
    
    default:
      return false
  }
}

/**
 * Get user's plan and subscription status from database
 */
export interface UserSubscription {
  plan: PlanId
  status: 'active' | 'inactive' | 'past_due' | 'canceled'
}

/**
 * Require active subscription for protected features
 * Throws 402 if not accessible
 */
export function requireFeature(subscription: UserSubscription | null, feature: FeatureKey): void {
  if (!subscription) {
    throw new Error('No subscription found')
  }

  if (subscription.status !== 'active') {
    throw new Error('Subscription not active')
  }

  if (!hasAccess(subscription.plan, feature)) {
    throw new Error(`Feature '${feature}' requires higher plan`)
  }
}
