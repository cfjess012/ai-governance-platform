/**
 * Override analytics — pure functions that summarize how often the
 * governance team overrides the auto-computed inherent risk tier.
 *
 * This is the feedback loop that lets a governance program improve its
 * classifier over time. If reviewers consistently override `medium` to
 * `medium_high` on hiring-adjacent cases, that's a signal the inherent
 * risk rules should be tightened. If they never override, the auto
 * classifier is doing its job.
 *
 * These are pure functions over the inventory — no React, no store
 * access. The triage dashboard consumes them for display.
 */

import type { InherentRiskTier } from '@/lib/risk/types';
import type { AIUseCase } from '@/types/inventory';

export interface OverrideStats {
  /** Total number of cases that have been triaged. */
  totalTriaged: number;
  /** Number of triaged cases where the reviewer overrode the auto tier. */
  overridden: number;
  /** Fraction of triaged cases that got overridden (0–1). */
  overrideRate: number;
  /**
   * Breakdown: "auto tier → reviewer tier" counts. Only populated for
   * cases that were actually overridden.
   */
  transitions: OverrideTransition[];
  /** Top 3 most frequent auto→reviewer transitions, sorted by count. */
  topTransitions: OverrideTransition[];
}

export interface OverrideTransition {
  fromTier: InherentRiskTier;
  toTier: InherentRiskTier;
  count: number;
  caseIds: string[];
}

/**
 * Compute override statistics over the inventory.
 */
export function computeOverrideStats(useCases: AIUseCase[]): OverrideStats {
  const triaged = useCases.filter((uc) => uc.triage !== undefined);
  const overridden = triaged.filter((uc) => uc.triage?.riskTierOverridden === true);

  // Build the map of transitions
  const transitionMap = new Map<string, OverrideTransition>();
  for (const uc of overridden) {
    const fromTier = uc.inherentRisk?.tier;
    const toTier = uc.triage?.confirmedInherentTier;
    if (!fromTier || !toTier) continue;
    const key = `${fromTier}→${toTier}`;
    const existing = transitionMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.caseIds.push(uc.id);
    } else {
      transitionMap.set(key, {
        fromTier,
        toTier,
        count: 1,
        caseIds: [uc.id],
      });
    }
  }

  const transitions = Array.from(transitionMap.values()).sort((a, b) => b.count - a.count);
  const topTransitions = transitions.slice(0, 3);

  return {
    totalTriaged: triaged.length,
    overridden: overridden.length,
    overrideRate: triaged.length === 0 ? 0 : overridden.length / triaged.length,
    transitions,
    topTransitions,
  };
}

/**
 * Whether the override rate is high enough to warrant classifier review.
 * Heuristic: > 25% of triaged cases being overridden is a signal that
 * the inherent risk scoring needs tuning. Under 10% is normal.
 */
export function overrideRateFlag(stats: OverrideStats): 'ok' | 'monitor' | 'needs_review' {
  if (stats.totalTriaged < 10) return 'ok'; // not enough data
  if (stats.overrideRate >= 0.25) return 'needs_review';
  if (stats.overrideRate >= 0.1) return 'monitor';
  return 'ok';
}
