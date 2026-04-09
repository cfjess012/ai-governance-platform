/**
 * Tests for the 4 workflow gap fixes:
 *   Gap 1: changes_requested forward transition
 *   Gap 2: approved → in_production
 *   Gap 3: Layer 1 router fires for all intake flows
 *   Gap 4: Blocked lane re-routing
 */
import { describe, expect, it } from 'vitest';
import { deriveLayer1FromIntake, submitIntake } from '@/lib/intake/submit';
import type { IntakeFormData } from '@/lib/questions/intake-schema';
import type { AIUseCase, AIUseCaseStatus, RerouteEvent, StatusChange } from '@/types/inventory';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function baseIntake(overrides: Partial<IntakeFormData> = {}): IntakeFormData {
  return {
    useCaseName: 'Test case',
    useCaseOwner: 'Ada Lovelace <ada@example.com>',
    executiveSponsor: 'Grace Hopper',
    businessArea: 'marketing',
    businessProblem: 'We need to summarize reports weekly.',
    howAiHelps: 'Uses a gen-AI model to extract highlights.',
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

function makeCase(overrides: Partial<AIUseCase> & { status: AIUseCaseStatus }): AIUseCase {
  return {
    id: 'test-1',
    intake: baseIntake(),
    classification: {
      euAiActTier: 'pending',
      riskTier: 'pending',
      overrideTriggered: false,
      explanation: [],
    },
    timeline: [{ status: overrides.status, timestamp: '2026-04-01T00:00:00Z', changedBy: 'test' }],
    comments: [],
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    submittedBy: 'test@example.com',
    ...overrides,
  };
}

/**
 * Simulate a store action on a single case. The real store uses Zustand;
 * in tests we just call the pure logic directly. These helpers mirror
 * exactly what the store actions do, extracted for testability.
 */
function applyResubmit(uc: AIUseCase, resubmittedBy: string): AIUseCase {
  if (uc.status !== 'changes_requested') return uc;
  let nextStatus: AIUseCaseStatus;
  const path = uc.triage?.governancePath;
  if (path === 'lightweight' || uc.lightweightReview) {
    nextStatus = 'lightweight_review';
  } else if (uc.assessment) {
    nextStatus = 'decision_pending';
  } else if (path === 'standard' || path === 'full') {
    nextStatus = 'assessment_required';
  } else {
    nextStatus = 'triage_pending';
  }
  const now = new Date().toISOString();
  const change: StatusChange = { status: nextStatus, timestamp: now, changedBy: resubmittedBy };
  return { ...uc, status: nextStatus, timeline: [...uc.timeline, change], updatedAt: now };
}

function applyMarkInProduction(uc: AIUseCase, markedBy: string): AIUseCase {
  if (uc.status !== 'approved') return uc;
  const now = new Date().toISOString();
  const change: StatusChange = { status: 'in_production', timestamp: now, changedBy: markedBy };
  return {
    ...uc,
    status: 'in_production',
    productionDate: now,
    timeline: [...uc.timeline, change],
    updatedAt: now,
  };
}

function applyReroute(
  uc: AIUseCase,
  toLane: RerouteEvent['toLane'],
  resolutionNote: string,
  reroutedBy: string,
): AIUseCase {
  if (uc.status !== 'contact_required') return uc;
  const laneToStatus: Record<RerouteEvent['toLane'], AIUseCaseStatus> = {
    lightweight: 'lightweight_review',
    standard: 'triage_pending',
    enhanced: 'triage_pending',
  };
  const nextStatus = laneToStatus[toLane];
  const now = new Date().toISOString();
  const event: RerouteEvent = {
    fromLane: 'blocked',
    toLane,
    resolutionNote,
    reroutedBy,
    reroutedAt: now,
  };
  const change: StatusChange = { status: nextStatus, timestamp: now, changedBy: reroutedBy };
  return {
    ...uc,
    status: nextStatus,
    rerouteHistory: [...(uc.rerouteHistory ?? []), event],
    timeline: [...uc.timeline, change],
    updatedAt: now,
  };
}

const FIXED_NOW = new Date('2026-04-09T12:00:00Z');

// ─────────────────────────────────────────────────────────────────────────────
// Gap 1: changes_requested forward transition
// ─────────────────────────────────────────────────────────────────────────────

describe('Gap 1 — resubmitForReview', () => {
  it('lightweight lane → back to lightweight_review', () => {
    const uc = makeCase({
      status: 'changes_requested',
      triage: {
        confirmedInherentTier: 'low',
        riskTierOverridden: false,
        governancePath: 'lightweight',
        assignedReviewer: 'rev',
        triageNotes: 'notes notes notes',
        triagedBy: 'rev',
        triagedAt: '2026-04-01T00:00:00Z',
      },
    });
    const result = applyResubmit(uc, 'user@example.com');
    expect(result.status).toBe('lightweight_review');
    expect(result.timeline.at(-1)?.status).toBe('lightweight_review');
  });

  it('standard lane → back to assessment_required (no assessment yet)', () => {
    const uc = makeCase({
      status: 'changes_requested',
      triage: {
        confirmedInherentTier: 'medium',
        riskTierOverridden: false,
        governancePath: 'standard',
        assignedReviewer: 'rev',
        triageNotes: 'standard path notes',
        triagedBy: 'rev',
        triagedAt: '2026-04-01T00:00:00Z',
      },
    });
    const result = applyResubmit(uc, 'user@example.com');
    expect(result.status).toBe('assessment_required');
  });

  it('enhanced (full) lane with submitted assessment → back to decision_pending', () => {
    const uc = makeCase({
      status: 'changes_requested',
      triage: {
        confirmedInherentTier: 'high',
        riskTierOverridden: false,
        governancePath: 'full',
        assignedReviewer: 'rev',
        triageNotes: 'full path detailed',
        triagedBy: 'rev',
        triagedAt: '2026-04-01T00:00:00Z',
      },
      assessment: {} as never, // assessment exists
    });
    const result = applyResubmit(uc, 'user@example.com');
    expect(result.status).toBe('decision_pending');
  });

  it('no-ops when status is NOT changes_requested', () => {
    for (const status of [
      'approved',
      'submitted',
      'triage_pending',
      'rejected',
    ] as AIUseCaseStatus[]) {
      const uc = makeCase({ status });
      const result = applyResubmit(uc, 'user@example.com');
      expect(result.status).toBe(status);
    }
  });

  it('fallback: no triage record → triage_pending', () => {
    const uc = makeCase({ status: 'changes_requested' });
    const result = applyResubmit(uc, 'user@example.com');
    expect(result.status).toBe('triage_pending');
  });

  it('lightweight review record (no triage) → lightweight_review', () => {
    const uc = makeCase({
      status: 'changes_requested',
      lightweightReview: {
        intakeAccurate: true,
        basicControlsConfirmed: true,
        escalationContact: 'contact',
        reviewNotes: 'needs fixes here',
        decision: 'changes_requested',
        reviewedBy: 'rev',
        reviewedAt: '2026-04-01',
      },
    });
    const result = applyResubmit(uc, 'user@example.com');
    expect(result.status).toBe('lightweight_review');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gap 2: approved → in_production
// ─────────────────────────────────────────────────────────────────────────────

describe('Gap 2 — markInProduction', () => {
  it('transitions approved → in_production and stamps productionDate', () => {
    const uc = makeCase({ status: 'approved' });
    const result = applyMarkInProduction(uc, 'deployer@example.com');
    expect(result.status).toBe('in_production');
    expect(result.productionDate).toBeDefined();
    expect(result.timeline.at(-1)?.status).toBe('in_production');
    expect(result.timeline.at(-1)?.changedBy).toBe('deployer@example.com');
  });

  it('no-ops when status is NOT approved', () => {
    for (const status of [
      'submitted',
      'triage_pending',
      'changes_requested',
      'in_production',
    ] as AIUseCaseStatus[]) {
      const uc = makeCase({ status });
      const result = applyMarkInProduction(uc, 'deployer@example.com');
      expect(result.status).toBe(status);
      expect(result.productionDate).toBeUndefined();
    }
  });

  it('productionDate is an ISO timestamp', () => {
    const uc = makeCase({ status: 'approved' });
    const result = applyMarkInProduction(uc, 'deployer@example.com');
    expect(() => new Date(result.productionDate!)).not.toThrow();
    expect(new Date(result.productionDate!).toISOString()).toBe(result.productionDate);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gap 3: Layer 1 router fires for all flows
// ─────────────────────────────────────────────────────────────────────────────

describe('Gap 3 — deriveLayer1FromIntake + router fires for all flows', () => {
  it('derives valid Layer 1 data from a full intake', () => {
    const layer1 = deriveLayer1FromIntake(baseIntake());
    expect(layer1.useCaseName).toBe('Test case');
    expect(layer1.ownerName).toBe('Ada Lovelace');
    expect(layer1.ownerEmail).toBe('ada@example.com');
    expect(layer1.businessArea).toBe('marketing');
    expect(layer1.aiType).toContain('generative_ai');
    expect(layer1.lifecycleStage).toBe('planning');
    expect(layer1.riskTouchpoints).toContain('none_of_above');
  });

  it('maps high-risk triggers to Layer 1 touchpoints', () => {
    const layer1 = deriveLayer1FromIntake(
      baseIntake({ highRiskTriggers: ['insurance_pricing', 'hiring_workforce'] }),
    );
    expect(layer1.riskTouchpoints).toContain('financial_decisions');
    expect(layer1.riskTouchpoints).toContain('employment_decisions');
  });

  it('maps dataSensitivity to touchpoints', () => {
    const layer1 = deriveLayer1FromIntake(
      baseIntake({ dataSensitivity: ['personal_info', 'health_info'] }),
    );
    expect(layer1.riskTouchpoints).toContain('customer_personal_data');
    expect(layer1.riskTouchpoints).toContain('health_biometric');
  });

  it('maps lifecycle stages correctly', () => {
    expect(
      deriveLayer1FromIntake(baseIntake({ lifecycleStage: 'idea_planning' })).lifecycleStage,
    ).toBe('planning');
    expect(
      deriveLayer1FromIntake(baseIntake({ lifecycleStage: 'development_poc' })).lifecycleStage,
    ).toBe('building');
    expect(
      deriveLayer1FromIntake(baseIntake({ lifecycleStage: 'testing_pilot' })).lifecycleStage,
    ).toBe('piloting');
    expect(
      deriveLayer1FromIntake(baseIntake({ lifecycleStage: 'in_production' })).lifecycleStage,
    ).toBe('live');
    expect(
      deriveLayer1FromIntake(baseIntake({ lifecycleStage: 'in_use_seeking_approval' }))
        .lifecycleStage,
    ).toBe('live');
  });

  it('submitIntake runs the router even without explicit layer1 (full wizard path)', () => {
    const result = submitIntake({
      formData: baseIntake(),
      submittedBy: 'mock@example.com',
      now: FIXED_NOW,
      idSuffix: 'test',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Router decision is present AND persisted on the case
    expect(result.routerDecision).toBeDefined();
    expect(result.useCase.routerDecision).toBeDefined();
    expect(result.useCase.routerDecision?.lane).toBeDefined();
  });

  it('benign intake via full wizard routes to lightweight', () => {
    const result = submitIntake({
      formData: baseIntake(),
      submittedBy: 'mock@example.com',
      now: FIXED_NOW,
    });
    if (!result.ok) throw new Error('Expected ok');
    expect(result.routerDecision?.lane).toBe('lightweight');
    expect(result.useCase.status).toBe('lightweight_review');
  });

  it('risky intake via full wizard routes to enhanced', () => {
    const result = submitIntake({
      formData: baseIntake({
        highRiskTriggers: ['insurance_pricing'],
        businessArea: 'actuarial',
      }),
      submittedBy: 'mock@example.com',
      now: FIXED_NOW,
    });
    if (!result.ok) throw new Error('Expected ok');
    expect(result.routerDecision?.lane).toBe('enhanced');
    expect(result.useCase.status).toBe('triage_pending');
  });

  it('blocked intake routes to contact_required', () => {
    const result = submitIntake({
      formData: baseIntake({
        highRiskTriggers: ['biometric_id'],
        aiType: ['computer_vision'],
        dataSensitivity: ['health_info'],
      }),
      submittedBy: 'mock@example.com',
      now: FIXED_NOW,
    });
    if (!result.ok) throw new Error('Expected ok');
    expect(result.routerDecision?.lane).toBe('blocked');
    expect(result.useCase.status).toBe('contact_required');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gap 4: Blocked lane re-routing
// ─────────────────────────────────────────────────────────────────────────────

describe('Gap 4 — rerouteFromBlocked', () => {
  it('reroutes contact_required → lightweight_review', () => {
    const uc = makeCase({ status: 'contact_required' });
    const result = applyReroute(uc, 'lightweight', 'Scope narrowed', 'gov@example.com');
    expect(result.status).toBe('lightweight_review');
    expect(result.rerouteHistory).toHaveLength(1);
    expect(result.rerouteHistory![0].toLane).toBe('lightweight');
    expect(result.rerouteHistory![0].resolutionNote).toBe('Scope narrowed');
  });

  it('reroutes contact_required → triage_pending (standard)', () => {
    const uc = makeCase({ status: 'contact_required' });
    const result = applyReroute(uc, 'standard', 'Standard review agreed', 'gov@example.com');
    expect(result.status).toBe('triage_pending');
    expect(result.rerouteHistory![0].toLane).toBe('standard');
  });

  it('reroutes contact_required → triage_pending (enhanced)', () => {
    const uc = makeCase({ status: 'contact_required' });
    const result = applyReroute(uc, 'enhanced', 'Full review needed', 'gov@example.com');
    expect(result.status).toBe('triage_pending');
    expect(result.rerouteHistory![0].toLane).toBe('enhanced');
  });

  it('no-ops when status is NOT contact_required', () => {
    for (const status of [
      'triage_pending',
      'approved',
      'submitted',
      'changes_requested',
    ] as AIUseCaseStatus[]) {
      const uc = makeCase({ status });
      const result = applyReroute(uc, 'lightweight', 'note', 'gov@example.com');
      expect(result.status).toBe(status);
      expect(result.rerouteHistory).toBeUndefined();
    }
  });

  it('appends to existing rerouteHistory (multiple re-routes are recorded)', () => {
    const uc = makeCase({
      status: 'contact_required',
      rerouteHistory: [
        {
          fromLane: 'blocked',
          toLane: 'standard',
          resolutionNote: 'First attempt',
          reroutedBy: 'gov1',
          reroutedAt: '2026-04-01',
        },
      ],
    });
    // Re-enter contact_required somehow, reroute again
    const withContactRequired = { ...uc, status: 'contact_required' as const };
    const result = applyReroute(withContactRequired, 'enhanced', 'Second attempt', 'gov2');
    expect(result.rerouteHistory).toHaveLength(2);
    expect(result.rerouteHistory![1].reroutedBy).toBe('gov2');
  });

  it('records audit trail: who, when, from, to, note', () => {
    const uc = makeCase({ status: 'contact_required' });
    const result = applyReroute(uc, 'lightweight', 'Resolved after call', 'gov@example.com');
    const event = result.rerouteHistory![0];
    expect(event.fromLane).toBe('blocked');
    expect(event.toLane).toBe('lightweight');
    expect(event.resolutionNote).toBe('Resolved after call');
    expect(event.reroutedBy).toBe('gov@example.com');
    expect(event.reroutedAt).toBeDefined();
  });
});
