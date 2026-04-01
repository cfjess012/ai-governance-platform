/**
 * Preliminary classification for the intake wizard sidebar.
 * These are PRELIMINARY signals based on limited intake data.
 * Full classification happens during the pre-production risk assessment.
 */

export interface IntakeClassificationInput {
  businessPurpose?: string;
  ethicalAiAligned?: boolean;
  prohibitedPractices?: string;
  businessArea?: string;
  solutionType?: string;
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

const FINANCIAL_KEYWORDS = [
  'insurance',
  'investment',
  'credit',
  'lending',
  'underwriting',
  'annuity',
  'annuities',
  'retirement',
  'wealth',
  'asset management',
  'mortgage',
  'loan',
];

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
  // Q7: Prohibited practices (fine-tuning LLMs, biometric EU, emotion detection EU)
  if (input.prohibitedPractices === 'yes') {
    return {
      indicator: 'potentially_high_or_prohibited',
      label: 'Potentially High Risk or Prohibited',
      description:
        'This use case involves practices (LLM fine-tuning, biometric scanning, or emotion detection) that may be prohibited or heavily regulated under the EU AI Act.',
      color: 'red',
    };
  }

  // Q8: Business area involves financial services
  if (input.businessArea && matchesKeywords(input.businessArea, FINANCIAL_KEYWORDS)) {
    return {
      indicator: 'likely_high_financial',
      label: 'Likely High Risk (Annex III \u2013 Financial Services)',
      description:
        'The business area suggests this use case falls under EU AI Act Annex III high-risk category for financial services.',
      color: 'amber',
    };
  }

  // Q5: Business purpose mentions employment/hiring
  if (input.businessPurpose && matchesKeywords(input.businessPurpose, EMPLOYMENT_KEYWORDS)) {
    return {
      indicator: 'likely_high_employment',
      label: 'Likely High Risk (Annex III \u2013 Employment)',
      description:
        'The business purpose suggests this use case involves employment-related decisions, which are high-risk under EU AI Act Annex III.',
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

  // Q6: Ethical AI misalignment
  if (input.ethicalAiAligned === false) {
    signals.push({
      id: 'ethical_misalignment',
      label: 'Ethical AI misalignment \u2014 ERAI review required',
      severity: 'red',
    });
  }

  // Q7: Involves regulated practices
  if (input.prohibitedPractices === 'yes') {
    signals.push({
      id: 'regulated_practices',
      label: 'Involves regulated AI practices \u2014 additional assessment required',
      severity: 'amber',
    });
  }

  // Q2: Citizen Development
  if (input.solutionType === 'citizen_development') {
    signals.push({
      id: 'citizen_development',
      label: 'Citizen development \u2014 governance guardrails needed',
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
