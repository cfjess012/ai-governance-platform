'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSessionStore } from '@/lib/store/session-store';

/**
 * Session gate — wraps the app and redirects to /login if no session.
 * Allows the /login page itself to render without a session.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, pathname, router]);

  // Always render /login without gating
  if (pathname === '/login') return <>{children}</>;

  // Show nothing while redirecting to login
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
