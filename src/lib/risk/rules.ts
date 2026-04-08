/**
 * Hard rules for inherent risk classification.
 *
 * Hard rules are regulatory or policy floors. They force a minimum tier
 * regardless of the dimensional base score. Each rule is named, has a
 * citation, and produces a documented audit trail entry.
 *
 * Rules are deliberate, not statistical. They encode "the law says so"
 * facts that don't depend on weights or scoring math.
 */

import type { FiredRule, InherentRiskInput, InherentRiskTier } from './types';

/** A rule is a function that returns a FiredRule if its condition matches, else null */
type Rule = (input: InherentRiskInput) => FiredRule | null;

// ───────────────────────────────────────────────────────────────────
// EU AI Act rules
// ───────────────────────────────────────────────────────────────────

/**
 * EU AI Act Article 5: Prohibited practices.
 * Biometric identification, emotion detection in workplace, social scoring,
 * and certain manipulative techniques are categorically prohibited in the EU.
 */
const ruleEuProhibitedPractice: Rule = (input) => {
  const triggers = input.highRiskTriggers ?? [];
  const regions = input.deploymentRegions ?? [];
  const inEu = regions.includes('eu_eea');
  const prohibitedTriggers = triggers.filter((t) =>
    ['biometric_id', 'emotion_detection'].includes(t),
  );

  if (!inEu || prohibitedTriggers.length === 0) return null;

  return {
    id: 'eu_prohibited_practice',
    name: 'EU AI Act prohibited practice',
    reason: `Triggers ${prohibitedTriggers.join(', ')} are categorically prohibited or heavily restricted in the EU under EU AI Act Article 5.`,
    forcedMinimumTier: 'high',
    citation: {
      framework: 'EU AI Act',
      reference: 'Article 5 (Prohibited Practices)',
    },
    severity: 'critical',
  };
};

/**
 * EU AI Act Article 6 + Annex III: High-risk AI systems.
 * AI systems used in employment, essential services, law enforcement,
 * education, immigration, biometrics, or critical infrastructure that
 * make or influence decisions about people are High-Risk under EU AI Act.
 */
const ruleEuAnnexIii: Rule = (input) => {
  const triggers = input.highRiskTriggers ?? [];
  const regions = input.deploymentRegions ?? [];
  const inEu = regions.includes('eu_eea');

  if (!inEu) return null;

  const annexIiiTriggers = triggers.filter((t) =>
    [
      'insurance_pricing',
      'investment_advice',
      'credit_lending',
      'hiring_workforce',
      'biometric_id',
    ].includes(t),
  );

  if (annexIiiTriggers.length === 0) return null;

  return {
    id: 'eu_annex_iii_high_risk',
    name: 'EU AI Act Annex III high-risk system',
    reason: `EU deployment combined with Annex III activity (${annexIiiTriggers.join(', ')}) — qualifies as a High-Risk AI System under EU AI Act Article 6.`,
    forcedMinimumTier: 'high',
    citation: {
      framework: 'EU AI Act',
      reference: 'Article 6 + Annex III',
    },
    severity: 'critical',
  };
};

// ───────────────────────────────────────────────────────────────────
// US state rules
// ───────────────────────────────────────────────────────────────────

/**
 * NYC Local Law 144: Automated Employment Decision Tools (AEDTs).
 * Any AI used for hiring or promotion decisions in NYC must have an
 * annual independent bias audit AND notify candidates.
 */
const ruleNycLl144: Rule = (input) => {
  const triggers = input.highRiskTriggers ?? [];
  const businessArea = input.businessArea;

  // We don't currently capture state-level deployment, so we use HR business
  // area or hiring trigger as a proxy. Real implementation would ask "does
  // this affect anyone in NYC."
  const isHiring = triggers.includes('hiring_workforce') || businessArea === 'hr';
  const isUsDeployment = (input.deploymentRegions ?? []).includes('us_only');

  if (!isHiring || !isUsDeployment) return null;

  return {
    id: 'nyc_ll144_aedt',
    name: 'NYC Local Law 144 (Automated Employment Decision Tool)',
    reason:
      'AI used in hiring/employment decisions in the US likely qualifies as an AEDT under NYC Local Law 144 — requires annual independent bias audit and candidate notification.',
    forcedMinimumTier: 'high',
    citation: {
      framework: 'NYC Local Law 144',
      reference: 'NYC Admin Code §20-870',
    },
    severity: 'high',
  };
};

/**
 * Colorado AI Act (SB 24-205): Consequential decisions.
 * Effective February 2026. Requires impact assessments for AI making
 * "consequential decisions" in employment, education, financial,
 * housing, insurance, healthcare, legal services, government services.
 */
