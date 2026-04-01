/**
 * Risk scoring weights and thresholds.
 * Exported for reference — the actual scoring logic uses these values
 * directly in src/lib/classification/risk-scoring.ts.
 */

export const SCORING_WEIGHTS = {
  dataSensitivity: 25,
  decisionImpact: 20,
  geographicScope: 15,
  userExposure: 15,
  agentAutonomy: 15,
  businessActivity: 10,
} as const;

export const RISK_THRESHOLDS = {
  low: { min: 0, max: 25 },
  moderate: { min: 26, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 },
} as const;
