/**
 * Decommissioning — pure functions for marking a case as retired.
 *
 * Decommissioning is the final governance state before a case disappears
 * from active oversight. It captures:
 *   - who decommissioned it
 *   - why (required: operational, regulatory, replaced, retired, other)
 *   - effective date (may be future-dated — a "planned decommission")
 *   - optional free-text notes
 *
 * The state transition is one-way: once a case is decommissioned, it
 * stays that way. Reversal requires a new intake submission.
 */

import type { AIUseCase, StatusChange } from '@/types/inventory';

export const DECOMMISSION_REASONS = [
  'operational', // Business decision — no longer needed
  'regulatory', // Compliance issue forced retirement
  'replaced', // Replaced by a newer system
  'retired', // Scheduled sunset
  'other',
] as const;

export type DecommissionReason = (typeof DECOMMISSION_REASONS)[number];

export interface DecommissionInput {
  reason: DecommissionReason;
  effectiveDate: string; // ISO date, may be future
  notes?: string;
  /** Who authorized the decommission — required for audit. */
  authorizedBy: string;
}

export interface DecommissionValidationError {
  field: keyof DecommissionInput;
  message: string;
}

/**
 * Validate a decommission submission. Returns an array of field-keyed errors.
 */
export function validateDecommission(
  input: Partial<DecommissionInput>,
): DecommissionValidationError[] {
  const errors: DecommissionValidationError[] = [];
  if (!input.reason) {
    errors.push({ field: 'reason', message: 'Pick a decommission reason' });
  }
  if (!input.effectiveDate) {
    errors.push({ field: 'effectiveDate', message: 'Effective date is required' });
  } else if (Number.isNaN(Date.parse(input.effectiveDate))) {
    errors.push({ field: 'effectiveDate', message: 'Effective date must be a valid date' });
  }
  if (!input.authorizedBy?.trim()) {
    errors.push({ field: 'authorizedBy', message: 'Who authorized this decommission?' });
  }
  if (input.reason === 'other' && (!input.notes || input.notes.trim().length < 10)) {
    errors.push({
      field: 'notes',
      message: 'Notes are required when the reason is "other" (at least 10 characters)',
    });
  }
  return errors;
}

/**
 * Decide the status a decommissioned case should transition to.
 *
 * If the effective date is in the future, the case stays `in_production`
 * (we don't backdate) and gets a timeline entry flagging the scheduled
 * decommission — the sweeper promotes it on the effective date.
 *
 * If the effective date is today or in the past, the case transitions
 * immediately to `decommissioned`.
 */
export function shouldDecommissionNow(effectiveDate: string, now: Date = new Date()): boolean {
  const effective = Date.parse(effectiveDate);
  if (Number.isNaN(effective)) return false;
  return effective <= now.getTime();
}

/**
 * Apply a decommission to a case — returns an updated AIUseCase with the
 * timeline appended, a decommission note added to the explanation, and
 * status advanced if the effective date has passed.
 *
 * This is a pure function over the case; the store wiring calls it and
 * commits the result.
 */
export function applyDecommission(
  useCase: AIUseCase,
  input: DecommissionInput,
  now: Date = new Date(),
): AIUseCase {
  const nowIso = now.toISOString();
  const isImmediate = shouldDecommissionNow(input.effectiveDate, now);
  const nextStatus = isImmediate ? 'decommissioned' : useCase.status;

  const decommissionNote = `Decommission ${isImmediate ? 'applied' : 'scheduled'}: ${
    input.reason
  } (effective ${input.effectiveDate}), authorized by ${input.authorizedBy}${
    input.notes ? ` — ${input.notes}` : ''
  }`;

  const statusChange: StatusChange = {
    status: nextStatus,
    timestamp: nowIso,
    changedBy: input.authorizedBy,
  };

  return {
    ...useCase,
    status: nextStatus,
    timeline: [...useCase.timeline, statusChange],
    classification: {
      ...useCase.classification,
      explanation: [...useCase.classification.explanation, decommissionNote],
    },
    updatedAt: nowIso,
  };
}
