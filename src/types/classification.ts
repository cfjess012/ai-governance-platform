export type EuAiActTier = 'prohibited' | 'high' | 'limited' | 'minimal';

export interface EuAiActClassification {
  tier: EuAiActTier;
  reason: string;
  mandatory: boolean;
  triggers: string[];
}

export type AgentTierLevel = 'low' | 'medium' | 'high' | 'prohibited';

export interface AgentTierClassification {
  tier: AgentTierLevel;
  level: 1 | 2 | 3 | 4;
  reason: string;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskScoreBreakdown {
  factor: string;
  value: string;
  rawScore: number;
  weight: number;
  weightedScore: number;
}

export interface RiskScoreResult {
  score: number;
  level: RiskLevel;
  breakdown: RiskScoreBreakdown[];
  governanceRequirements: string[];
  topRiskFactors: string[];
}
