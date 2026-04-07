/**
 * Pure functions for triage decision logic.
 * No side effects — fully testable.
 */
import type { RiskTier } from '@/lib/classification/seven-dimension-scoring';
import type {
  AIUseCase,
  AIUseCaseStatus,
  GovernancePath,
  StatusChange,
  TriageDecision,
} from '@/types/inventory';

export interface TriageDecisionInput {
  confirmedRiskTier: RiskTier;
  riskTierOverridden: boolean;
  overrideReason?: string;
  governancePath: GovernancePath;
  assignedReviewer: string;
  triageNotes: string;
}

/**
 * Determine the next status after triage based on the chosen governance path.
 * - lightweight: skips full assessment, goes to lightweight_review
 * - standard: requires full assessment
 * - full: requires full assessment + meeting (still routes via assessment_required)
 */
export function nextStatusAfterTriage(path: GovernancePath): AIUseCaseStatus {
  switch (path) {
    case 'lightweight':
      return 'lightweight_review';
    case 'standard':
    case 'full':
      return 'assessment_required';
  }
}

/**
 * Recommend a governance path based on the preliminary risk classification.
 * The reviewer can override this in the triage UI.
 */
export function recommendGovernancePath(riskTier: RiskTier): GovernancePath {
  switch (riskTier) {
    case 'low':
      return 'lightweight';
    case 'medium':
      return 'standard';
    case 'high':
    case 'critical':
      return 'full';
  }
}

/**
 * Apply a triage decision to a use case, returning a new use case with:
 * - The triage decision recorded
 * - Status advanced to the next state based on the chosen path
 * - Timeline updated with the status change
 * - Updated timestamp
 */
export function applyTriageDecision(
  useCase: AIUseCase,
  decision: TriageDecisionInput,
  triagedBy: string,
): AIUseCase {
  const now = new Date().toISOString();
  const nextStatus = nextStatusAfterTriage(decision.governancePath);

  const triage: TriageDecision = {
    confirmedRiskTier: decision.confirmedRiskTier,
    riskTierOverridden: decision.riskTierOverridden,
    overrideReason: decision.overrideReason,
    governancePath: decision.governancePath,
    assignedReviewer: decision.assignedReviewer,
    triageNotes: decision.triageNotes,
    triagedBy,
    triagedAt: now,
  };

  const statusChange: StatusChange = {
    status: nextStatus,
    timestamp: now,
    changedBy: triagedBy,
  };

  return {
    ...useCase,
    classification: {
      ...useCase.classification,
      // Update the official classification to reflect the confirmed tier
      riskTier: decision.confirmedRiskTier,
    },
    triage,
    status: nextStatus,
    timeline: [...useCase.timeline, statusChange],
    updatedAt: now,
  };
}

/**
 * Validate a triage decision before applying it.
 * Returns an array of error messages (empty if valid).
 */
export function validateTriageDecision(decision: TriageDecisionInput): string[] {
  const errors: string[] = [];

  if (!decision.assignedReviewer || decision.assignedReviewer.trim() === '') {
    errors.push('Assigned reviewer is required');
  }

  if (
    decision.riskTierOverridden &&
    (!decision.overrideReason || decision.overrideReason.trim() === '')
  ) {
    errors.push('Override reason is required when risk tier is overridden');
  }

  if (!decision.triageNotes || decision.triageNotes.trim().length < 10) {
    errors.push('Triage notes must be at least 10 characters');
  }

  return errors;
}

/**
 * Determine if a use case is awaiting triage.
 * Cases in 'submitted' or 'triage_pending' status are in the triage queue.
 */
export function isAwaitingTriage(useCase: AIUseCase): boolean {
  return useCase.status === 'submitted' || useCase.status === 'triage_pending';
}

/**
 * Calculate the age of a use case in business days since submission.
 */
export function caseAgeInDays(useCase: AIUseCase, now: Date = new Date()): number {
  const created = new Date(useCase.createdAt);
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
