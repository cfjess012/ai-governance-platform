import { describe, expect, it } from 'vitest';
import { computeOverrideStats, overrideRateFlag } from '@/lib/triage/override-analytics';
import type { AIUseCase, TriageDecision } from '@/types/inventory';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeCase(overrides: {
  id: string;
  inherentTier?: AIUseCase['inherentRisk'] extends infer R
    ? R extends { tier: infer T }
      ? T
      : never
    : never;
  triage?: Partial<TriageDecision>;
}): AIUseCase {
  const base: AIUseCase = {
    id: overrides.id,
    intake: {} as never,
    classification: {
      euAiActTier: 'pending',
      riskTier: 'pending',
      overrideTriggered: false,
      explanation: [],
    },
    status: 'triage_pending',
    timeline: [],
    comments: [],
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    submittedBy: 'test@example.com',
  };
  if (overrides.inherentTier) {
    base.inherentRisk = {
      tier: overrides.inherentTier,
    } as never;
  }
  if (overrides.triage) {
    base.triage = {
      confirmedInherentTier: 'medium',
      riskTierOverridden: false,
      governancePath: 'standard',
      assignedReviewer: 'reviewer@example.com',
      triageNotes: 'notes',
      triagedBy: 'reviewer@example.com',
      triagedAt: '2026-04-01T00:00:00Z',
      ...overrides.triage,
    };
  }
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// computeOverrideStats
// ─────────────────────────────────────────────────────────────────────────────

describe('computeOverrideStats', () => {
  it('returns zeroes when no cases have been triaged', () => {
    const stats = computeOverrideStats([]);
    expect(stats.totalTriaged).toBe(0);
    expect(stats.overridden).toBe(0);
    expect(stats.overrideRate).toBe(0);
    expect(stats.transitions).toEqual([]);
    expect(stats.topTransitions).toEqual([]);
  });

  it('counts triaged cases but not pre-triage cases', () => {
    const cases = [
      makeCase({ id: '1', inherentTier: 'low' }),
      makeCase({
        id: '2',
        inherentTier: 'medium',
        triage: { confirmedInherentTier: 'medium', riskTierOverridden: false },
      }),
    ];
    const stats = computeOverrideStats(cases);
    expect(stats.totalTriaged).toBe(1);
    expect(stats.overridden).toBe(0);
  });

  it('counts overridden cases and computes the rate', () => {
    const cases = [
      makeCase({
        id: '1',
        inherentTier: 'medium',
        triage: { confirmedInherentTier: 'medium_high', riskTierOverridden: true },
      }),
      makeCase({
        id: '2',
        inherentTier: 'medium',
        triage: { confirmedInherentTier: 'medium', riskTierOverridden: false },
      }),
      makeCase({
        id: '3',
        inherentTier: 'low',
        triage: { confirmedInherentTier: 'medium_low', riskTierOverridden: true },
      }),
      makeCase({
        id: '4',
        inherentTier: 'high',
        triage: { confirmedInherentTier: 'high', riskTierOverridden: false },
      }),
    ];
    const stats = computeOverrideStats(cases);
    expect(stats.totalTriaged).toBe(4);
    expect(stats.overridden).toBe(2);
    expect(stats.overrideRate).toBe(0.5);
  });

  it('aggregates transitions by from→to and records case IDs', () => {
    const cases = [
      makeCase({
        id: '1',
        inherentTier: 'medium',
        triage: { confirmedInherentTier: 'medium_high', riskTierOverridden: true },
      }),
      makeCase({
        id: '2',
        inherentTier: 'medium',
        triage: { confirmedInherentTier: 'medium_high', riskTierOverridden: true },
      }),
      makeCase({
        id: '3',
        inherentTier: 'low',
        triage: { confirmedInherentTier: 'medium_low', riskTierOverridden: true },
      }),
    ];
    const stats = computeOverrideStats(cases);
    const mediumToMediumHigh = stats.transitions.find(
      (t) => t.fromTier === 'medium' && t.toTier === 'medium_high',
    );
    expect(mediumToMediumHigh?.count).toBe(2);
    expect(mediumToMediumHigh?.caseIds).toEqual(['1', '2']);
    const lowToMediumLow = stats.transitions.find(
      (t) => t.fromTier === 'low' && t.toTier === 'medium_low',
    );
    expect(lowToMediumLow?.count).toBe(1);
  });

  it('sorts transitions by count descending and limits topTransitions to 3', () => {
    const cases: AIUseCase[] = [];
    for (let i = 0; i < 5; i++) {
      cases.push(
        makeCase({
          id: `a${i}`,
          inherentTier: 'medium',
          triage: { confirmedInherentTier: 'medium_high', riskTierOverridden: true },
        }),
      );
    }
    for (let i = 0; i < 3; i++) {
      cases.push(
        makeCase({
          id: `b${i}`,
          inherentTier: 'low',
          triage: { confirmedInherentTier: 'medium', riskTierOverridden: true },
        }),
      );
    }
    for (let i = 0; i < 2; i++) {
      cases.push(
        makeCase({
          id: `c${i}`,
          inherentTier: 'medium_high',
          triage: { confirmedInherentTier: 'high', riskTierOverridden: true },
        }),
      );
    }
    cases.push(
      makeCase({
        id: 'd',
        inherentTier: 'medium',
        triage: { confirmedInherentTier: 'high', riskTierOverridden: true },
      }),
    );
    const stats = computeOverrideStats(cases);
    expect(stats.topTransitions).toHaveLength(3);
    expect(stats.topTransitions[0].count).toBe(5);
    expect(stats.topTransitions[1].count).toBe(3);
    expect(stats.topTransitions[2].count).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// overrideRateFlag
// ─────────────────────────────────────────────────────────────────────────────

describe('overrideRateFlag', () => {
  it('returns ok when there are fewer than 10 triaged cases regardless of rate', () => {
    const cases = [
      makeCase({
        id: '1',
        inherentTier: 'medium',
        triage: { confirmedInherentTier: 'high', riskTierOverridden: true },
      }),
      makeCase({
        id: '2',
        inherentTier: 'low',
        triage: { confirmedInherentTier: 'medium', riskTierOverridden: true },
      }),
    ];
    expect(overrideRateFlag(computeOverrideStats(cases))).toBe('ok');
  });

  it('returns needs_review when override rate is >= 25% over at least 10 cases', () => {
    const cases: AIUseCase[] = [];
    // 3 overridden out of 10 = 30%
    for (let i = 0; i < 3; i++) {
      cases.push(
        makeCase({
          id: `o${i}`,
          inherentTier: 'medium',
          triage: { confirmedInherentTier: 'high', riskTierOverridden: true },
        }),
      );
    }
    for (let i = 0; i < 7; i++) {
      cases.push(
        makeCase({
          id: `n${i}`,
          inherentTier: 'medium',
          triage: { confirmedInherentTier: 'medium', riskTierOverridden: false },
        }),
      );
    }
    expect(overrideRateFlag(computeOverrideStats(cases))).toBe('needs_review');
  });

  it('returns monitor when override rate is between 10% and 25%', () => {
    const cases: AIUseCase[] = [];
    // 2 overridden out of 10 = 20% → monitor (>=10% but <25%)
    for (let i = 0; i < 2; i++) {
      cases.push(
        makeCase({
          id: `o${i}`,
          inherentTier: 'medium',
          triage: { confirmedInherentTier: 'high', riskTierOverridden: true },
        }),
      );
    }
    for (let i = 0; i < 8; i++) {
      cases.push(
        makeCase({
          id: `n${i}`,
          inherentTier: 'medium',
          triage: { confirmedInherentTier: 'medium', riskTierOverridden: false },
        }),
      );
    }
    expect(overrideRateFlag(computeOverrideStats(cases))).toBe('monitor');
  });

  it('returns ok when override rate is < 10% over at least 10 cases', () => {
    const cases: AIUseCase[] = [];
    for (let i = 0; i < 20; i++) {
      cases.push(
        makeCase({
          id: `n${i}`,
          inherentTier: 'medium',
          triage: { confirmedInherentTier: 'medium', riskTierOverridden: false },
        }),
      );
    }
    expect(overrideRateFlag(computeOverrideStats(cases))).toBe('ok');
  });
});
