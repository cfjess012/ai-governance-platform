import { describe, expect, it } from 'vitest';
import {
  applyLightweightReview,
  isReadyForLightweightReview,
  type LightweightReviewInput,
  statusForLightweightDecision,
  validateLightweightReview,
} from '@/lib/triage/lightweight-review';
import type { AIUseCase } from '@/types/inventory';

function makeUseCase(overrides: Partial<AIUseCase> = {}): AIUseCase {
  const now = new Date().toISOString();
  return {
    id: 'test-1',
    intake: {} as AIUseCase['intake'],
    classification: {
      euAiActTier: 'minimal',
      riskTier: 'low',
      overrideTriggered: false,
      explanation: [],
    },
    status: 'lightweight_review',
    timeline: [{ status: 'submitted', timestamp: now, changedBy: 'user@test.com' }],
    comments: [],
    createdAt: now,
    updatedAt: now,
    submittedBy: 'user@test.com',
    ...overrides,
  };
}

function validInput(overrides: Partial<LightweightReviewInput> = {}): LightweightReviewInput {
  return {
    intakeAccurate: true,
    basicControlsConfirmed: true,
    escalationContact: 'oncall@test.com',
    reviewNotes: 'Reviewed the system and confirmed all controls.',
    decision: 'approve',
    ...overrides,
  };
}

describe('Lightweight Review', () => {
  describe('statusForLightweightDecision', () => {
    it('approve → approved', () => {
      expect(statusForLightweightDecision('approve')).toBe('approved');
    });

    it('changes_requested → changes_requested', () => {
      expect(statusForLightweightDecision('changes_requested')).toBe('changes_requested');
    });

    it('escalate → assessment_required', () => {
      expect(statusForLightweightDecision('escalate')).toBe('assessment_required');
    });

    it('reject → rejected', () => {
      expect(statusForLightweightDecision('reject')).toBe('rejected');
    });
  });

  describe('validateLightweightReview', () => {
    it('returns no errors for valid input', () => {
      expect(validateLightweightReview(validInput())).toEqual([]);
    });

    it('requires escalation contact', () => {
      const errors = validateLightweightReview(validInput({ escalationContact: '' }));
      expect(errors).toContain('Escalation contact is required');
    });

    it('requires escalation contact to be non-whitespace', () => {
      const errors = validateLightweightReview(validInput({ escalationContact: '   ' }));
      expect(errors).toContain('Escalation contact is required');
    });

    it('requires review notes of at least 10 characters', () => {
      const errors = validateLightweightReview(validInput({ reviewNotes: 'short' }));
      expect(errors).toContain('Review notes must be at least 10 characters');
    });

    it('blocks approval without confirming intake accuracy', () => {
      const errors = validateLightweightReview(validInput({ intakeAccurate: false }));
      expect(errors).toContain('Cannot approve: intake accuracy must be confirmed');
    });

    it('blocks approval without confirming basic controls', () => {
      const errors = validateLightweightReview(validInput({ basicControlsConfirmed: false }));
      expect(errors).toContain('Cannot approve: basic controls must be confirmed');
    });

    it('allows changes_requested without confirming intake accuracy', () => {
      const errors = validateLightweightReview(
        validInput({
          decision: 'changes_requested',
          intakeAccurate: false,
          rejectionReason: 'Need to clarify the data flows',
        }),
      );
      expect(errors).not.toContain('Cannot approve: intake accuracy must be confirmed');
    });

    it('requires a reason for changes_requested', () => {
      const errors = validateLightweightReview(
        validInput({
          decision: 'changes_requested',
          rejectionReason: '',
        }),
      );
      expect(errors).toContain('A reason is required for changes requested or rejection');
    });

    it('requires a reason for rejection', () => {
      const errors = validateLightweightReview(
        validInput({
          decision: 'reject',
          rejectionReason: '',
        }),
      );
      expect(errors).toContain('A reason is required for changes requested or rejection');
    });

    it('does not require a reason for escalate', () => {
      const errors = validateLightweightReview(
        validInput({
          decision: 'escalate',
          intakeAccurate: false,
          basicControlsConfirmed: false,
        }),
      );
      expect(errors).not.toContain('A reason is required for changes requested or rejection');
    });
  });

  describe('applyLightweightReview', () => {
    it('records the review on the use case', () => {
      const useCase = makeUseCase();
      const result = applyLightweightReview(useCase, validInput(), 'reviewer@test.com');
      expect(result.lightweightReview).toBeDefined();
      expect(result.lightweightReview?.decision).toBe('approve');
      expect(result.lightweightReview?.reviewedBy).toBe('reviewer@test.com');
      expect(result.lightweightReview?.reviewedAt).toBeDefined();
    });

    it('approves: status becomes approved', () => {
      const useCase = makeUseCase();
      const result = applyLightweightReview(
        useCase,
        validInput({ decision: 'approve' }),
        'reviewer@test.com',
      );
      expect(result.status).toBe('approved');
    });

    it('escalates: status becomes assessment_required', () => {
      const useCase = makeUseCase();
      const result = applyLightweightReview(
        useCase,
        validInput({ decision: 'escalate' }),
        'reviewer@test.com',
      );
      expect(result.status).toBe('assessment_required');
    });

    it('rejects: status becomes rejected', () => {
      const useCase = makeUseCase();
      const result = applyLightweightReview(
        useCase,
        validInput({ decision: 'reject', rejectionReason: 'Out of scope' }),
        'reviewer@test.com',
      );
      expect(result.status).toBe('rejected');
    });

    it('records approval conditions when provided', () => {
      const useCase = makeUseCase();
      const result = applyLightweightReview(
        useCase,
        validInput({ approvalConditions: 'Quarterly re-review' }),
        'reviewer@test.com',
      );
      expect(result.lightweightReview?.approvalConditions).toBe('Quarterly re-review');
    });

    it('appends a status change to the timeline', () => {
      const useCase = makeUseCase();
      const result = applyLightweightReview(useCase, validInput(), 'reviewer@test.com');
      expect(result.timeline.length).toBe(2);
      expect(result.timeline[1].status).toBe('approved');
      expect(result.timeline[1].changedBy).toBe('reviewer@test.com');
    });

    it('updates updatedAt timestamp', () => {
      const useCase = makeUseCase({ updatedAt: '2026-01-01T00:00:00.000Z' });
      const result = applyLightweightReview(useCase, validInput(), 'reviewer@test.com');
      expect(result.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
    });

    it('preserves other case fields', () => {
      const useCase = makeUseCase({ id: 'preserved-id', submittedBy: 'someone@test.com' });
      const result = applyLightweightReview(useCase, validInput(), 'reviewer@test.com');
      expect(result.id).toBe('preserved-id');
      expect(result.submittedBy).toBe('someone@test.com');
    });
  });

  describe('isReadyForLightweightReview', () => {
    it('returns true for cases in lightweight_review status', () => {
      expect(isReadyForLightweightReview(makeUseCase({ status: 'lightweight_review' }))).toBe(true);
    });

    it('returns false for other statuses', () => {
      expect(isReadyForLightweightReview(makeUseCase({ status: 'submitted' }))).toBe(false);
      expect(isReadyForLightweightReview(makeUseCase({ status: 'assessment_required' }))).toBe(
        false,
      );
      expect(isReadyForLightweightReview(makeUseCase({ status: 'approved' }))).toBe(false);
    });
  });
});
