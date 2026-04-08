import { describe, expect, it } from 'vitest';
import {
  applyTriageDecision,
  caseAgeInDays,
  isAwaitingTriage,
  nextStatusAfterTriage,
  recommendGovernancePath,
  type TriageDecisionInput,
  validateTriageDecision,
} from '@/lib/triage/triage-actions';
import type { AIUseCase } from '@/types/inventory';

function makeUseCase(overrides: Partial<AIUseCase> = {}): AIUseCase {
  const now = new Date().toISOString();
  return {
    id: 'test-1',
    intake: {} as AIUseCase['intake'],
    classification: {
      euAiActTier: 'pending',
      riskTier: 'medium',
      overrideTriggered: false,
      explanation: [],
    },
    status: 'submitted',
    timeline: [{ status: 'submitted', timestamp: now, changedBy: 'user@test.com' }],
    comments: [],
    createdAt: now,
    updatedAt: now,
    submittedBy: 'user@test.com',
    ...overrides,
  };
}

function validDecision(overrides: Partial<TriageDecisionInput> = {}): TriageDecisionInput {
  return {
    confirmedInherentTier: 'medium',
    riskTierOverridden: false,
    governancePath: 'standard',
    assignedReviewer: 'reviewer@test.com',
    triageNotes: 'This is a valid triage note with enough detail.',
    ...overrides,
  };
}

