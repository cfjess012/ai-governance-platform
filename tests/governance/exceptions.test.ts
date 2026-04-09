import { describe, expect, it } from 'vitest';
import {
  createException,
  daysUntilExpiry,
  expireException,
  isExpired,
  revokeException,
  sweepExpiredExceptions,
} from '@/lib/governance/exceptions';

const baseInput = {
  useCaseId: 'uc-1',
  policyOrControl: 'EU AI Act Art. 14 — Human Oversight',
  reason: 'business_critical' as const,
  justification: 'Material business value justifies waiver during pilot phase',
  compensatingControls: 'Manual review of every output by trained operator',
  requestedBy: 'jane@example.com',
  approvedBy: 'cro@example.com',
  approvedByRole: 'Chief Risk Officer',
  expiresAt: '2027-01-01T00:00:00.000Z',
};

describe('createException', () => {
  it('creates an active exception with the supplied fields', () => {
    const exception = createException(baseInput);
    expect(exception.status).toBe('active');
    expect(exception.useCaseId).toBe('uc-1');
    expect(exception.policyOrControl).toBe('EU AI Act Art. 14 — Human Oversight');
    expect(exception.approvedBy).toBe('cro@example.com');
    expect(exception.approvedByRole).toBe('Chief Risk Officer');
    expect(exception.expiresAt).toBe('2027-01-01T00:00:00.000Z');
  });

  it('generates a stable id and timestamps', () => {
    const exception = createException(baseInput);
    expect(exception.id).toMatch(/^exc-/);
    expect(exception.requestedAt).toBeTruthy();
    expect(exception.approvedAt).toBeTruthy();
  });
});

describe('expireException', () => {
  it('returns a new exception with status=expired', () => {
    const original = createException(baseInput);
    const expired = expireException(original);
    expect(expired.status).toBe('expired');
    expect(expired.id).toBe(original.id);
    expect(original.status).toBe('active'); // input not mutated
  });
});

describe('revokeException', () => {
  it('returns a new exception with status=revoked and revocation metadata', () => {
    const original = createException(baseInput);
    const revoked = revokeException(original, 'cro@example.com', 'Remediation complete');
    expect(revoked.status).toBe('revoked');
    expect(revoked.revokedBy).toBe('cro@example.com');
    expect(revoked.revocationReason).toBe('Remediation complete');
    expect(revoked.revokedAt).toBeTruthy();
    expect(original.status).toBe('active'); // input not mutated
  });
});

describe('isExpired', () => {
  it('returns false for active exceptions with future expiry', () => {
    const exception = createException({
      ...baseInput,
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    expect(isExpired(exception)).toBe(false);
  });

  it('returns true for active exceptions past expiry', () => {
    const exception = createException({
      ...baseInput,
      expiresAt: '2020-01-01T00:00:00.000Z',
    });
    expect(isExpired(exception)).toBe(true);
  });

  it('returns false for already-expired exceptions (status check)', () => {
    const exception = expireException(createException(baseInput));
    expect(isExpired(exception)).toBe(false);
  });
});

describe('daysUntilExpiry', () => {
  it('returns negative for past-expiry exceptions', () => {
    const exception = createException({
      ...baseInput,
      expiresAt: '2020-01-01T00:00:00.000Z',
    });
    expect(daysUntilExpiry(exception)).toBeLessThan(0);
  });

  it('returns positive for future expiry', () => {
    const exception = createException({
      ...baseInput,
      expiresAt: '2099-01-01T00:00:00.000Z',
    });
    expect(daysUntilExpiry(exception)).toBeGreaterThan(0);
  });
});

describe('sweepExpiredExceptions', () => {
  it('transitions past-expiry active exceptions to expired', () => {
    const past = createException({ ...baseInput, expiresAt: '2020-01-01T00:00:00.000Z' });
    const future = createException({ ...baseInput, expiresAt: '2099-01-01T00:00:00.000Z' });
    const swept = sweepExpiredExceptions([past, future]);
    expect(swept[0].status).toBe('expired');
    expect(swept[1].status).toBe('active');
  });

  it('leaves non-active exceptions untouched', () => {
    const revoked = revokeException(createException(baseInput), 'cro', 'reason');
    const swept = sweepExpiredExceptions([revoked]);
    expect(swept[0].status).toBe('revoked');
  });
});
