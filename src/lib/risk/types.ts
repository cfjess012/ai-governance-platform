/**
 * Inherent risk scoring types.
 *
 * Inherent risk = the risk of an AI use case BEFORE controls are applied.
 * Calculated entirely from intake answers (no assessment data needed).
 *
 * This is distinct from:
 * - The EU AI Act regulatory tier (regulatory tagging, not internal risk)
 * - The 7-dimension assessment scoring (residual risk, post-controls)
 */

import type { IntakeFormData } from '@/lib/questions/intake-schema';

/** 5-tier inherent risk scale */
export type InherentRiskTier = 'low' | 'medium_low' | 'medium' | 'medium_high' | 'high';

/** Display metadata for each tier */
export interface TierDisplay {
  tier: InherentRiskTier;
  label: string;
  shortLabel: string;
  description: string;
  /** Tailwind classes for badges */
  badgeClasses: string;
  /** Hex for charts/dots */
  color: string;
  /** Numeric ordering for sorting and comparisons */
  ordinal: number;
}

export const TIER_DISPLAY: Record<InherentRiskTier, TierDisplay> = {
  low: {
    tier: 'low',
    label: 'Low',
    shortLabel: 'Low',
    description:
      'Minimal risk: internal-only, public data, no decisional impact, no regulated domain.',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#10b981',
    ordinal: 1,
  },
  medium_low: {
    tier: 'medium_low',
    label: 'Medium-Low',
    shortLabel: 'Med-Low',
    description:
      'Limited risk: internal use with moderate data sensitivity, or external use with no decisional impact.',
    badgeClasses: 'bg-lime-50 text-lime-700 border-lime-200',
    color: '#84cc16',
    ordinal: 2,
  },
  medium: {
    tier: 'medium',
    label: 'Medium',
    shortLabel: 'Med',
    description:
      'Standard risk: multiple risk factors but no severe drivers. Standard governance review.',
    badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#f59e0b',
    ordinal: 3,
  },
  medium_high: {
    tier: 'medium_high',
    label: 'Medium-High',
    shortLabel: 'Med-High',
    description:
      'Elevated risk: at least one significant driver. Requires standard assessment plus governance committee review.',
    badgeClasses: 'bg-orange-50 text-orange-700 border-orange-200',
    color: '#f97316',
    ordinal: 4,
  },
  high: {
    tier: 'high',
    label: 'High',
    shortLabel: 'High',
    description:
      'Severe risk: triggers a regulatory hard rule or multiple severe drivers. Requires full assessment, committee approval, and monitoring plan.',
    badgeClasses: 'bg-red-50 text-red-700 border-red-200',
    color: '#ef4444',
    ordinal: 5,
  },
};

/** Compare two tiers — returns the more severe one */
export function maxTier(a: InherentRiskTier, b: InherentRiskTier): InherentRiskTier {
  return TIER_DISPLAY[a].ordinal >= TIER_DISPLAY[b].ordinal ? a : b;
}

/** Bump a tier up one level (capped at 'high') */
export function escalateTier(tier: InherentRiskTier): InherentRiskTier {
  switch (tier) {
    case 'low':
      return 'medium_low';
    case 'medium_low':
      return 'medium';
    case 'medium':
      return 'medium_high';
    case 'medium_high':
      return 'high';
    case 'high':
      return 'high';
  }
}

/** A single intake field + value that contributed to a dimension score */
export interface ScoreContributor {
  /** Intake field name (e.g., 'humanOversight', 'whoAffected') */
  field: string;
  /** Display label for the field */
  label: string;
  /** The value that was present at score time */
  value: string;
  /** How it contributed (e.g., "+1 scale bump") */
  contribution: string;
}

/** A risk dimension scored 0-4 */
export interface DimensionScore {
  /** Stable identifier */
  id: DimensionId;
  /** Display name */
  label: string;
  /** 0-4 score (0 = no risk, 4 = severe) */
  score: number;
  /** Weight as a fraction (sums to 1.0 across all dimensions) */
  weight: number;
  /** Human-readable explanation of why this score */
  rationale: string;
  /** P13: intake fields that drove this score (for expandable breakdown in UI) */
  contributors?: ScoreContributor[];
}

