/**
 * Inherent risk calculator — entry point.
 *
 * Combines:
 *   1. Dimensional scoring (7 dimensions, 0-4 each, weighted) → base tier
 *   2. Hard rules (regulatory floors with citations) → forced minimum tier
 *   3. Confluence patterns (compounding factor combinations) → tier escalations
 *   4. Applicable framework detection → audit trail
 *
 * The output is the source of truth for the case's inherent risk: tier, audit
 * trail of why, dimension scores for analytics, and applicable regulations.
 */

import { calculateBaseScore, computeAllDimensions } from './dimensions';
import { detectApplicableFrameworks } from './frameworks';
import { evaluatePatterns } from './patterns';
import { evaluateHardRules, getRuleEnforcedMinimumTier } from './rules';
import {
  type DimensionScore,
  escalateTier,
  type FiredPattern,
  type FiredRule,
  type InherentRiskInput,
  type InherentRiskResult,
  type InherentRiskTier,
  maxTier,
  type RiskContributor,
  TIER_DISPLAY,
} from './types';

/**
 * Map a base score (0-100) to a tier using calibrated thresholds.
 *
 * Thresholds chosen to produce a roughly balanced portfolio distribution:
 * Low: 0-20, Medium-Low: 21-35, Medium: 36-55, Medium-High: 56-75, High: 76-100
 */
function baseScoreToTier(score: number): InherentRiskTier {
  if (score <= 20) return 'low';
  if (score <= 35) return 'medium_low';
  if (score <= 55) return 'medium';
  if (score <= 75) return 'medium_high';
  return 'high';
}

/**
 * Apply confluence patterns to a base tier.
 * Each pattern that fires either escalates the tier by one or forces a minimum.
 */
function applyPatterns(baseTier: InherentRiskTier, patterns: FiredPattern[]): InherentRiskTier {
  let tier = baseTier;
  for (const pattern of patterns) {
    if (pattern.effect === 'escalate_one_tier') {
      tier = escalateTier(tier);
    } else if (typeof pattern.effect === 'object' && 'forceMinimum' in pattern.effect) {
      tier = maxTier(tier, pattern.effect.forceMinimum);
    }
  }
  return tier;
}

/**
 * Build the "top contributors" list for the UI summary.
 * Returns 3-5 plain-language reasons why this case got its tier.
 */
function buildTopContributors(
  dimensions: DimensionScore[],
  rules: FiredRule[],
  patterns: FiredPattern[],
): RiskContributor[] {
  const contributors: RiskContributor[] = [];

  // Rules go first — they're regulatory facts
  for (const rule of rules) {
    contributors.push({
      label: rule.name,
      source: 'rule',
      severity:
        rule.severity === 'critical' ? 'high' : rule.severity === 'high' ? 'high' : 'medium',
    });
  }

  // Patterns next — they're confluence escalations
  for (const pattern of patterns) {
    contributors.push({
      label: pattern.name,
      source: 'pattern',
      severity:
        typeof pattern.effect === 'object' && 'forceMinimum' in pattern.effect ? 'high' : 'medium',
    });
  }

  // Then top-scoring dimensions (3+) sorted by score descending
  const significantDimensions = dimensions
    .filter((d) => d.score >= 3)
    .sort((a, b) => b.score - a.score);
  for (const dim of significantDimensions) {
    contributors.push({
      label: `${dim.label}: ${dim.rationale}`,
      source: 'dimension',
      severity: dim.score >= 4 ? 'high' : 'medium',
    });
  }

  // Cap at 6 to keep the summary scannable
  return contributors.slice(0, 6);
}

/**
 * Calculate the inherent risk for a use case.
 *
 * This is the main entry point. Pass in the intake answers, get back
 * a complete InherentRiskResult ready to display and store.
 */
export function calculateInherentRisk(input: InherentRiskInput): InherentRiskResult {
  // 1. Score every dimension
  const dimensions = computeAllDimensions(input);
  const baseScore = calculateBaseScore(dimensions);
  const baseTier = baseScoreToTier(baseScore);

  // 2. Evaluate hard rules
  const firedRules = evaluateHardRules(input);
  const ruleMinimum = getRuleEnforcedMinimumTier(firedRules);

  // 3. Evaluate confluence patterns
  const firedPatterns = evaluatePatterns(input);

  // 4. Determine final tier:
  //    - Start with base tier from dimensions
  //    - Apply patterns (escalations / forced minimums)
  //    - Enforce rule minimum (regulatory floors)
  let finalTier = applyPatterns(baseTier, firedPatterns);
  if (ruleMinimum) {
    finalTier = maxTier(finalTier, ruleMinimum);
  }

  // 5. Detect applicable frameworks
  const applicableFrameworks = detectApplicableFrameworks(input);

  // 6. Build top contributors
  const topContributors = buildTopContributors(dimensions, firedRules, firedPatterns);

  return {
    tier: finalTier,
    tierDisplay: TIER_DISPLAY[finalTier],
    dimensions,
    baseScore,
    baseTier,
    pureBaseScore: firedRules.length === 0 && firedPatterns.length === 0,
    firedRules,
    firedPatterns,
    applicableFrameworks,
    topContributors,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Lightweight check: does the input have enough data to compute a meaningful tier?
 * Used to decide whether to show the live classification or "still gathering data".
 */
export function hasEnoughDataForRisk(input: InherentRiskInput): boolean {
  // Need at least: AI type, business area, deployment regions, who affected, worst outcome
  return Boolean(
    input.aiType?.length &&
      input.businessArea &&
      input.deploymentRegions?.length &&
      input.whoAffected &&
      input.worstOutcome,
  );
}
