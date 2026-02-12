"use client";

import posthog from "posthog-js";

type AnalyticsProps = Record<string, unknown> | undefined;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void;
  }
}

export function trackPostHogEvent(eventName: string, props?: AnalyticsProps) {
  if (!eventName) return;
  posthog.capture(eventName, props);
}

export function trackPlausibleEvent(eventName: string, props?: AnalyticsProps) {
  if (!eventName) return;
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;

  window.plausible(eventName, props ? { props } : undefined);
}

export function trackAnalytics(eventName: string, props?: AnalyticsProps) {
  trackPostHogEvent(eventName, props);
}