const ruleColoradoConsequentialDecision: Rule = (input) => {
  const triggers = input.highRiskTriggers ?? [];
  const businessArea = input.businessArea;
  const oversight = input.humanOversight;
  const whoAffected = input.whoAffected;

  // "Consequential decision" domains per CO SB24-205
  const isConsequentialDomain =
    triggers.some((t) =>
      ['insurance_pricing', 'investment_advice', 'credit_lending', 'hiring_workforce'].includes(t),
    ) ||
    ['actuarial', 'claims', 'investments', 'underwriting', 'finance', 'hr'].includes(
      businessArea ?? '',
    );

  // Must be making decisions (not just informational) AND affecting external people
  const isAutomatedOrAdvisory =
    oversight === 'spot_check' || oversight === 'fully_autonomous' || oversight === 'human_reviews';
  const affectsPeople =
    whoAffected === 'external' || whoAffected === 'both' || whoAffected === 'general_public';

  if (!isConsequentialDomain || !isAutomatedOrAdvisory || !affectsPeople) return null;

  return {
    id: 'colorado_consequential_decision',
    name: 'Colorado AI Act consequential decision',
    reason:
      'System influences a "consequential decision" (employment, financial, insurance, etc.) about external individuals. Colorado SB24-205 (effective Feb 2026) requires algorithmic impact assessment and notice to consumers.',
    forcedMinimumTier: 'medium_high',
    citation: {
      framework: 'Colorado AI Act',
      reference: 'SB 24-205 §6-1-1701',
    },
    severity: 'high',
  };
};

// ───────────────────────────────────────────────────────────────────
// Sector-specific rules
// ───────────────────────────────────────────────────────────────────

/**
 * NAIC Model Bulletin on AI in Insurance.
 * Insurers using AI for underwriting, pricing, claims, fraud, or marketing
 * must comply with the NAIC bulletin in the 13+ states that have adopted it.
 */
const ruleNaicInsurance: Rule = (input) => {
  const triggers = input.highRiskTriggers ?? [];
  const businessArea = input.businessArea;
  const isInsurancePricing = triggers.includes('insurance_pricing');
  const isInsuranceArea = ['actuarial', 'underwriting', 'claims'].includes(businessArea ?? '');

  if (!isInsurancePricing && !isInsuranceArea) return null;

  return {
    id: 'naic_insurance',
    name: 'NAIC Model Bulletin on AI in Insurance',
    reason:
      'Insurance pricing, underwriting, or claims decisions are subject to NAIC Model Bulletin on AI in Insurance — requires governance framework, vendor due diligence, and protection against unfair discrimination.',
    forcedMinimumTier: 'medium_high',
    citation: {
      framework: 'NAIC Model Bulletin',
      reference: 'Use of Artificial Intelligence Systems by Insurers (2023)',
    },
    severity: 'high',
  };
};

/**
 * Federal Reserve SR 11-7 Model Risk Management.
 * Financial institutions using AI for material business decisions must
 * follow MRM framework with validation, monitoring, and governance.
 */
const ruleSr11_7: Rule = (input) => {
  const businessArea = input.businessArea;
  const isFinancialMrmArea = [
    'investments',
    'finance',
    'credit_lending',
    'risk_management',
  ].includes(businessArea ?? '');
  const aiTypes = input.aiType ?? [];
  const hasPredictiveOrGenerative =
    aiTypes.includes('predictive_classification') || aiTypes.includes('generative_ai');

  if (!isFinancialMrmArea || !hasPredictiveOrGenerative) return null;

  return {
    id: 'sr_11_7_mrm',
    name: 'Federal Reserve SR 11-7 Model Risk Management',
    reason:
      'Financial institution using predictive or generative AI for material decisions falls under SR 11-7 model risk management framework — requires independent validation, ongoing monitoring, and board-level governance.',
    forcedMinimumTier: 'medium_high',
    citation: {
      framework: 'Federal Reserve',
      reference: 'SR 11-7 Guidance on Model Risk Management',
    },
    severity: 'elevated',
  };
};

// ───────────────────────────────────────────────────────────────────
// Privacy / data rules
// ───────────────────────────────────────────────────────────────────

/**
 * GDPR Article 22: Automated decision-making with legal effects.
 * EU/UK + automated decisions about people + sensitive data = GDPR Article 22.
 */
