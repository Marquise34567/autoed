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
