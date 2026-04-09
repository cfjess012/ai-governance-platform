import { describe, expect, it } from 'vitest';
import {
  applyDecommission,
  type DecommissionInput,
  shouldDecommissionNow,
  validateDecommission,
} from '@/lib/lifecycle/decommission';
import type { AIUseCase } from '@/types/inventory';

function makeCase(overrides: Partial<AIUseCase> = {}): AIUseCase {
  return {
    id: 'test-case',
    intake: {} as never,
    classification: {
      euAiActTier: 'pending',
      riskTier: 'pending',
      overrideTriggered: false,
      explanation: [],
    },
    status: 'in_production',
    timeline: [
      {
        status: 'in_production',
        timestamp: '2026-01-01T00:00:00Z',
        changedBy: 'reviewer@example.com',
      },
    ],
    comments: [],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    submittedBy: 'owner@example.com',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// validateDecommission
// ─────────────────────────────────────────────────────────────────────────────

describe('validateDecommission', () => {
  const valid: DecommissionInput = {
    reason: 'retired',
    effectiveDate: '2026-06-01',
    authorizedBy: 'cro@example.com',
  };

  it('returns no errors for a valid input', () => {
    expect(validateDecommission(valid)).toEqual([]);
  });

  it('flags missing reason', () => {
    const { reason, ...rest } = valid;
    expect(
      validateDecommission(rest as Partial<DecommissionInput>).some((e) => e.field === 'reason'),
    ).toBe(true);
    void reason;
  });

  it('flags missing effective date', () => {
    expect(
      validateDecommission({ ...valid, effectiveDate: '' }).some(
        (e) => e.field === 'effectiveDate',
      ),
    ).toBe(true);
  });

  it('flags invalid effective date', () => {
    expect(
      validateDecommission({ ...valid, effectiveDate: 'not-a-date' }).some(
        (e) => e.field === 'effectiveDate',
      ),
    ).toBe(true);
  });

  it('flags missing authorizer', () => {
    expect(
      validateDecommission({ ...valid, authorizedBy: '' }).some((e) => e.field === 'authorizedBy'),
    ).toBe(true);
    expect(
      validateDecommission({ ...valid, authorizedBy: '  ' }).some(
        (e) => e.field === 'authorizedBy',
      ),
    ).toBe(true);
  });

  it('requires notes when reason is "other"', () => {
    expect(
      validateDecommission({ ...valid, reason: 'other' }).some((e) => e.field === 'notes'),
    ).toBe(true);
    expect(
      validateDecommission({ ...valid, reason: 'other', notes: 'short' }).some(
        (e) => e.field === 'notes',
      ),
    ).toBe(true);
    expect(
      validateDecommission({ ...valid, reason: 'other', notes: 'Long enough notes here.' }),
    ).toEqual([]);
  });

  it('does not require notes for non-other reasons', () => {
    for (const reason of ['operational', 'regulatory', 'replaced', 'retired'] as const) {
      expect(validateDecommission({ ...valid, reason })).toEqual([]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// shouldDecommissionNow
// ─────────────────────────────────────────────────────────────────────────────

describe('shouldDecommissionNow', () => {
  const now = new Date('2026-04-08T12:00:00Z');

  it('returns true for a past date', () => {
    expect(shouldDecommissionNow('2026-04-01', now)).toBe(true);
  });

  it('returns true for a date equal to now', () => {
    expect(shouldDecommissionNow('2026-04-08', now)).toBe(true);
  });

  it('returns false for a future date', () => {
    expect(shouldDecommissionNow('2026-05-01', now)).toBe(false);
  });

  it('returns false for an invalid date', () => {
    expect(shouldDecommissionNow('nope', now)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyDecommission
// ─────────────────────────────────────────────────────────────────────────────

describe('applyDecommission', () => {
  const now = new Date('2026-04-08T12:00:00Z');

  it('advances status to decommissioned when effective date has passed', () => {
    const before = makeCase();
    const after = applyDecommission(
      before,
      {
        reason: 'retired',
        effectiveDate: '2026-04-01',
        authorizedBy: 'cro@example.com',
      },
      now,
    );
    expect(after.status).toBe('decommissioned');
  });

  it('leaves status untouched when effective date is in the future (scheduled)', () => {
    const before = makeCase();
    const after = applyDecommission(
      before,
      {
        reason: 'retired',
        effectiveDate: '2026-12-01',
        authorizedBy: 'cro@example.com',
      },
      now,
    );
    expect(after.status).toBe('in_production');
  });

  it('appends a timeline entry either way', () => {
    const before = makeCase();
    const after = applyDecommission(
      before,
      {
        reason: 'retired',
        effectiveDate: '2026-12-01',
        authorizedBy: 'cro@example.com',
      },
      now,
    );
    expect(after.timeline.length).toBe(before.timeline.length + 1);
    expect(after.timeline.at(-1)?.changedBy).toBe('cro@example.com');
  });

  it('records a decommission note on classification.explanation', () => {
    const before = makeCase();
    const after = applyDecommission(
      before,
      {
        reason: 'regulatory',
        effectiveDate: '2026-04-01',
        authorizedBy: 'cro@example.com',
        notes: 'EU AI Act audit failure',
      },
      now,
    );
    const note = after.classification.explanation.at(-1);
    expect(note).toContain('regulatory');
    expect(note).toContain('cro@example.com');
    expect(note).toContain('EU AI Act audit failure');
    expect(note).toContain('applied');
  });

  it('notes say "scheduled" for future-dated decommissions', () => {
    const before = makeCase();
    const after = applyDecommission(
      before,
      {
        reason: 'retired',
        effectiveDate: '2026-12-01',
        authorizedBy: 'cro@example.com',
      },
      now,
    );
    const note = after.classification.explanation.at(-1);
    expect(note).toContain('scheduled');
  });

  it('updates updatedAt to the provided now', () => {
    const before = makeCase();
    const after = applyDecommission(
      before,
      {
        reason: 'retired',
        effectiveDate: '2026-04-01',
        authorizedBy: 'cro@example.com',
      },
      now,
    );
    expect(after.updatedAt).toBe(now.toISOString());
  });
});
