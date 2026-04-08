/**
 * Parser and validator for LLM governance analysis output.
 *
 * The LLM produces a JSON object that we validate and normalize. If the
 * LLM output is malformed (missing fields, wrong types), we fill in
 * UNKNOWN fallbacks rather than crashing — a partial analysis is still
 * useful, and the auditor caveat ("UNKNOWN") is preserved.
 */

import type { GovernanceAnalysis, RiskFinding, RiskLevel } from './types';

const VALID_RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'];

function asString(value: unknown, fallback = 'UNKNOWN'): string {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function asInteger(value: unknown, fallback: number, min: number, max: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(num)) {
    return Math.max(min, Math.min(max, Math.round(num)));
  }
  return fallback;
}

function asRiskFinding(value: unknown, defaultTitle: string): RiskFinding {
  if (!value || typeof value !== 'object') {
    return {
      title: defaultTitle,
      level: 'UNKNOWN',
      justification: 'Not assessed by the analysis.',
    };
  }
  const obj = value as Record<string, unknown>;
  const rawLevel = typeof obj.level === 'string' ? obj.level.toUpperCase() : '';
  const level = VALID_RISK_LEVELS.includes(rawLevel as RiskLevel)
    ? (rawLevel as RiskLevel)
    : 'UNKNOWN';
  return {
    title: asString(obj.title, defaultTitle),
    level,
    justification: asString(obj.justification, 'No justification provided.'),
  };
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/**
 * Normalize a raw LLM output into a complete GovernanceAnalysis.
 * Missing fields become "UNKNOWN" with the appropriate type.
 */
export function normalizeAnalysis(raw: unknown, generatedBy = 'unknown'): GovernanceAnalysis {
  const obj = asObject(raw);
  const intendedUse = asObject(obj.intendedUse);
  const userImpact = asObject(obj.userImpact);
  const riskAssessment = asObject(obj.riskAssessment);
  const performance = asObject(obj.performance);
  const trainingData = asObject(obj.trainingData);
  const safety = asObject(obj.safety);
  const limitations = asObject(obj.limitations);
  const operationalGuidance = asObject(obj.operationalGuidance);
  const compliance = asObject(obj.compliance);
  const versioning = asObject(obj.versioning);

  const openGaps = Array.isArray(obj.openGaps)
    ? obj.openGaps
        .filter((g) => g && typeof g === 'object')
        .map((g) => ({
          title: asString((g as Record<string, unknown>).title, 'Untitled gap'),
          governanceRisk: asString(
            (g as Record<string, unknown>).governanceRisk,
            'No explanation provided.',
          ),
        }))
    : [];

  return {
    confidenceScore: asInteger(obj.confidenceScore, 0, 0, 100),
    summary: asString(obj.summary, 'No summary provided by the analysis.'),
    strengths: asStringArray(obj.strengths),
    concerns: asStringArray(obj.concerns),
    recommendations: asStringArray(obj.recommendations),

    intendedUse: {
      primaryUseCases: asString(intendedUse.primaryUseCases),
      prohibitedUseCases: asString(intendedUse.prohibitedUseCases),
      highRiskDomains: asString(intendedUse.highRiskDomains),
    },

    userImpact: {
      endUsers: asString(userImpact.endUsers),
      potentiallyHarmed: asString(userImpact.potentiallyHarmed),
      harmScenarios: asString(userImpact.harmScenarios),
    },

    riskAssessment: {
      hallucination: asRiskFinding(riskAssessment.hallucination, 'Hallucination'),
      bias: asRiskFinding(riskAssessment.bias, 'Bias'),
      security: asRiskFinding(riskAssessment.security, 'Security'),
      misuse: asRiskFinding(riskAssessment.misuse, 'Misuse'),
    },

    performance: {
      knownBenchmarks: asString(performance.knownBenchmarks),
      domainPerformance: asString(performance.domainPerformance),
      failureCases: asString(performance.failureCases),
      confidenceCalibration: asString(performance.confidenceCalibration),
    },

    trainingData: {
      sources: asString(trainingData.sources),
      knownExclusions: asString(trainingData.knownExclusions),
      biasSources: asString(trainingData.biasSources),
      ipCopyrightRisk: asString(trainingData.ipCopyrightRisk),
    },

    safety: {
      contentModeration: asString(safety.contentModeration),
      refusalBehavior: asString(safety.refusalBehavior),
      guardrails: asString(safety.guardrails),
      monitoringRecommendations: asString(safety.monitoringRecommendations),
    },

    limitations: {
      poorPerformanceAreas: asString(limitations.poorPerformanceAreas),
      untrustedScenarios: asString(limitations.untrustedScenarios),
      overconfidencePatterns: asString(limitations.overconfidencePatterns),
    },

    operationalGuidance: {
      requiredHumanInLoop: asString(operationalGuidance.requiredHumanInLoop),
      safeDeploymentPatterns: asString(operationalGuidance.safeDeploymentPatterns),
      unsafeDeploymentPatterns: asString(operationalGuidance.unsafeDeploymentPatterns),
    },

    compliance: {
      frameworkAlignment: asString(compliance.frameworkAlignment),
      dataHandling: asString(compliance.dataHandling),
      auditRequirements: asString(compliance.auditRequirements),
    },

    versioning: {
      changesFromPriorVersions: asString(versioning.changesFromPriorVersions),
      riskImplications: asString(versioning.riskImplications),
    },

    openGaps,
    generatedAt: new Date().toISOString(),
    generatedBy,
  };
}

/**
 * Build a fallback "stub" analysis when the LLM is unavailable.
 * Marks every field as UNKNOWN so the auditor can see exactly what's missing.
 */
export function buildFallbackAnalysis(generatedBy: string): GovernanceAnalysis {
  return normalizeAnalysis({}, generatedBy);
}

/**
 * Tier helper: average all 4 risk findings into an overall risk class.
 */
export function overallRiskFromFindings(analysis: GovernanceAnalysis): RiskLevel {
  const findings = [
    analysis.riskAssessment.hallucination,
    analysis.riskAssessment.bias,
    analysis.riskAssessment.security,
    analysis.riskAssessment.misuse,
  ];

  const order: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, UNKNOWN: 0 };
  let max: RiskLevel = 'UNKNOWN';
  let maxOrd = 0;
  for (const f of findings) {
    if (order[f.level] > maxOrd) {
      max = f.level;
      maxOrd = order[f.level];
    }
  }
  return max;
}
