/**
 * Confluence patterns for inherent risk classification.
 *
 * Patterns capture the idea that risk amplifies when specific factors converge.
 * Linear weighted scoring misses these — a "Cross-Border Sensitive Data" pattern
 * is more dangerous than the sum of its parts because of compounding regulatory
 * and operational risk.
 *
 * Each pattern has a name, conditions, and an effect (escalate one tier or
 * force a minimum tier). When a pattern fires, it appears in the audit trail
 * with its description so reviewers know exactly why escalation happened.
 */

import type { FiredPattern, InherentRiskInput } from './types';

type Pattern = (input: InherentRiskInput) => FiredPattern | null;

// ───────────────────────────────────────────────────────────────────
// GenAI exposure patterns
// ───────────────────────────────────────────────────────────────────

/**
 * GenAI Customer Exposure: Generative AI + customer-facing + sensitive data
 * = hallucination risk meets data leakage risk meets external exposure.
 */
const patternGenAiCustomerExposure: Pattern = (input) => {
  const aiTypes = input.aiType ?? [];
  const dataSensitivity = input.dataSensitivity ?? [];
  const whoAffected = input.whoAffected;

  const hasGenAi = aiTypes.includes('generative_ai') || aiTypes.includes('rag');
  const customerFacing =
    whoAffected === 'external' || whoAffected === 'both' || whoAffected === 'general_public';
  const hasSensitiveData = dataSensitivity.some((d) =>
    ['customer_confidential', 'personal_info', 'health_info', 'regulated_financial'].includes(d),
  );

  if (!hasGenAi || !customerFacing || !hasSensitiveData) return null;

  return {
    id: 'genai_customer_exposure',
    name: 'GenAI Customer Exposure',
    description:
      'Generative AI processing customer/sensitive data with external user exposure — hallucination, data leakage, and reputational risk converge.',
    effect: 'escalate_one_tier',
  };
};

/**
 * Cross-Border Sensitive Data: EU/UK + sensitive personal data + foundation model
 * = GDPR + EU AI Act + cross-border data flow risk.
 */
const patternCrossBorderSensitiveData: Pattern = (input) => {
  const regions = input.deploymentRegions ?? [];
  const dataSensitivity = input.dataSensitivity ?? [];
  const usesFoundationModel = input.usesFoundationModel;

  const inEuOrUk = regions.includes('eu_eea') || regions.includes('uk');
  const hasSensitiveData = dataSensitivity.some((d) =>
    ['personal_info', 'health_info', 'regulated_financial'].includes(d),
  );
  const usesFm = usesFoundationModel === 'yes' || usesFoundationModel === 'yes_vendor_managed';

  if (!inEuOrUk || !hasSensitiveData || !usesFm) return null;

  return {
    id: 'cross_border_sensitive_data',
    name: 'Cross-Border Sensitive Data',
    description:
      'EU/UK deployment + sensitive personal data + foundation model — triggers GDPR Chapter V (international transfers), Article 22 (automated decisions), and EU AI Act foundation model obligations.',
    effect: 'escalate_one_tier',
  };
};

// ───────────────────────────────────────────────────────────────────
// Vendor / supply chain patterns
// ───────────────────────────────────────────────────────────────────

/**
 * Black Box Vendor + Consequential Decisions: third party + black box auditability
 * + regulated decision = inability to explain decisions affecting people.
 */
const patternBlackBoxVendorConsequential: Pattern = (input) => {
  const thirdParty = input.thirdPartyInvolved;
  const auditability = input.auditability;
  const triggers = input.highRiskTriggers ?? [];

  const isThirdParty = thirdParty === 'yes';
  const isBlackBox = auditability === 'black_box';
  const hasConsequentialTrigger = triggers.some((t) =>
    [
      'insurance_pricing',
      'investment_advice',
      'credit_lending',
      'hiring_workforce',
      'fraud_detection',
    ].includes(t),
  );

  if (!isThirdParty || !isBlackBox || !hasConsequentialTrigger) return null;

  return {
    id: 'black_box_vendor_consequential',
    name: 'Black Box Vendor + Consequential Decisions',
    description:
      'Third-party vendor with black-box auditability making consequential decisions about people — cannot explain individual decisions to affected parties or regulators.',
    effect: 'escalate_one_tier',
  };
};

