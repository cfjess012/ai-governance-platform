import { describe, expect, it } from 'vitest';
import { submitIntake } from '@/lib/intake/submit';
import type { IntakeLayer1Data } from '@/lib/questions/intake-layer1-schema';
import type { IntakeFormData } from '@/lib/questions/intake-schema';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function baseIntake(overrides: Partial<IntakeFormData> = {}): IntakeFormData {
  return {
    useCaseName: 'Test use case',
    useCaseOwner: 'Ada Lovelace <ada@example.com>',
    executiveSponsor: 'Grace Hopper',
    businessArea: 'marketing',
    businessProblem: 'We need to summarize weekly campaign reports faster.',
    howAiHelps: 'Uses a gen-AI model to extract highlights from the raw reports.',
    aiType: ['generative_ai'],
    buildOrAcquire: 'using_existing_tool',
    thirdPartyInvolved: 'yes',
    vendorName: 'OpenAI',
    usesFoundationModel: 'yes_vendor_managed',
    deploymentRegions: ['us_only'],
    lifecycleStage: 'idea_planning',
    previouslyReviewed: 'no',
    highRiskTriggers: ['none_of_above'],
    whoUsesSystem: 'internal_only',
    whoAffected: 'internal_only',
    worstOutcome: 'minor',
    dataSensitivity: ['internal'],
    humanOversight: 'human_reviews',
    differentialTreatment: 'no',
    peopleAffectedCount: 'under_100',
    ...overrides,
  };
}

function baseLayer1(overrides: Partial<IntakeLayer1Data> = {}): IntakeLayer1Data {
  return {
    useCaseName: 'Test use case',
    ownerName: 'Ada Lovelace',
    ownerEmail: 'ada@example.com',
    businessArea: 'marketing',
    description: 'Summarize weekly campaign reports.',
    aiType: ['generative_ai'],
    lifecycleStage: 'planning',
    riskTouchpoints: ['none_of_above'],
    ...overrides,
  };
}

const FIXED_NOW = new Date('2026-04-08T12:00:00Z');
const FIXED_SUFFIX = 'abc123';

function submit(overrides: Parameters<typeof submitIntake>[0]) {
  return submitIntake({
    now: FIXED_NOW,
    idSuffix: FIXED_SUFFIX,
    ...overrides,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('submitIntake — validation', () => {
  it('returns ok for a fully valid intake', () => {
    const result = submit({
      formData: baseIntake(),
      submittedBy: 'ada@example.com',
    });
    expect(result.ok).toBe(true);
  });

  it('returns field-keyed errors for a broken intake', () => {
    const bad = baseIntake();
    // biome-ignore lint/suspicious/noExplicitAny: deliberate bad value for error path
    (bad as any).useCaseName = '';
    // biome-ignore lint/suspicious/noExplicitAny: deliberate bad value for error path
    (bad as any).aiType = [];
    const result = submit({
      formData: bad,
      submittedBy: 'ada@example.com',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.useCaseName).toBeDefined();
      expect(result.errors.aiType).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Case construction
// ─────────────────────────────────────────────────────────────────────────────

describe('submitIntake — AIUseCase construction', () => {
  it('uses the deterministic id when idSuffix is supplied', () => {
    const result = submit({
      formData: baseIntake(),
      submittedBy: 'ada@example.com',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.useCase.id).toBe(`intake-${FIXED_NOW.getTime()}-${FIXED_SUFFIX}`);
    }
  });

  it('computes inherent risk', () => {
    const result = submit({
      formData: baseIntake(),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      expect(result.useCase.inherentRisk).toBeDefined();
      expect(result.useCase.inherentRisk?.tier).toMatch(/low|medium|high/);
    }
  });

  it('sets createdAt, updatedAt, and submittedBy', () => {
    const result = submit({
      formData: baseIntake(),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      expect(result.useCase.createdAt).toBe(FIXED_NOW.toISOString());
      expect(result.useCase.updatedAt).toBe(FIXED_NOW.toISOString());
      expect(result.useCase.submittedBy).toBe('ada@example.com');
    }
  });

  it('records a submitted + initial-status timeline', () => {
    const result = submit({
      formData: baseIntake(),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      expect(result.useCase.timeline.length).toBeGreaterThanOrEqual(1);
      expect(result.useCase.timeline[0].status).toBe('submitted');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lane routing
// ─────────────────────────────────────────────────────────────────────────────

describe('submitIntake — lane routing', () => {
  it('no layer1 → router auto-derives from intake, routerDecision is present', () => {
    const result = submit({
      formData: baseIntake(),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      // Router now always fires — even without explicit layer1, it derives
      // layer1 from the full intake and runs the routing rules.
      expect(result.routerDecision).toBeDefined();
      expect(result.routerDecision?.lane).toBeDefined();
      // A benign baseIntake() should route to lightweight (no triggers)
      expect(result.useCase.status).toBe('lightweight_review');
    }
  });

  it('layer1 lightweight lane → status lightweight_review', () => {
    const result = submit({
      formData: baseIntake(),
      layer1: baseLayer1(),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      expect(result.routerDecision?.lane).toBe('lightweight');
      expect(result.useCase.status).toBe('lightweight_review');
    }
  });

  it('layer1 standard lane → status triage_pending', () => {
    const result = submit({
      formData: baseIntake(),
      layer1: baseLayer1({ riskTouchpoints: ['customer_personal_data'] }),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      expect(result.routerDecision?.lane).toBe('standard');
      expect(result.useCase.status).toBe('triage_pending');
    }
  });

  it('layer1 enhanced lane → status triage_pending', () => {
    const result = submit({
      formData: baseIntake(),
      layer1: baseLayer1({ riskTouchpoints: ['financial_decisions'] }),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      expect(result.routerDecision?.lane).toBe('enhanced');
      expect(result.useCase.status).toBe('triage_pending');
    }
  });

  it('layer1 blocked lane → status contact_required (governance must talk to user first)', () => {
    const result = submit({
      formData: baseIntake(),
      layer1: baseLayer1({
        riskTouchpoints: ['acts_autonomously', 'financial_decisions'],
      }),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      expect(result.routerDecision?.lane).toBe('blocked');
      expect(result.useCase.status).toBe('contact_required');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Explanation merging
// ─────────────────────────────────────────────────────────────────────────────

describe('submitIntake — explanation list', () => {
  it('merges router-rule reasons with intake-classifier risk signals', () => {
    const result = submit({
      formData: baseIntake(),
      layer1: baseLayer1({ riskTouchpoints: ['financial_decisions'] }),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      expect(result.useCase.classification.explanation.length).toBeGreaterThan(0);
      // The router reason should be present
      const hasFinancialReason = result.useCase.classification.explanation.some((e) =>
        e.toLowerCase().includes('financial'),
      );
      expect(hasFinancialReason).toBe(true);
    }
  });

  it('works with just intake-classifier signals when there is no layer1', () => {
    const result = submit({
      formData: baseIntake({ deploymentRegions: ['eu_eea'] }),
      submittedBy: 'ada@example.com',
    });
    if (result.ok) {
      // EU deployment is a known risk signal
      expect(result.useCase.classification.explanation.length).toBeGreaterThan(0);
    }
  });
});
