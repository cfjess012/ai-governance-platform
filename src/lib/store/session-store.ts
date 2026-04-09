/**
 * Session store — lightweight persona-aware identity for the POC.
 *
 * This is NOT real authentication. It's a role-selection session that:
 *   1. Replaces every "mock-user@example.com" with a named individual
 *   2. Drives role-based navigation (business user vs governance analyst)
 *   3. Makes audit trail entries credible for demos and testing
 *   4. Defines the exact API shape that real auth (NextAuth, Clerk, etc.)
 *      will fill when the app migrates to production infrastructure
 *
 * The store is intentionally NOT persisted — refreshing the browser clears
 * the session and forces re-login. This is deliberate: a POC should not
 * pretend to have persistent auth when it doesn't.
 */

import { create } from 'zustand';

/**
 * The two primary personas the app supports.
 *
 * Persona 1 — Business User (Use Case Owner):
 *   Entry point: "My Submissions" + "New Intake"
 *   Core question: "What do I need to do to get my AI system approved?"
 *   Language: plain English, no regulatory jargon
 *   Can: submit intake, add comments, view own case status, resubmit
 *   Cannot: triage, assess, approve/reject, upload evidence, create exceptions
 *
 * Persona 2 — Governance Analyst (Risk Officer / AI Governance Lead):
 *   Entry point: "Triage Queue" + "Inventory"
 *   Core question: "What needs my attention, what's the risk, and what path?"
 *   Language: regulatory/technical (NIST, EU AI Act, SR 11-7)
 *   Can: everything the business user can + triage, assess, approve/reject,
 *        upload evidence, create exceptions, manage models, override tiers
 */
export type UserRole = 'business_user' | 'governance_analyst';

export interface SessionUser {
  /** Display name (e.g., "Sarah Chen") */
  name: string;
  /** Email (e.g., "sarah.chen@company.com") */
  email: string;
  /** Title (e.g., "Senior Product Manager") */
  title: string;
  /** Persona role */
  role: UserRole;
}

interface SessionState {
  /** The logged-in user, or null if no session */
  user: SessionUser | null;
  /** Whether a session is active */
  isAuthenticated: boolean;

  /** Log in with a persona */
  login: (user: SessionUser) => void;
  /** Log out and clear session */
  logout: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  isAuthenticated: false,

  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

// ─── Convenience selectors ──────────────────────────────────────────

/** Get the display name for audit trail entries, or fallback */
export function useActorName(): string {
  return useSessionStore((s) => s.user?.name ?? 'Unknown User');
}

/** Get the actor's email */
export function useActorEmail(): string {
  return useSessionStore((s) => s.user?.email ?? 'unknown@example.com');
}

/** Get the actor's identity string for timeline entries: "Name (Title)" */
export function useActorIdentity(): string {
  return useSessionStore((s) => (s.user ? `${s.user.name} (${s.user.title})` : 'Unknown User'));
}

/** Check if the current user has a specific role */
export function useHasRole(role: UserRole): boolean {
  return useSessionStore((s) => s.user?.role === role);
}

/** Check if the current user is a governance analyst */
export function useIsGovernanceAnalyst(): boolean {
  return useSessionStore((s) => s.user?.role === 'governance_analyst');
}

/** Check if the current user is a business user */
export function useIsBusinessUser(): boolean {
  return useSessionStore((s) => s.user?.role === 'business_user');
}