/**
 * Vendor-Managed Foundation Model + Customer Exposure:
 * SaaS AI tool with no model control + external customer impact.
 */
const patternVendorManagedExternal: Pattern = (input) => {
  const usesFoundationModel = input.usesFoundationModel;
  const whoAffected = input.whoAffected;
  const dataSensitivity = input.dataSensitivity ?? [];

  const isVendorManaged = usesFoundationModel === 'yes_vendor_managed';
  const customerFacing =
    whoAffected === 'external' || whoAffected === 'both' || whoAffected === 'general_public';
  const hasSensitiveData = dataSensitivity.some((d) =>
    ['customer_confidential', 'personal_info', 'health_info', 'regulated_financial'].includes(d),
  );

  if (!isVendorManaged || !customerFacing || !hasSensitiveData) return null;

  return {
    id: 'vendor_managed_external_sensitive',
    name: 'Vendor-Managed Model + External + Sensitive Data',
    description:
      'SaaS AI tool with vendor-controlled model selection processing sensitive data with external impact — model can change without notice, no control over outputs that affect customers.',
    effect: 'escalate_one_tier',
  };
};

// ───────────────────────────────────────────────────────────────────
// Shadow IT patterns
// ───────────────────────────────────────────────────────────────────

/**
 * Shadow IT in Production: citizen development + production lifecycle + sensitive data
 * = unauthorized handling of regulated data with no governance.
 */
const patternShadowItInProduction: Pattern = (input) => {
  const buildOrAcquire = input.buildOrAcquire;
  const lifecycle = input.lifecycleStage;
  const dataSensitivity = input.dataSensitivity ?? [];

  const isCitizenDev = buildOrAcquire === 'citizen_development';
  const isInProduction = lifecycle === 'in_production' || lifecycle === 'in_use_seeking_approval';
  const hasSensitiveData = dataSensitivity.some((d) =>
    ['customer_confidential', 'personal_info', 'health_info', 'regulated_financial'].includes(d),
  );

  if (!isCitizenDev || !isInProduction || !hasSensitiveData) return null;

  return {
    id: 'shadow_it_in_production',
    name: 'Shadow IT in Production',
    description:
      'Citizen-developed system already in use processing sensitive data — bypassed standard governance controls and creates immediate compliance exposure.',
    effect: 'escalate_one_tier',
  };
};

// ───────────────────────────────────────────────────────────────────
// Agentic AI patterns
// ───────────────────────────────────────────────────────────────────

/**
 * Agentic Code Execution: AI agent + code-to-production + low oversight
 * = autonomous AI making changes to production systems.
 */
const patternAgenticCodeExecution: Pattern = (input) => {
  const aiTypes = input.aiType ?? [];
  const triggers = input.highRiskTriggers ?? [];
  const oversight = input.humanOversight;

  const isAgent = aiTypes.includes('ai_agent');
  const codeToProduction = triggers.includes('code_to_production');
  const lowOversight = oversight === 'fully_autonomous' || oversight === 'spot_check';

  if (!isAgent || !codeToProduction || !lowOversight) return null;

  return {
    id: 'agentic_code_execution',
    name: 'Agentic Code Execution',
    description:
      'AI agent autonomously generating and deploying code to production with limited oversight — cascading failure risk meets supply chain attack surface.',
    effect: { forceMinimum: 'medium_high' },
  };
};

/**
 * Autonomous Decisions at Scale: fully autonomous + significant/serious outcome + many people
 * = high-stakes automation without safety net.
 */
