import type { RiskLevel, RiskScoreBreakdown, RiskScoreResult } from '@/types/classification';

/** Pre-production scoring types (used by pre-prod assessment, not intake) */
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
type UserBase =
  | 'internal_small'
  | 'internal_large'
  | 'internal_wide'
  | 'external_limited'
  | 'external_broad';
type AgentAutonomyLevel = 'none' | 'limited' | 'scoped' | 'broad' | 'unrestricted';
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

interface RiskScoringInput {
  dataTypes: readonly DataType[];
  decisionsAboutIndividuals: DecisionImpact;
  geographicScope: readonly GeographicScope[];
  expectedUserBase: UserBase;
  hasAgentCapabilities: boolean;
  agentAutonomyLevel?: AgentAutonomyLevel;
  primaryBusinessActivity: BusinessActivity;
}

// ── Scoring matrices ──

const dataSensitivityScores: Record<DataType, number> = {
  public: 5,
  synthetic: 10,
  proprietary: 30,
  behavioral: 50,
  financial: 60,
  pii: 70,
  phi: 85,
  biometric: 95,
};

const decisionImpactScores: Record<DecisionImpact, number> = {
  no: 0,
  assists: 50,
  automated: 100,
};

const geographicScores: Record<GeographicScope, number> = {
  us_only: 20,
  canada: 40,
  uk: 40,
  apac: 60,
  eu: 80,
  global: 100,
};

const userExposureScores: Record<UserBase, number> = {
  internal_small: 10,
  internal_large: 30,
  internal_wide: 50,
  external_limited: 70,
  external_broad: 100,
};

const agentAutonomyScores: Record<string, number> = {
  none: 0,
  limited: 0,
  scoped: 40,
  broad: 80,
  unrestricted: 100,
};

const businessActivityScores: Record<BusinessActivity, number> = {
  research: 15,
  operations: 25,
  marketing: 35,
  customer_service: 40,
  other: 40,
  compliance: 55,
  claims: 65,
  fraud_detection: 70,
  hr: 75,
  underwriting: 80,
};

// ── Weights ──

const WEIGHTS = {
  dataSensitivity: 25,
  decisionImpact: 20,
  geographicScope: 15,
  userExposure: 15,
  agentAutonomy: 15,
  businessActivity: 10,
};

function getRiskLevel(score: number): RiskLevel {
  if (score <= 25) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}

function getGovernanceRequirements(level: RiskLevel): string[] {
  switch (level) {
    case 'low':
      return ['Standard documentation', 'Annual review'];
    case 'moderate':
      return ['Enhanced documentation', 'Semi-annual review', 'AI Champion oversight'];
    case 'high':
      return [
        'Full risk assessment',
        'Quarterly review',
        'ERAI analyst review',
        'Monitoring plan required',
      ];
    case 'critical':
      return [
        'Executive review required',
        'Monthly monitoring',
        'Mandatory bias testing',
        'Incident response plan',
        'Pre-deployment audit',
      ];
  }
}

/**
 * Calculate inherent risk score for an AI use case.
 * Pure function — no side effects.
 */
export function calculateRiskScore(input: RiskScoringInput): RiskScoreResult {
  const breakdown: RiskScoreBreakdown[] = [];

  // Data Sensitivity — use max score from selected data types
  const dataScore = Math.max(...input.dataTypes.map((dt) => dataSensitivityScores[dt]));
  const dataLabel = input.dataTypes.reduce(
    (max, dt) => (dataSensitivityScores[dt] > dataSensitivityScores[max] ? dt : max),
    input.dataTypes[0],
  );
  const dataWeighted = (dataScore * WEIGHTS.dataSensitivity) / 100;
  breakdown.push({
    factor: 'Data Sensitivity',
    value: dataLabel,
    rawScore: dataScore,
    weight: WEIGHTS.dataSensitivity,
    weightedScore: dataWeighted,
  });

  // Decision Impact
  const decisionScore = decisionImpactScores[input.decisionsAboutIndividuals];
  const decisionWeighted = (decisionScore * WEIGHTS.decisionImpact) / 100;
  breakdown.push({
    factor: 'Decision Impact',
    value: input.decisionsAboutIndividuals,
    rawScore: decisionScore,
    weight: WEIGHTS.decisionImpact,
    weightedScore: decisionWeighted,
  });

  // Geographic Scope — use max score from selected regions
  const geoScore = Math.max(...input.geographicScope.map((gs) => geographicScores[gs]));
  const geoLabel = input.geographicScope.reduce(
    (max, gs) => (geographicScores[gs] > geographicScores[max] ? gs : max),
    input.geographicScope[0],
  );
  const geoWeighted = (geoScore * WEIGHTS.geographicScope) / 100;
  breakdown.push({
    factor: 'Geographic Scope',
    value: geoLabel,
    rawScore: geoScore,
    weight: WEIGHTS.geographicScope,
    weightedScore: geoWeighted,
  });

  // User Exposure
  const userScore = userExposureScores[input.expectedUserBase];
  const userWeighted = (userScore * WEIGHTS.userExposure) / 100;
  breakdown.push({
    factor: 'User Exposure',
    value: input.expectedUserBase,
    rawScore: userScore,
    weight: WEIGHTS.userExposure,
    weightedScore: userWeighted,
  });

  // Agent Autonomy
  const agentKey = input.hasAgentCapabilities ? (input.agentAutonomyLevel ?? 'none') : 'none';
  const agentScore = agentAutonomyScores[agentKey] ?? 0;
  const agentWeighted = (agentScore * WEIGHTS.agentAutonomy) / 100;
  breakdown.push({
    factor: 'Agent Autonomy',
    value: agentKey,
    rawScore: agentScore,
    weight: WEIGHTS.agentAutonomy,
    weightedScore: agentWeighted,
  });

  // Business Activity
  const activityScore = businessActivityScores[input.primaryBusinessActivity];
  const activityWeighted = (activityScore * WEIGHTS.businessActivity) / 100;
  breakdown.push({
    factor: 'Business Activity',
    value: input.primaryBusinessActivity,
    rawScore: activityScore,
    weight: WEIGHTS.businessActivity,
    weightedScore: activityWeighted,
  });

  // Total score
  const score = Math.round(breakdown.reduce((sum, b) => sum + b.weightedScore, 0));
  const level = getRiskLevel(score);

  // Top risk factors — sort by weighted score descending, take top 3
  const topRiskFactors = [...breakdown]
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 3)
    .map((b) => `${b.factor}: ${b.value} (${b.rawScore}/100)`);

  return {
    score,
    level,
    breakdown,
    governanceRequirements: getGovernanceRequirements(level),
    topRiskFactors,
  };
}
