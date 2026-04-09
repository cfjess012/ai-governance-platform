import { describe, expect, it } from 'vitest';
import {
  computeReviewSchedule,
  daysUntilReview,
  isReviewOverdue,
  REVIEW_FREQUENCY_BY_TIER,
  reviewStatus,
} from '@/lib/governance/review-schedule';

describe('REVIEW_FREQUENCY_BY_TIER', () => {
  it('high-risk cases get monthly cadence', () => {
    expect(REVIEW_FREQUENCY_BY_TIER.high).toBe('monthly');
  });
  it('medium_high cases get quarterly cadence', () => {
    expect(REVIEW_FREQUENCY_BY_TIER.medium_high).toBe('quarterly');
  });
  it('low and medium_low cases get annual cadence', () => {
    expect(REVIEW_FREQUENCY_BY_TIER.low).toBe('annual');
    expect(REVIEW_FREQUENCY_BY_TIER.medium_low).toBe('annual');
  });
});

describe('computeReviewSchedule', () => {
  it('anchors next review to the most recent review date', () => {
    const schedule = computeReviewSchedule('high', '2026-01-01T00:00:00.000Z');
    // monthly = 30 days
    expect(schedule.nextReviewDue).toBe('2026-01-31T00:00:00.000Z');
    expect(schedule.frequency).toBe('monthly');
  });

  it('anchors to "now" when no last review provided', () => {
    const schedule = computeReviewSchedule('low');
    expect(schedule.lastReviewedAt).toBeUndefined();
    // Annual = ~365 days from now — just check it's in the future
    expect(new Date(schedule.nextReviewDue).getTime()).toBeGreaterThan(Date.now());
  });

  it('carries forward the review owner if provided', () => {
    const schedule = computeReviewSchedule('medium', undefined, 'jane@example.com');
    expect(schedule.reviewOwner).toBe('jane@example.com');
  });
});

describe('isReviewOverdue', () => {
  it('returns true when current date is past the next review', () => {
    const past = computeReviewSchedule('high', '2020-01-01T00:00:00.000Z');
    expect(isReviewOverdue(past)).toBe(true);
  });
  it('returns false when next review is in the future', () => {
    const future = computeReviewSchedule('low');
    expect(isReviewOverdue(future)).toBe(false);
  });
});

describe('daysUntilReview', () => {
  it('returns negative when overdue', () => {
    const overdue = computeReviewSchedule('high', '2020-01-01T00:00:00.000Z');
    expect(daysUntilReview(overdue)).toBeLessThan(0);
  });
});

describe('reviewStatus', () => {
  it('classifies overdue reviews', () => {
    const overdue = computeReviewSchedule('high', '2020-01-01T00:00:00.000Z');
    expect(reviewStatus(overdue)).toBe('overdue');
  });
  it('classifies on_track when far in the future', () => {
    const future = computeReviewSchedule('low');
    expect(reviewStatus(future)).toBe('on_track');
  });
});