const patternAutonomousDecisionsAtScale: Pattern = (input) => {
  const oversight = input.humanOversight;
  const worstOutcome = input.worstOutcome;
  const peopleCount = input.peopleAffectedCount;

  const fullyAutonomous = oversight === 'fully_autonomous';
  const seriousOutcome = worstOutcome === 'significant' || worstOutcome === 'serious';
  const largeScale = peopleCount === '10000_100000' || peopleCount === 'over_100000';

  if (!fullyAutonomous || !seriousOutcome || !largeScale) return null;

  return {
    id: 'autonomous_decisions_at_scale',
    name: 'Autonomous Decisions at Scale',
    description:
      'Fully autonomous operation with significant impact potential affecting 10,000+ people — concentration of risk with no human safety net.',
    effect: 'escalate_one_tier',
  };
};

// ───────────────────────────────────────────────────────────────────
// IP / data exfiltration patterns
// ───────────────────────────────────────────────────────────────────

/**
 * IP Exfiltration via Third-Party AI: proprietary IP + third party + GenAI
 * = sending trade secrets to a SaaS that may use them for training.
 */
const patternIpExfiltration: Pattern = (input) => {
  const triggers = input.highRiskTriggers ?? [];
  const thirdParty = input.thirdPartyInvolved;
  const aiTypes = input.aiType ?? [];

  const hasProprietaryIp = triggers.includes('proprietary_ip');
  const isThirdParty = thirdParty === 'yes';
  const hasGenAi = aiTypes.includes('generative_ai') || aiTypes.includes('rag');

  if (!hasProprietaryIp || !isThirdParty || !hasGenAi) return null;

  return {
    id: 'ip_exfiltration_risk',
    name: 'IP Exfiltration via Third-Party AI',
    description:
      'Proprietary IP or trade secrets being processed by third-party generative AI — risk of data being used for training, leaked, or retained beyond corporate boundary.',
    effect: 'escalate_one_tier',
  };
};

// ───────────────────────────────────────────────────────────────────
// Vulnerability / population patterns
// ───────────────────────────────────────────────────────────────────

/**
 * Bias Amplification at Scale: differential treatment + large population + decision authority.
 */
const patternBiasAmplification: Pattern = (input) => {
  const differentialTreatment = input.differentialTreatment;
  const peopleCount = input.peopleAffectedCount;
  const oversight = input.humanOversight;

  const hasBiasRisk = differentialTreatment === 'yes' || differentialTreatment === 'possibly';
  const largeScale = peopleCount === '10000_100000' || peopleCount === 'over_100000';
  const isAutomated = oversight === 'spot_check' || oversight === 'fully_autonomous';

  if (!hasBiasRisk || !largeScale || !isAutomated) return null;

  return {
    id: 'bias_amplification_at_scale',
    name: 'Bias Amplification at Scale',
    description:
      'System with bias potential operating semi- or fully-autonomously across 10,000+ people — small per-decision bias compounds into significant disparate impact.',
    effect: 'escalate_one_tier',
  };
};

// ───────────────────────────────────────────────────────────────────
// Pattern registry
// ───────────────────────────────────────────────────────────────────

const ALL_PATTERNS: Pattern[] = [
  patternGenAiCustomerExposure,
  patternCrossBorderSensitiveData,
  patternBlackBoxVendorConsequential,
  patternVendorManagedExternal,
  patternShadowItInProduction,
  patternAgenticCodeExecution,
  patternAutonomousDecisionsAtScale,
  patternIpExfiltration,
  patternBiasAmplification,
];

/**
 * Evaluate every confluence pattern against the input.
 * Returns the list of fired patterns.
 */
export function evaluatePatterns(input: InherentRiskInput): FiredPattern[] {
  return ALL_PATTERNS.map((p) => p(input)).filter((p): p is FiredPattern => p !== null);
}
