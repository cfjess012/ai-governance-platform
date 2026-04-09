'use client';

import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/lib/store/session-store';
import { AppSidebar } from './AppSidebar';
import { SessionGate } from './SessionGate';

/**
 * AppShell — client-side wrapper that handles session gating and
 * conditionally renders the sidebar. The /login page gets no sidebar;
 * all other pages get the role-aware sidebar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <SessionGate>
      {isAuthenticated && !isLoginPage && <AppSidebar />}
      <main
        className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        {children}
      </main>
    </SessionGate>
  );
}
