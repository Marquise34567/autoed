 'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { EDITOR_ROUTE, LOGIN_ROUTE } from '@/lib/routes'
import { useAuth } from '@/lib/auth/useAuth'

interface User {
  id: string;
  email: string;
}

export function UserNav() {
  const router = useRouter();
  const { user, authReady } = useAuth();
  const pathname = usePathname();

  // On the landing page we intentionally hide the Editor link and any
  // additional auth controls so the page shows only the single CTA.
  if (pathname === '/') return null;

  if (!authReady) return null;

  const { logout } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-4">
        {/* Hide the Editor link when already on the editor page */}
        {pathname !== '/editor' && (
          <Link
            href={EDITOR_ROUTE}
            className="rounded-full px-4 py-2 text-white/90 transition hover:scale-[1.02]"
          >
            Editor
          </Link>
        )}
        <button
          onClick={async () => {
            try {
              await logout()
              router.replace('/')
            } catch (err) {
              console.error('Logout failed:', err)
            }
          }}
          className="rounded-full px-4 py-2 text-sm text-white/80 border border-white/12 hover:bg-white/6 transition"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href={EDITOR_ROUTE}
        className="rounded-full px-4 py-2 text-white/90 transition hover:scale-[1.02]"
      >
        Editor
      </Link>
      <Link
        href={LOGIN_ROUTE}
        className="rounded-full px-4 py-2 text-white/90 border border-white/12 transition hover:bg-white/6"
      >
        Sign in
      </Link>
    </div>
  );
}
