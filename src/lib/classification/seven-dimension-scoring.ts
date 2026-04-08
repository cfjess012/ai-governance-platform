/**
 * Seven-Dimension Risk Scoring Engine.
 *
 * Dimensions and weights:
 * 1. Regulatory & Compliance (20%)
 * 2. Data Risk (20%)
 * 3. Model/Technical Risk (15%)
 * 4. Operational Risk (15%)
 * 5. Fairness & Ethical Risk (15%)
 * 6. Reputational & Strategic Risk (10%)
 * 7. Third-Party/Supplier Risk (5%)
 *
 * Each dimension scored 1-5. Critical override: any dimension = 5 forces Critical tier.
 */

export interface SevenDimensionInput {
  // Regulatory
  deploymentRegions: string[];
  businessActivities: string[];
  vendorAuditScope: string;
  // Data
  dataClassification: string;
  interactsWithPii: string;
  unstructuredDataDev: string;
  unstructuredDataProd: string;
  dataProcessingRegions: string[];
  // Model
  aiModelsUsed: string;
  usesGenAi: string;
  usesClassicalModels: string;
  driftMonitoring: string;
  // Operational
  failureRisks: string;
  incidentResponsePlan: string;
  dataAccessible: string;
  // Fairness
  replacesHumanDecisions: string;
  automatesExternalDecisions: string;
  humanValidatesOutputs: string;
  biasFairnessTesting: string;
  // Reputational
  customerFacingOutputs: string;
  hasExternalUsers: string;
  monitorsHumanActivity: string;
  // Third-party
  involvesThirdParty: string;
  vendorIso42001: string;
  dataUsedForTraining: string;
}

export interface DimensionScore {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  explanation: string;
}

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface SevenDimensionResult {
  dimensions: DimensionScore[];
  compositeScore: number;
  riskTier: RiskTier;
  overrideTriggered: boolean;
  overrideReason: string;
  governanceRequirements: string[];
}

// ── Dimension scorers ──

const REGULATED_ACTIVITIES = new Set([
  'insurance_decisions',
  'investment_decisions',
  'hr_automated_hiring',
  'pricing_underwriting',
  'hr_workforce_monitoring',
]);

function scoreRegulatory(input: SevenDimensionInput): { score: number; explanation: string } {
  let score = 1;
  const reasons: string[] = [];

  const hasEu = input.deploymentRegions.includes('eu');
  const hasMultiRegion = input.deploymentRegions.length > 1;
  const regulatedCount = input.businessActivities.filter((a) => REGULATED_ACTIVITIES.has(a)).length;

  if (hasEu && regulatedCount > 0) {
    score = Math.max(score, 5);
    reasons.push('EU deployment with regulated business activities');
  } else if (hasEu) {
    score = Math.max(score, 3);
    reasons.push('EU deployment triggers AI Act compliance');
  } else if (regulatedCount >= 2) {
    score = Math.max(score, 4);
    reasons.push('Multiple regulated business activities');
  } else if (regulatedCount === 1) {
    score = Math.max(score, 3);
    reasons.push('Regulated business activity');
  }

  if (hasMultiRegion) {
    score = Math.max(score, Math.min(score + 1, 5));
    reasons.push('Multi-region deployment');
  }

  if (input.vendorAuditScope === 'no') {
    score = Math.min(score + 1, 5);
    reasons.push('AI features not in vendor audit scope');
  }

  return { score, explanation: reasons.join('; ') || 'No significant regulatory indicators' };
}

function scoreDataRisk(input: SevenDimensionInput): { score: number; explanation: string } {
  let score = 1;
  const reasons: string[] = [];

  const classificationScores: Record<string, number> = {
    public: 1,
    internal: 2,
    company_confidential: 3,
    customer_confidential: 5,
  };
  const classScore = classificationScores[input.dataClassification] ?? 1;
  score = Math.max(score, classScore);
  if (classScore >= 3) reasons.push(`${input.dataClassification} data classification`);

  if (input.interactsWithPii === 'yes') {
    score = Math.max(score, 4);
    reasons.push('Interacts with PII');
  }

  if (input.unstructuredDataDev === 'yes' || input.unstructuredDataProd === 'yes') {
    score = Math.min(score + 1, 5);
    reasons.push('Unstructured data usage');
  }

  if (input.dataProcessingRegions.length > 2) {
    score = Math.min(score + 1, 5);
    reasons.push('Cross-border data processing');
  }

  return { score, explanation: reasons.join('; ') || 'Low data sensitivity' };
}

