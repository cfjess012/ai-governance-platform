import type { EuAiActClassification } from '@/types/classification';

/** Pre-production classification types (used by pre-prod assessment, not intake) */
type BusinessActivity =
  | 'customer_service'
  | 'fraud_detection'
  | 'underwriting'
  | 'claims'
  | 'marketing'
  | 'hr'
  | 'compliance'
  | 'operations'
  | 'research'
  | 'other';
type DataType =
  | 'pii'
  | 'phi'
  | 'financial'
  | 'biometric'
  | 'behavioral'
  | 'public'
  | 'synthetic'
  | 'proprietary';
type DecisionImpact = 'no' | 'assists' | 'automated';
type GeographicScope = 'us_only' | 'eu' | 'uk' | 'canada' | 'apac' | 'global';

interface ClassificationInput {
  geographicScope: readonly GeographicScope[];
  primaryBusinessActivity: BusinessActivity;
  dataTypes: readonly DataType[];
  decisionsAboutIndividuals: DecisionImpact;
  expectedUserBase: string;
  hasAgentCapabilities?: boolean;
  agentAutonomyLevel?: string;
}

function affectsEU(geographicScope: readonly GeographicScope[]): boolean {
  return geographicScope.includes('eu') || geographicScope.includes('global');
}

function isProhibited(input: ClassificationInput): { match: boolean; triggers: string[] } {
  const triggers: string[] = [];

  // Biometric + HR + automated decisions in EU
  if (
    input.primaryBusinessActivity === 'hr' &&
    input.dataTypes.includes('biometric') &&
    input.decisionsAboutIndividuals === 'automated'
  ) {
    triggers.push(
      'Automated decisions using biometric data in HR context (emotion recognition in workplace)',
    );
  }

  // Unrestricted autonomous agent in EU
  if (input.agentAutonomyLevel === 'unrestricted') {
    triggers.push('Unrestricted autonomous AI agent with no human oversight');
  }

  return { match: triggers.length > 0, triggers };
}

function isHighRisk(input: ClassificationInput): { match: boolean; triggers: string[] } {
  const triggers: string[] = [];

  const highRiskActivities: BusinessActivity[] = [
    'underwriting',
    'claims',
    'fraud_detection',
    'hr',
  ];

  // High-risk business activity with decisions about individuals
  if (
    highRiskActivities.includes(input.primaryBusinessActivity) &&
    (input.decisionsAboutIndividuals === 'automated' ||
      input.decisionsAboutIndividuals === 'assists')
  ) {
    triggers.push(
      `${input.primaryBusinessActivity} with ${input.decisionsAboutIndividuals} decisions about individuals`,
    );
  }

  // Sensitive data + automated decisions
  const sensitiveData: DataType[] = ['pii', 'phi', 'biometric', 'financial'];
  const hasSensitiveData = input.dataTypes.some((dt) => sensitiveData.includes(dt));

  if (hasSensitiveData && input.decisionsAboutIndividuals === 'automated') {
    triggers.push(
      `Automated decisions using sensitive data (${input.dataTypes
        .filter((dt) => sensitiveData.includes(dt))
        .join(', ')})`,
    );
  }

  // Compliance + automated decisions
  if (
    input.primaryBusinessActivity === 'compliance' &&
    input.decisionsAboutIndividuals === 'automated'
  ) {
    triggers.push('Automated compliance decisions');
  }

  return { match: triggers.length > 0, triggers };
}

function isLimitedRisk(input: ClassificationInput): { match: boolean; triggers: string[] } {
  const triggers: string[] = [];

  // External-facing system that interacts with individuals
  if (
    input.expectedUserBase === 'external_limited' ||
    input.expectedUserBase === 'external_broad'
  ) {
    triggers.push('External-facing AI system — transparency obligations apply');
  }

  return { match: triggers.length > 0, triggers };
}

/**
 * Classify an AI use case against EU AI Act risk tiers.
 * Pure function — no side effects.
 */
export function classifyEuAiAct(input: ClassificationInput): EuAiActClassification {
  const euNexus = affectsEU(input.geographicScope);

  if (!euNexus) {
    return {
      tier: 'minimal',
      reason: 'No EU nexus — EU AI Act classification is informational only',
      mandatory: false,
      triggers: [],
    };
  }

  const prohibited = isProhibited(input);
  if (prohibited.match) {
    return {
      tier: 'prohibited',
      reason: 'Use case matches prohibited AI practices under EU AI Act',
      mandatory: true,
      triggers: prohibited.triggers,
    };
  }

  const highRisk = isHighRisk(input);
  if (highRisk.match) {
    return {
      tier: 'high',
      reason: 'Use case classified as high-risk under EU AI Act',
      mandatory: true,
      triggers: highRisk.triggers,
    };
  }

  const limited = isLimitedRisk(input);
  if (limited.match) {
    return {
      tier: 'limited',
      reason: 'Use case has transparency obligations under EU AI Act',
      mandatory: true,
      triggers: limited.triggers,
    };
  }

  return {
    tier: 'minimal',
    reason: 'No high-risk indicators detected — minimal risk under EU AI Act',
    mandatory: true,
    triggers: [],
  };
}
