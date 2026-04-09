/**
 * Hook that provides the current session user's identity strings for
 * use in store actions, timeline entries, and UI display.
 *
 * Returns safe fallbacks if no session is active (should not happen
 * in practice because of SessionGate, but defensive).
 */

import { useSessionStore } from '@/lib/store/session-store';

export function useActor() {
  const user = useSessionStore((s) => s.user);

  return {
    /** Full name (e.g., "Sarah Chen") */
    name: user?.name ?? 'Unknown User',
    /** Email (e.g., "sarah.chen@company.com") */
    email: user?.email ?? 'unknown@example.com',
    /** Title (e.g., "AI Governance Analyst") */
    title: user?.title ?? '',
    /** "Name (Title)" for timeline entries */
    identity: user ? `${user.name} (${user.title})` : 'Unknown User',
    /** Role */
    role: user?.role ?? ('business_user' as const),
    /** The raw user object */
    user,
  };
}