function scoreModelRisk(input: SevenDimensionInput): { score: number; explanation: string } {
  let score = 1;
  const reasons: string[] = [];

  if (input.usesGenAi === 'yes') {
    score = Math.max(score, 3);
    reasons.push('Uses Generative AI');
  }

  if (input.usesClassicalModels === 'yes' && input.usesGenAi === 'yes') {
    score = Math.max(score, 4);
    reasons.push('Multiple model types');
  }

  const modelText = input.aiModelsUsed.toLowerCase();
  if (modelText.includes('gpt') || modelText.includes('llm') || modelText.includes('claude')) {
    score = Math.max(score, 3);
    reasons.push('Large Language Model detected');
  }

  if (!input.driftMonitoring || input.driftMonitoring.trim().length < 10) {
    score = Math.min(score + 1, 5);
    reasons.push('Insufficient drift monitoring');
  }

  return { score, explanation: reasons.join('; ') || 'Low model complexity' };
}

function scoreOperationalRisk(input: SevenDimensionInput): { score: number; explanation: string } {
  let score = 1;
  const reasons: string[] = [];

  if (input.failureRisks === 'financial') {
    score = Math.max(score, 4);
    reasons.push('Financial risk on failure');
  } else if (input.failureRisks === 'product_pricing') {
    score = Math.max(score, 3);
    reasons.push('Product/pricing risk on failure');
  } else if (input.failureRisks === 'operational') {
    score = Math.max(score, 2);
    reasons.push('Operational risk on failure');
  }

  if (input.incidentResponsePlan === 'no') {
    score = Math.min(score + 1, 5);
    reasons.push('No incident response plan');
  }

  if (input.dataAccessible === 'no') {
    score = Math.min(score + 1, 5);
    reasons.push('Required data not accessible');
  }

  return { score, explanation: reasons.join('; ') || 'Low operational exposure' };
}

function scoreFairnessRisk(input: SevenDimensionInput): { score: number; explanation: string } {
  let score = 1;
  const reasons: string[] = [];

  if (input.replacesHumanDecisions === 'yes') {
    score = Math.max(score, 4);
    reasons.push('Replaces human decisions');
  }

  if (input.automatesExternalDecisions === 'yes') {
    score = Math.max(score, 4);
    reasons.push('Automates external stakeholder decisions');
  }

  const regulatedCount = input.businessActivities.filter((a) => REGULATED_ACTIVITIES.has(a)).length;
  if (regulatedCount > 0 && input.replacesHumanDecisions === 'yes') {
    score = 5;
    reasons.push('Automated decisions on regulated activities');
  }

  if (input.humanValidatesOutputs === 'no') {
    score = Math.min(score + 1, 5);
    reasons.push('No human validation of outputs');
  }

  if (!input.biasFairnessTesting || input.biasFairnessTesting.trim().length < 10) {
    score = Math.min(score + 1, 5);
    reasons.push('Insufficient bias/fairness testing');
  }

  return { score, explanation: reasons.join('; ') || 'Low fairness risk' };
}

function scoreReputationalRisk(input: SevenDimensionInput): { score: number; explanation: string } {
  let score = 1;
  const reasons: string[] = [];

  if (input.customerFacingOutputs === 'yes') {
    score = Math.max(score, 3);
    reasons.push('Customer-facing AI outputs');
  }

  if (input.hasExternalUsers === 'yes') {
    score = Math.max(score, 3);
    reasons.push('External users');
  }

  if (input.monitorsHumanActivity === 'yes') {
    score = Math.max(score, 4);
    reasons.push('Monitors human activity');
  }

  if (
    input.customerFacingOutputs === 'yes' &&
    input.hasExternalUsers === 'yes' &&
    input.monitorsHumanActivity === 'yes'
  ) {
    score = 5;
    reasons.push('Maximum external exposure and monitoring');
  }

  return { score, explanation: reasons.join('; ') || 'Internal-only, low reputational risk' };
}

