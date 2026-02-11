import posthog from 'posthog-js';

// Type-safe event tracking utilities

export function trackPricingPlanClicked(plan: string) {
  posthog.capture('pricing_plan_clicked', { plan });
}

export function trackCheckoutStarted(priceId: string, plan?: string) {
  posthog.capture('checkout_started', { priceId, plan });
}

export function trackCheckoutCompleted(priceId: string, plan?: string) {
  posthog.capture('checkout_completed', { priceId, plan });
}

export function trackCheckoutFailed(reason: string) {
  posthog.capture('checkout_failed', { reason });
}

export function trackSignupCompleted(method: 'email' | 'google' | 'github' = 'email') {
  posthog.capture('signup_completed', { method });
}

export function trackLoginCompleted(method: 'email' | 'google' | 'github' = 'email') {
  posthog.capture('login_completed', { method });
}

export function trackUploadStarted(fileSize?: number) {
  posthog.capture('upload_started', { fileSize });
}

export function trackUploadCompleted(fileSize?: number, duration?: number) {
  posthog.capture('upload_completed', { fileSize, duration });
}

export function trackClipGenerationStarted(videoId?: string) {
  posthog.capture('clip_generation_started', { videoId });
}

export function trackClipGenerated(clipCount: number, videoId?: string) {
  posthog.capture('clip_generated', { clipCount, videoId });
}

export function trackSubscriptionUpgraded(newPlan: string, oldPlan?: string) {
  posthog.capture('subscription_upgraded', { newPlan, oldPlan });
}

export function trackSubscriptionCanceled(plan: string, reason?: string) {
  posthog.capture('subscription_canceled', { plan, reason });
}

export function trackFeatureUsed(featureName: string, metadata?: Record<string, any>) {
  posthog.capture('feature_used', { featureName, ...metadata });
}

export function trackError(errorMessage: string, errorContext?: string) {
  posthog.capture('error_occurred', { errorMessage, errorContext });
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  posthog.identify(userId, traits);
}

export function resetAnalytics() {
  posthog.reset();
}

// Plausible helper (if using Plausible)
export function trackPlausible(eventName: string, props?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible(eventName, { props });
  }
}