describe('Triage Actions', () => {
  describe('nextStatusAfterTriage', () => {
    it('routes lightweight path to lightweight_review', () => {
      expect(nextStatusAfterTriage('lightweight')).toBe('lightweight_review');
    });

    it('routes standard path to assessment_required', () => {
      expect(nextStatusAfterTriage('standard')).toBe('assessment_required');
    });

    it('routes full path to assessment_required', () => {
      expect(nextStatusAfterTriage('full')).toBe('assessment_required');
    });
  });

  describe('recommendGovernancePath', () => {
    it('recommends lightweight for low risk', () => {
      expect(recommendGovernancePath('low')).toBe('lightweight');
    });

    it('recommends lightweight for medium-low risk', () => {
      expect(recommendGovernancePath('medium_low')).toBe('lightweight');
    });

    it('recommends standard for medium risk', () => {
      expect(recommendGovernancePath('medium')).toBe('standard');
    });

    it('recommends standard for medium-high risk', () => {
      expect(recommendGovernancePath('medium_high')).toBe('standard');
    });

    it('recommends full for high risk', () => {
      expect(recommendGovernancePath('high')).toBe('full');
    });
  });

  describe('validateTriageDecision', () => {
    it('returns no errors for a valid decision', () => {
      expect(validateTriageDecision(validDecision())).toEqual([]);
    });

    it('requires assigned reviewer', () => {
      const errors = validateTriageDecision(validDecision({ assignedReviewer: '' }));
      expect(errors).toContain('Assigned reviewer is required');
    });

    it('requires reviewer to be non-whitespace', () => {
      const errors = validateTriageDecision(validDecision({ assignedReviewer: '   ' }));
      expect(errors).toContain('Assigned reviewer is required');
    });

    it('requires override reason when tier is overridden', () => {
      const errors = validateTriageDecision(
        validDecision({ riskTierOverridden: true, overrideReason: '' }),
      );
      expect(errors).toContain('Override reason is required when risk tier is overridden');
    });

    it('does not require override reason when tier is not overridden', () => {
      const errors = validateTriageDecision(
        validDecision({ riskTierOverridden: false, overrideReason: '' }),
      );
      expect(errors).not.toContain('Override reason is required when risk tier is overridden');
    });

    it('requires triage notes of at least 10 characters', () => {
      const errors = validateTriageDecision(validDecision({ triageNotes: 'short' }));
      expect(errors).toContain('Triage notes must be at least 10 characters');
    });

    it('returns multiple errors at once', () => {
      const errors = validateTriageDecision({
        confirmedInherentTier: 'low',
        riskTierOverridden: true,
        governancePath: 'lightweight',
        assignedReviewer: '',
        triageNotes: '',
      });
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('applyTriageDecision', () => {
    it('records the triage decision on the use case', () => {
      const useCase = makeUseCase();
      const result = applyTriageDecision(useCase, validDecision(), 'gov@test.com');
      expect(result.triage).toBeDefined();
      expect(result.triage?.confirmedInherentTier).toBe('medium');
      expect(result.triage?.governancePath).toBe('standard');
      expect(result.triage?.assignedReviewer).toBe('reviewer@test.com');
      expect(result.triage?.triagedBy).toBe('gov@test.com');
      expect(result.triage?.triagedAt).toBeDefined();
    });

    it('advances status based on governance path', () => {
      const useCase = makeUseCase();
      const lightweight = applyTriageDecision(
        useCase,
        validDecision({ governancePath: 'lightweight' }),
        'gov@test.com',
      );
      expect(lightweight.status).toBe('lightweight_review');

      const standard = applyTriageDecision(
        useCase,
        validDecision({ governancePath: 'standard' }),
        'gov@test.com',
      );
      expect(standard.status).toBe('assessment_required');

      const full = applyTriageDecision(
        useCase,
        validDecision({ governancePath: 'full' }),
        'gov@test.com',
      );
      expect(full.status).toBe('assessment_required');
    });

    it('appends a status change to the timeline', () => {
      const useCase = makeUseCase();
      const result = applyTriageDecision(useCase, validDecision(), 'gov@test.com');
      expect(result.timeline.length).toBe(2);
      expect(result.timeline[1].status).toBe('assessment_required');
      expect(result.timeline[1].changedBy).toBe('gov@test.com');
    });

    it('records confirmed inherent tier on the triage object', () => {
      const useCase = makeUseCase({
        classification: {
          euAiActTier: 'pending',
          riskTier: 'medium',
          overrideTriggered: false,
          explanation: [],
        },
      });
      const result = applyTriageDecision(
        useCase,
        validDecision({
          confirmedInherentTier: 'high',
          riskTierOverridden: true,
          overrideReason: 'Reviewer found additional risks',
        }),
        'gov@test.com',
      );
      expect(result.triage?.confirmedInherentTier).toBe('high');
      expect(result.triage?.riskTierOverridden).toBe(true);
      expect(result.triage?.overrideReason).toBe('Reviewer found additional risks');
    });

    it('preserves other use case fields', () => {
      const useCase = makeUseCase({
        intake: { useCaseName: 'Test System' } as AIUseCase['intake'],
      });
      const result = applyTriageDecision(useCase, validDecision(), 'gov@test.com');
      expect(result.intake.useCaseName).toBe('Test System');
      expect(result.id).toBe(useCase.id);
      expect(result.submittedBy).toBe(useCase.submittedBy);
    });

    it('updates the updatedAt timestamp', () => {
      const useCase = makeUseCase({ updatedAt: '2026-01-01T00:00:00.000Z' });
      const result = applyTriageDecision(useCase, validDecision(), 'gov@test.com');
      expect(result.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('isAwaitingTriage', () => {
    it('returns true for submitted cases', () => {
      expect(isAwaitingTriage(makeUseCase({ status: 'submitted' }))).toBe(true);
    });

    it('returns true for triage_pending cases', () => {
      expect(isAwaitingTriage(makeUseCase({ status: 'triage_pending' }))).toBe(true);
    });

    it('returns false for cases that have been triaged', () => {
      expect(isAwaitingTriage(makeUseCase({ status: 'assessment_required' }))).toBe(false);
      expect(isAwaitingTriage(makeUseCase({ status: 'lightweight_review' }))).toBe(false);
      expect(isAwaitingTriage(makeUseCase({ status: 'approved' }))).toBe(false);
      expect(isAwaitingTriage(makeUseCase({ status: 'rejected' }))).toBe(false);
    });

    it('returns false for draft cases', () => {
      expect(isAwaitingTriage(makeUseCase({ status: 'draft' }))).toBe(false);
    });
  });

  describe('caseAgeInDays', () => {
    it('returns 0 for a case created right now', () => {
      const useCase = makeUseCase();
      expect(caseAgeInDays(useCase)).toBe(0);
    });

    it('returns the correct day count for an older case', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const useCase = makeUseCase({ createdAt: fiveDaysAgo.toISOString() });
      expect(caseAgeInDays(useCase)).toBeGreaterThanOrEqual(4);
      expect(caseAgeInDays(useCase)).toBeLessThanOrEqual(5);
    });

    it('uses provided "now" for testability', () => {
      const useCase = makeUseCase({ createdAt: '2026-04-01T00:00:00.000Z' });
      const now = new Date('2026-04-08T00:00:00.000Z');
      expect(caseAgeInDays(useCase, now)).toBe(7);
    });
  });

  describe('end-to-end triage flow', () => {
    it('handles a complete triage flow for a low-risk case', () => {
      const useCase = makeUseCase({
        classification: {
          euAiActTier: 'minimal',
          riskTier: 'low',
          overrideTriggered: false,
          explanation: [],
        },
      });

      const recommendedPath = recommendGovernancePath('low');
      expect(recommendedPath).toBe('lightweight');

      const decision = validDecision({
        confirmedInherentTier: 'low',
        governancePath: recommendedPath,
      });

      const errors = validateTriageDecision(decision);
      expect(errors).toEqual([]);

      const result = applyTriageDecision(useCase, decision, 'gov@test.com');
      expect(result.status).toBe('lightweight_review');
      expect(result.triage?.governancePath).toBe('lightweight');
    });

    it('handles a triage flow with reviewer override', () => {
      // Auto-classified as medium, but reviewer escalates to high
      const useCase = makeUseCase({
        classification: {
          euAiActTier: 'limited',
          riskTier: 'medium',
          overrideTriggered: false,
          explanation: [],
        },
      });

      const decision = validDecision({
        confirmedInherentTier: 'high',
        riskTierOverridden: true,
        overrideReason: 'Use case has external customer impact not captured at intake',
        governancePath: 'full',
      });

      const errors = validateTriageDecision(decision);
      expect(errors).toEqual([]);

      const result = applyTriageDecision(useCase, decision, 'gov@test.com');
      expect(result.triage?.confirmedInherentTier).toBe('high');
      expect(result.triage?.riskTierOverridden).toBe(true);
      expect(result.status).toBe('assessment_required');
    });
  });
});