const ruleGdprArt22: Rule = (input) => {
  const regions = input.deploymentRegions ?? [];
  const dataSensitivity = input.dataSensitivity ?? [];
  const oversight = input.humanOversight;

  const inEuOrUk = regions.includes('eu_eea') || regions.includes('uk');
  const hasPii = dataSensitivity.some((d) =>
    ['personal_info', 'health_info', 'regulated_financial'].includes(d),
  );
  const isAutomated = oversight === 'fully_autonomous' || oversight === 'spot_check';

  if (!inEuOrUk || !hasPii || !isAutomated) return null;

  return {
    id: 'gdpr_art_22',
    name: 'GDPR Article 22 automated decision-making',
    reason:
      'EU/UK deployment + sensitive personal data + automated decision-making triggers GDPR Article 22 — data subjects have the right not to be subject to solely automated decisions and must be offered human intervention.',
    forcedMinimumTier: 'high',
    citation: {
      framework: 'GDPR',
      reference: 'Article 22',
    },
    severity: 'high',
  };
};

/**
 * Health information at scale.
 * Health data + automated decisions about people = HIPAA-relevant + heightened scrutiny.
 */
const ruleHealthDataDecisions: Rule = (input) => {
  const dataSensitivity = input.dataSensitivity ?? [];
  const oversight = input.humanOversight;
  const whoAffected = input.whoAffected;

  const hasHealthData = dataSensitivity.includes('health_info');
  const isAutomated =
    oversight === 'fully_autonomous' || oversight === 'spot_check' || oversight === 'human_reviews';
  const affectsPeople =
    whoAffected === 'external' || whoAffected === 'both' || whoAffected === 'general_public';

  if (!hasHealthData || !isAutomated || !affectsPeople) return null;

  return {
    id: 'health_data_decisions',
    name: 'Health data + automated decisions',
    reason:
      'Processing health information for decisions about external individuals requires HIPAA compliance, heightened bias testing, and clinical-grade validation.',
    forcedMinimumTier: 'medium_high',
    citation: {
      framework: 'HIPAA',
      reference: '45 CFR Part 164',
    },
    severity: 'high',
  };
};

// ───────────────────────────────────────────────────────────────────
// Internal governance rules
// ───────────────────────────────────────────────────────────────────

/**
 * Shadow IT in production.
 * Already-in-use system + never reviewed + external impact = governance debt.
 */
const ruleUnreviewedProductionExternal: Rule = (input) => {
  const lifecycle = input.lifecycleStage;
  const previouslyReviewed = input.previouslyReviewed;
  const whoAffected = input.whoAffected;

  const isInUse = lifecycle === 'in_production' || lifecycle === 'in_use_seeking_approval';
  const notReviewed = previouslyReviewed === 'no' || previouslyReviewed === 'dont_know';
  const affectsExternal =
    whoAffected === 'external' || whoAffected === 'both' || whoAffected === 'general_public';

  if (!isInUse || !notReviewed || !affectsExternal) return null;

  return {
    id: 'unreviewed_production_external',
    name: 'Unreviewed production system with external impact',
    reason:
      'System is already in use affecting external people but has never been reviewed by governance — creates immediate compliance and reputational exposure that must be remediated.',
    forcedMinimumTier: 'medium_high',
    citation: {
      framework: 'Internal Governance Policy',
      reference: 'Shadow IT remediation',
    },
    severity: 'elevated',
  };
};

// ───────────────────────────────────────────────────────────────────
// Rule registry
// ───────────────────────────────────────────────────────────────────

/** All rules in evaluation order */
const ALL_RULES: Rule[] = [
  ruleEuProhibitedPractice,
  ruleEuAnnexIii,
  ruleNycLl144,
  ruleColoradoConsequentialDecision,
  ruleNaicInsurance,
  ruleSr11_7,
  ruleGdprArt22,
  ruleHealthDataDecisions,
  ruleUnreviewedProductionExternal,
];

/**
 * Evaluate every hard rule against the input.
 * Returns the list of fired rules with their forced minimum tiers.
 */
export function evaluateHardRules(input: InherentRiskInput): FiredRule[] {
  return ALL_RULES.map((rule) => rule(input)).filter((r): r is FiredRule => r !== null);
}

/**
 * Determine the minimum tier across all fired rules.
 * Returns null if no rules fired.
 */
export function getRuleEnforcedMinimumTier(rules: FiredRule[]): InherentRiskTier | null {
  if (rules.length === 0) return null;

  const tierOrder: Record<InherentRiskTier, number> = {
    low: 1,
    medium_low: 2,
    medium: 3,
    medium_high: 4,
    high: 5,
  };

  let highest: InherentRiskTier = rules[0].forcedMinimumTier;
  for (const rule of rules) {
    if (tierOrder[rule.forcedMinimumTier] > tierOrder[highest]) {
      highest = rule.forcedMinimumTier;
    }
  }
  return highest;
}