export type DimensionId =
  | 'decision_domain'
  | 'decision_authority'
  | 'affected_population'
  | 'data_sensitivity'
  | 'ai_capability'
  | 'regulatory_exposure'
  | 'reversibility';

/** A hard rule that fired (forced minimum tier or escalation) */
export interface FiredRule {
  /** Stable identifier */
  id: string;
  /** Display name */
  name: string;
  /** Why it fired in plain language */
  reason: string;
  /** Tier this rule forces (the case becomes at least this tier) */
  forcedMinimumTier: InherentRiskTier;
  /** Regulatory citation */
  citation: RegulatoryCitation;
  /** Severity for visual treatment */
  severity: 'critical' | 'high' | 'elevated';
}

/** A confluence pattern that fired (combinatorial escalation) */
export interface FiredPattern {
  /** Stable identifier */
  id: string;
  /** Display name */
  name: string;
  /** What conditions matched */
  description: string;
  /** Whether this pattern escalates by one tier or forces a minimum */
  effect: 'escalate_one_tier' | { forceMinimum: InherentRiskTier };
}

/** A regulatory framework that applies to this use case */
export interface ApplicableFramework {
  /** Framework name (e.g., "EU AI Act") */
  framework: string;
  /** Specific section/article (e.g., "Annex III §4(b)") */
  reference: string;
  /** Why this framework applies to this case */
  applicabilityReason: string;
  /** Type of obligation: registration, audit, transparency, etc. */
  obligationType:
    | 'registration'
    | 'impact_assessment'
    | 'bias_audit'
    | 'transparency'
    | 'monitoring'
    | 'human_oversight'
    | 'documentation';
}

/** Citation used by hard rules */
export interface RegulatoryCitation {
  framework: string;
  reference: string;
  url?: string;
}

/** A factor contributing to the score (used in "top contributors" UI) */
export interface RiskContributor {
  /** Plain-language description */
  label: string;
  /** Where this came from */
  source: 'dimension' | 'rule' | 'pattern';
  /** Severity for visual ordering */
  severity: 'high' | 'medium' | 'low';
}

/** The complete inherent risk result */
export interface InherentRiskResult {
  /** The final 5-tier rating */
  tier: InherentRiskTier;
  /** Display metadata for the tier */
  tierDisplay: TierDisplay;
  /** All dimension scores (for analytics and detailed display) */
  dimensions: DimensionScore[];
  /** Weighted dimensional base score (0-100) before rules/patterns — used for analytics, NOT for tier */
  baseScore: number;
  /** Hard rules that fired */
  firedRules: FiredRule[];
  /** Confluence patterns that fired */
  firedPatterns: FiredPattern[];
  /** Regulatory frameworks that apply with reasons */
  applicableFrameworks: ApplicableFramework[];
  /** Top 3-5 contributors to the tier (for UI summary) */
  topContributors: RiskContributor[];
  /** Tier the dimensional base score alone would have produced (for transparency about escalations) */
  baseTier: InherentRiskTier;
  /** Whether this tier was determined entirely by dimensional scoring (no rules/patterns fired) */
  pureBaseScore: boolean;
  /** When this was computed (ISO timestamp) */
  computedAt: string;
}

/** Input to the inherent risk calculator (subset of intake form data) */
export type InherentRiskInput = Partial<
  Pick<
    IntakeFormData,
    | 'businessProblem'
    | 'howAiHelps'
    | 'businessArea'
    | 'aiType'
    | 'buildOrAcquire'
    | 'thirdPartyInvolved'
    | 'auditability'
    | 'usesFoundationModel'
    | 'whichModels'
    | 'deploymentRegions'
    | 'lifecycleStage'
    | 'previouslyReviewed'
    | 'highRiskTriggers'
    | 'whoUsesSystem'
    | 'whoAffected'
    | 'worstOutcome'
    | 'dataSensitivity'
    | 'humanOversight'
    | 'differentialTreatment'
    | 'peopleAffectedCount'
  >
>;
