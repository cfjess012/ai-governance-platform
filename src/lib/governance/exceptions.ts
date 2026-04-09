/**
 * Exception lifecycle helpers — pure functions over GovernanceException.
 *
 * Exceptions are first-class objects so they can be:
 *   • Listed in an audit-ready exception register
 *   • Tracked to expiry and forced to renew
 *   • Linked to board / executive sign-off
 *
 * The store layer wires these into actions; this file owns the logic so
 * it's testable without React or Zustand.
 */

import type { ExceptionStatus, GovernanceException } from './types';

/**
 * Generate a stable id for a new exception.
 */
function generateExceptionId(): string {
  return `exc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateExceptionInput {
  useCaseId: string;
  policyOrControl: string;
  reason: GovernanceException['reason'];
  justification: string;
  compensatingControls: string;
  requestedBy: string;
  approvedBy: string;
  approvedByRole: string;
  /** ISO date — required for active exceptions */
  expiresAt: string;
}

/**
 * Create a new active exception. Returns the immutable record.
 */
export function createException(input: CreateExceptionInput): GovernanceException {
  const now = new Date().toISOString();
  return {
    id: generateExceptionId(),
    useCaseId: input.useCaseId,
    policyOrControl: input.policyOrControl,
    reason: input.reason,
    justification: input.justification,
    compensatingControls: input.compensatingControls,
    status: 'active',
    requestedBy: input.requestedBy,
    requestedAt: now,
    approvedBy: input.approvedBy,
    approvedByRole: input.approvedByRole,
    approvedAt: now,
    expiresAt: input.expiresAt,
  };
}

/**
 * Expire an exception that has passed its expiresAt date. Returns a new
 * record with status='expired' (does NOT mutate the input).
 */
export function expireException(exception: GovernanceException): GovernanceException {
  return { ...exception, status: 'expired' };
}

/**
 * Revoke an active exception (e.g., the underlying issue was remediated
 * and the waiver is no longer needed, or the approver pulled it).
 */
export function revokeException(
  exception: GovernanceException,
  revokedBy: string,
  revocationReason: string,
): GovernanceException {
  return {
    ...exception,
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    revokedBy,
    revocationReason,
  };
}

/**
 * Returns true if an active exception is past its expiry date.
 */
export function isExpired(exception: GovernanceException, asOf: Date = new Date()): boolean {
  if (exception.status !== 'active') return false;
  if (!exception.expiresAt) return false;
  return new Date(exception.expiresAt).getTime() < asOf.getTime();
}

/**
 * Days until an active exception expires (negative if already expired).
 */
export function daysUntilExpiry(exception: GovernanceException, asOf: Date = new Date()): number {
  if (!exception.expiresAt) return Number.POSITIVE_INFINITY;
  const due = new Date(exception.expiresAt).getTime();
  const now = asOf.getTime();
  return Math.floor((due - now) / (1000 * 60 * 60 * 24));
}

/**
 * Filter exceptions by status. Convenience for register views.
 */
export function filterByStatus(
  exceptions: GovernanceException[],
  status: ExceptionStatus,
): GovernanceException[] {
  return exceptions.filter((e) => e.status === status);
}

/**
 * Sweep a list of exceptions, returning a new list with any past-expiry
 * exceptions transitioned from 'active' to 'expired'. Pure — does not
 * mutate the input.
 */
export function sweepExpiredExceptions(
  exceptions: GovernanceException[],
  asOf: Date = new Date(),
): GovernanceException[] {
  return exceptions.map((e) => (isExpired(e, asOf) ? expireException(e) : e));
}
