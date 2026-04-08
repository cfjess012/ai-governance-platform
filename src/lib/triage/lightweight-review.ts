/**
 * Pure functions for the lightweight review workflow.
 * Lightweight review is the fast path for low-risk use cases — single reviewer,
 * checklist-style, no full assessment.
 */
import type {
  AIUseCase,
  AIUseCaseStatus,
  LightweightDecision,
  LightweightReview,
  StatusChange,
} from '@/types/inventory';

export interface LightweightReviewInput {
  intakeAccurate: boolean;
  basicControlsConfirmed: boolean;
  escalationContact: string;
  reviewNotes: string;
  decision: LightweightDecision;
  approvalConditions?: string;
  rejectionReason?: string;
}

/** Map a decision to the next case status. */
export function statusForLightweightDecision(decision: LightweightDecision): AIUseCaseStatus {
  switch (decision) {
    case 'approve':
      return 'approved';
    case 'changes_requested':
      return 'changes_requested';
    case 'escalate':
      // Escalation routes the case to the standard assessment path
      return 'assessment_required';
    case 'reject':
      return 'rejected';
  }
}

/**
 * Validate a lightweight review submission. Returns array of error messages.
 */
export function validateLightweightReview(input: LightweightReviewInput): string[] {
  const errors: string[] = [];

  if (!input.escalationContact || input.escalationContact.trim() === '') {
    errors.push('Escalation contact is required');
  }

  if (!input.reviewNotes || input.reviewNotes.trim().length < 10) {
    errors.push('Review notes must be at least 10 characters');
  }

  if (input.decision === 'approve' && !input.intakeAccurate) {
    errors.push('Cannot approve: intake accuracy must be confirmed');
  }

  if (input.decision === 'approve' && !input.basicControlsConfirmed) {
    errors.push('Cannot approve: basic controls must be confirmed');
  }

  if (
    (input.decision === 'changes_requested' || input.decision === 'reject') &&
    (!input.rejectionReason || input.rejectionReason.trim() === '')
  ) {
    errors.push('A reason is required for changes requested or rejection');
  }

  return errors;
}

/**
 * Apply a lightweight review decision, returning a new use case with the
 * review recorded, status advanced, and timeline updated.
 */
export function applyLightweightReview(
  useCase: AIUseCase,
  input: LightweightReviewInput,
  reviewedBy: string,
): AIUseCase {
  const now = new Date().toISOString();
  const nextStatus = statusForLightweightDecision(input.decision);

  const review: LightweightReview = {
    intakeAccurate: input.intakeAccurate,
    basicControlsConfirmed: input.basicControlsConfirmed,
    escalationContact: input.escalationContact,
    reviewNotes: input.reviewNotes,
    decision: input.decision,
    approvalConditions: input.approvalConditions,
    rejectionReason: input.rejectionReason,
    reviewedBy,
    reviewedAt: now,
  };

  const statusChange: StatusChange = {
    status: nextStatus,
    timestamp: now,
    changedBy: reviewedBy,
  };

  return {
    ...useCase,
    lightweightReview: review,
    status: nextStatus,
    timeline: [...useCase.timeline, statusChange],
    updatedAt: now,
  };
}

/**
 * Returns true if a use case is ready for lightweight review.
 */
export function isReadyForLightweightReview(useCase: AIUseCase): boolean {
  return useCase.status === 'lightweight_review';
}
