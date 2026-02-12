"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { AuthProvider } from '@/lib/auth/useAuth'

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Client-only check for required NEXT_PUBLIC Firebase env vars.
    const required = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ];

    const missing = required.filter((k) => !(process.env as any)[k]);
    if (missing.length) {
      // Only print the names of missing keys (do not print secret values)
      // eslint-disable-next-line no-console
      console.error(`Missing NEXT_PUBLIC Firebase env vars: ${missing.join(', ')}`);
    }
  }, []);

  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey) {
      return;
    }

    const posthogHost =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";

    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: true,
      autocapture: false,
    });

    if (typeof window !== "undefined") {
      const flagKey = "posthog_install_verified";
      const alreadySent = window.sessionStorage.getItem(flagKey);

      if (!alreadySent) {
        posthog.capture("posthog_install_verified");
        window.sessionStorage.setItem(flagKey, "true");
      }
    }
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <AuthProvider>{children}</AuthProvider>
    </PostHogProvider>
  );
}
