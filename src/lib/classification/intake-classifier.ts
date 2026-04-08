/**
 * Preliminary classification for the intake wizard sidebar.
 * These are PRELIMINARY signals based on limited intake data.
 * Full classification happens during the pre-production risk assessment.
 */

export interface IntakeClassificationInput {
  businessProblem?: string;
  howAiHelps?: string;
  businessArea?: string;
  aiType?: string[];
  buildOrAcquire?: string;
  highRiskTriggers?: string[];
  deploymentRegions?: string[];
  worstOutcome?: string;
  humanOversight?: string;
}

export type EuRiskIndicator =
  | 'potentially_high_or_prohibited'
  | 'likely_high_financial'
  | 'likely_high_employment'
  | 'to_be_determined';

export interface EuAiActIntakeResult {
  indicator: EuRiskIndicator;
  label: string;
  description: string;
  color: 'red' | 'amber' | 'gray';
}

export interface RiskSignal {
  id: string;
  label: string;
  severity: 'red' | 'amber' | 'blue';
}

export interface IntakeClassificationResult {
  euAiAct: EuAiActIntakeResult;
  riskSignals: RiskSignal[];
}

/** High-risk trigger values that map to prohibited/high-risk EU AI Act categories */
const PROHIBITED_TRIGGERS = new Set(['fine_tuning_llm', 'biometric_id', 'emotion_detection']);

/** High-risk trigger values that map to financial services Annex III */
const FINANCIAL_TRIGGERS = new Set(['insurance_pricing', 'investment_advice', 'credit_lending']);

/** Financial triggers that require review but are lower risk (info retrieval, not decision-making) */
const FINANCIAL_INFO_TRIGGERS = new Set(['financial_info_retrieval']);

/** Business area values that indicate financial services */
const FINANCIAL_AREAS = new Set(['actuarial', 'claims', 'investments', 'underwriting', 'finance']);

/** High-risk trigger values that map to employment Annex III */
const EMPLOYMENT_TRIGGERS = new Set(['hiring_workforce']);

const EMPLOYMENT_KEYWORDS = [
  'hiring',
  'recruitment',
  'hr decision',
  'human resources',
  'talent acquisition',
  'performance review',
  'termination',
  'promotion',
  'compensation',
];

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Classify EU AI Act risk tier based on intake answers.
 */
export function classifyEuAiActIntake(input: IntakeClassificationInput): EuAiActIntakeResult {
  const triggers = input.highRiskTriggers ?? [];

  // Prohibited/heavily regulated practices
  if (triggers.some((t) => PROHIBITED_TRIGGERS.has(t))) {
    return {
      indicator: 'potentially_high_or_prohibited',
      label: 'Potentially High Risk or Prohibited',
      description:
        'This use case involves practices (LLM fine-tuning, biometric identification, or emotion detection) that may be prohibited or heavily regulated under the EU AI Act.',
      color: 'red',
    };
  }

  // Financial services high-risk triggers
  if (
    triggers.some((t) => FINANCIAL_TRIGGERS.has(t)) ||
    FINANCIAL_AREAS.has(input.businessArea ?? '')
  ) {
    return {
      indicator: 'likely_high_financial',
      label: 'Likely High Risk (Annex III \u2013 Financial Services)',
      description:
        'This use case involves financial services decisions, which fall under EU AI Act Annex III high-risk category.',
      color: 'amber',
    };
  }

  // Employment high-risk triggers or keyword match
  const descText = [input.businessProblem ?? '', input.howAiHelps ?? ''].join(' ');
  if (
    triggers.some((t) => EMPLOYMENT_TRIGGERS.has(t)) ||
    matchesKeywords(descText, EMPLOYMENT_KEYWORDS)
  ) {
    return {
      indicator: 'likely_high_employment',
      label: 'Likely High Risk (Annex III \u2013 Employment)',
      description:
        'This use case involves employment-related decisions, which are high-risk under EU AI Act Annex III.',
      color: 'amber',
    };
  }

  return {
    indicator: 'to_be_determined',
    label: 'To be determined during Pre-Production Assessment',
    description:
      'Based on the intake information provided, the EU AI Act risk tier will be fully assessed during the pre-production risk assessment.',
    color: 'gray',
  };
}

/**
 * Detect preliminary risk signals from intake answers.
 */
export function detectRiskSignals(input: IntakeClassificationInput): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const triggers = input.highRiskTriggers ?? [];

  // High-risk triggers selected (excluding info-only triggers)
  const substantiveTriggers = triggers.filter(
    (t) => t !== 'none_of_above' && !FINANCIAL_INFO_TRIGGERS.has(t),
  );
  if (substantiveTriggers.length > 0) {
    signals.push({
      id: 'high_risk_triggers',
      label: 'High-risk decision triggers selected \u2014 comprehensive assessment required',
      severity: 'amber',
    });
  }

  // Financial info retrieval (lower risk, still needs review)
  if (triggers.some((t) => FINANCIAL_INFO_TRIGGERS.has(t))) {
    signals.push({
      id: 'financial_info_retrieval',
      label:
        'Financial information retrieval \u2014 lighter review path, accuracy controls required',
      severity: 'blue',
    });
  }

  // Citizen development
  if (input.buildOrAcquire === 'citizen_development') {
    signals.push({
      id: 'citizen_development',
      label: 'Citizen development \u2014 governance guardrails needed',
      severity: 'blue',
    });
  }

  // Unknown build type
  if (input.buildOrAcquire === 'not_sure_yet') {
    signals.push({
      id: 'unknown_build',
      label: 'Build/acquire type undetermined \u2014 review needed',
      severity: 'blue',
    });
  }

  // Serious worst outcome
  if (input.worstOutcome === 'serious') {
    signals.push({
      id: 'serious_outcome',
      label: 'Serious potential harm identified \u2014 elevated review priority',
      severity: 'red',
    });
  }

  // Fully autonomous with no human oversight
  if (input.humanOversight === 'fully_autonomous') {
    signals.push({
      id: 'fully_autonomous',
      label: 'Fully autonomous operation \u2014 enhanced controls required',
      severity: 'amber',
    });
  }

  // EU/EEA deployment
  const regions = input.deploymentRegions ?? [];
  if (regions.includes('eu_eea')) {
    signals.push({
      id: 'eu_deployment',
      label: 'EU/EEA deployment \u2014 EU AI Act obligations apply',
      severity: 'blue',
    });
  }

  return signals;
}

/**
 * Full intake classification — combines EU AI Act tier and risk signals.
 */
export function classifyIntake(input: IntakeClassificationInput): IntakeClassificationResult {
  return {
    euAiAct: classifyEuAiActIntake(input),
    riskSignals: detectRiskSignals(input),
  };
}