function scoreThirdPartyRisk(input: SevenDimensionInput): { score: number; explanation: string } {
  let score = 1;
  const reasons: string[] = [];

  if (input.involvesThirdParty === 'no') {
    return { score: 1, explanation: 'No third-party AI involvement' };
  }

  score = 2;
  reasons.push('Involves third-party AI');

  if (input.vendorIso42001 === 'no') {
    score = Math.min(score + 1, 5);
    reasons.push('Vendor not ISO 42001 certified');
  }

  if (input.dataUsedForTraining === 'yes') {
    score = Math.min(score + 2, 5);
    reasons.push('Data used for vendor model training');
  }

  return { score, explanation: reasons.join('; ') };
}

// ── Risk tier mapping ──

function getRiskTier(compositeScore: number): RiskTier {
  if (compositeScore <= 1.9) return 'low';
  if (compositeScore <= 2.9) return 'medium';
  if (compositeScore <= 3.9) return 'high';
  return 'critical';
}

function getGovernanceRequirements(tier: RiskTier): string[] {
  switch (tier) {
    case 'low':
      return ['Annual review', 'Standard documentation', 'Lightweight controls'];
    case 'medium':
      return [
        'Standard governance',
        'Management reporting',
        'Semi-annual review',
        'AI Champion oversight',
      ];
    case 'high':
      return [
        'Semi-annual validation',
        'Enhanced monitoring',
        'Risk committee reporting',
        'Governance analyst review',
        'Bias testing required',
      ];
    case 'critical':
      return [
        'Board approval required',
        'Continuous monitoring',
        'Independent validation',
        'Monthly risk review',
        'Mandatory bias testing',
        'Incident response plan required',
        'Pre-deployment audit',
      ];
  }
}

// ── Main scoring function ──

export function calculateSevenDimensionScore(input: SevenDimensionInput): SevenDimensionResult {
  const regulatory = scoreRegulatory(input);
  const data = scoreDataRisk(input);
  const model = scoreModelRisk(input);
  const operational = scoreOperationalRisk(input);
  const fairness = scoreFairnessRisk(input);
  const reputational = scoreReputationalRisk(input);
  const thirdParty = scoreThirdPartyRisk(input);

  const dimensions: DimensionScore[] = [
    {
      name: 'Regulatory & Compliance',
      score: regulatory.score,
      weight: 20,
      weightedScore: (regulatory.score * 20) / 100,
      explanation: regulatory.explanation,
    },
    {
      name: 'Data Risk',
      score: data.score,
      weight: 20,
      weightedScore: (data.score * 20) / 100,
      explanation: data.explanation,
    },
    {
      name: 'Model/Technical Risk',
      score: model.score,
      weight: 15,
      weightedScore: (model.score * 15) / 100,
      explanation: model.explanation,
    },
    {
      name: 'Operational Risk',
      score: operational.score,
      weight: 15,
      weightedScore: (operational.score * 15) / 100,
      explanation: operational.explanation,
    },
    {
      name: 'Fairness & Ethical Risk',
      score: fairness.score,
      weight: 15,
      weightedScore: (fairness.score * 15) / 100,
      explanation: fairness.explanation,
    },
    {
      name: 'Reputational & Strategic Risk',
      score: reputational.score,
      weight: 10,
      weightedScore: (reputational.score * 10) / 100,
      explanation: reputational.explanation,
    },
    {
      name: 'Third-Party/Supplier Risk',
      score: thirdParty.score,
      weight: 5,
      weightedScore: (thirdParty.score * 5) / 100,
      explanation: thirdParty.explanation,
    },
  ];

  const compositeScore = Number.parseFloat(
    dimensions.reduce((sum, d) => sum + d.weightedScore, 0).toFixed(2),
  );

  // Critical dimension override
  const criticalDimension = dimensions.find((d) => d.score === 5);
  const overrideTriggered = criticalDimension !== undefined;

  const riskTier = overrideTriggered ? 'critical' : getRiskTier(compositeScore);

  return {
    dimensions,
    compositeScore,
    riskTier,
    overrideTriggered,
    overrideReason: overrideTriggered
      ? `Critical dimension override: ${criticalDimension?.name} scored 5/5 (${criticalDimension?.explanation})`
      : '',
    governanceRequirements: getGovernanceRequirements(riskTier),
  };
}
