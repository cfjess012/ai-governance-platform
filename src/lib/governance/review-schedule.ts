/**
 * Periodic review scheduler.
 *
 * Computes when a use case is next due for re-attestation, based on its
 * inherent risk tier. The cadence is intentionally conservative — high-risk
 * cases get monthly reviews because that's what regulators expect.
 *
 * This is a pure module: no I/O, no React, no store. The store wires it in
 * after triage and after every approval transition.
 */

import type { InherentRiskTier } from '@/lib/risk/types';
import type { ReviewFrequency, ReviewSchedule } from './types';

/**
 * Cadence by tier. The mapping reflects how a real risk function would
 * sequence re-attestation:
 *
 *   high       → monthly      (board-level visibility, continuous monitoring)
 *   medium_high → quarterly    (committee review)
 *   medium     → semi-annual  (governance team review)
 *   medium_low → annual       (lightweight re-attestation)
 *   low        → annual       (lightweight re-attestation)
 */
export const REVIEW_FREQUENCY_BY_TIER: Record<InherentRiskTier, ReviewFrequency> = {
  high: 'monthly',
  medium_high: 'quarterly',
  medium: 'semi_annual',
  medium_low: 'annual',
  low: 'annual',
};

/** Days between reviews for each frequency */
const FREQUENCY_DAYS: Record<ReviewFrequency, number> = {
  monthly: 30,
  quarterly: 91,
  semi_annual: 182,
  annual: 365,
};

/**
 * Add N days to an ISO date string. Returns ISO date (no time component).
 */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/**
 * Compute the next review schedule for a use case at a given tier.
 *
 * @param tier              The current inherent (or residual) risk tier
 * @param lastReviewedAt    ISO timestamp of the most recent review.
 *                          If undefined, the schedule is anchored to "now".
 * @param reviewOwner       Optional owner to carry forward
 */
export function computeReviewSchedule(
  tier: InherentRiskTier,
  lastReviewedAt?: string,
  reviewOwner?: string,
): ReviewSchedule {
  const frequency = REVIEW_FREQUENCY_BY_TIER[tier];
  const anchor = lastReviewedAt ?? new Date().toISOString();
  const nextReviewDue = addDays(anchor, FREQUENCY_DAYS[frequency]);
  return {
    frequency,
    lastReviewedAt,
    nextReviewDue,
    reviewOwner,
  };
}

/**
 * Returns true if the schedule is overdue right now.
 */
export function isReviewOverdue(schedule: ReviewSchedule, asOf: Date = new Date()): boolean {
  return new Date(schedule.nextReviewDue).getTime() < asOf.getTime();
}

/**
 * Days until the next review (negative if overdue).
 */
export function daysUntilReview(schedule: ReviewSchedule, asOf: Date = new Date()): number {
  const due = new Date(schedule.nextReviewDue).getTime();
  const now = asOf.getTime();
  return Math.floor((due - now) / (1000 * 60 * 60 * 24));
}

/**
 * Bucket a schedule into a UI-friendly status.
 *
 *   overdue   — past the due date
 *   due_soon  — within the next 14 days
 *   upcoming  — within the next 60 days
 *   on_track  — more than 60 days away
 */
export type ReviewStatus = 'overdue' | 'due_soon' | 'upcoming' | 'on_track';

export function reviewStatus(schedule: ReviewSchedule, asOf: Date = new Date()): ReviewStatus {
  const days = daysUntilReview(schedule, asOf);
  if (days < 0) return 'overdue';
  if (days <= 14) return 'due_soon';
  if (days <= 60) return 'upcoming';
  return 'on_track';
}

/** Human-friendly label for the next review */
export function formatNextReview(schedule: ReviewSchedule, asOf: Date = new Date()): string {
  const status = reviewStatus(schedule, asOf);
  const days = daysUntilReview(schedule, asOf);
  if (status === 'overdue') {
    return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
  }
  if (status === 'due_soon') {
    return `Due in ${days} day${days === 1 ? '' : 's'}`;
  }
  return `Due ${new Date(schedule.nextReviewDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
