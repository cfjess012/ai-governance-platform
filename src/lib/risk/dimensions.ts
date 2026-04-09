/**
 * Inherent risk dimensions.
 *
 * Each dimension is a pure function: it takes intake answers and returns
 * a 0-4 score with a rationale. Dimensions are inherent properties of the
 * system, NOT controls or mitigations.
 */

import type { DimensionScore, InherentRiskInput, ScoreContributor } from './types';

/** Weights for each dimension (must sum to 1.0) */
export const DIMENSION_WEIGHTS = {
  decision_domain: 0.25,
  decision_authority: 0.15,
  affected_population: 0.15,
  data_sensitivity: 0.15,
  ai_capability: 0.1,
  regulatory_exposure: 0.15,
  reversibility: 0.05,
} as const;

// ───────────────────────────────────────────────────────────────────
// Dimension 1: Decision Domain
// ───────────────────────────────────────────────────────────────────

/** Business areas in regulated domains (from EU AI Act Annex III + Colorado SB24-205) */
const REGULATED_BUSINESS_AREAS = new Set([
  'actuarial',
  'claims',
  'compliance',
  'finance',
  'hr',
  'investments',
  'legal',
  'risk_management',
  'underwriting',
]);

/** High-severity triggers tied to regulated decision domains */
const SEVERE_DOMAIN_TRIGGERS = new Set([
  'insurance_pricing',
  'investment_advice',
  'credit_lending',
  'hiring_workforce',
  'biometric_id',
  'emotion_detection',
]);

/** Moderate-severity triggers */
const MODERATE_DOMAIN_TRIGGERS = new Set([
  'fraud_detection',
  'fine_tuning_llm',
  'code_to_production',
  'security_vulnerability_risk',
  'processes_customer_pii', // P3C: customer PII processing is a moderate risk trigger
]);

/** Low-severity triggers (still regulated, but lighter) */
const LIGHT_DOMAIN_TRIGGERS = new Set([
  'financial_info_retrieval',
  'proprietary_ip',
  'external_content_generation',
]);

export function scoreDecisionDomain(input: InherentRiskInput): DimensionScore {
  const triggers = input.highRiskTriggers ?? [];
  const businessArea = input.businessArea ?? '';

  const severeMatches = triggers.filter((t) => SEVERE_DOMAIN_TRIGGERS.has(t));
  const moderateMatches = triggers.filter((t) => MODERATE_DOMAIN_TRIGGERS.has(t));
  const lightMatches = triggers.filter((t) => LIGHT_DOMAIN_TRIGGERS.has(t));
  const isRegulatedArea = REGULATED_BUSINESS_AREAS.has(businessArea);

  let score = 0;
  let rationale = 'No regulated decision domain detected.';

  if (severeMatches.length >= 2) {
    score = 4;
    rationale = `Multiple severe regulated decision triggers (${severeMatches.join(', ')}) — system operates in high-stakes regulated domains.`;
  } else if (severeMatches.length === 1) {
    score = 3;
    rationale = `Severe regulated decision trigger detected (${severeMatches[0]}).`;
  } else if (moderateMatches.length > 0 && isRegulatedArea) {
    score = 3;
    rationale = `Moderate regulated trigger (${moderateMatches.join(', ')}) in a regulated business area (${businessArea}).`;
  } else if (moderateMatches.length > 0) {
    score = 2;
    rationale = `Moderate regulated trigger detected (${moderateMatches.join(', ')}).`;
  } else if (lightMatches.length > 0 && isRegulatedArea) {
    score = 2;
    rationale = `Light regulated trigger (${lightMatches.join(', ')}) in a regulated business area (${businessArea}).`;
  } else if (lightMatches.length > 0) {
    score = 1;
    rationale = `Light regulated trigger detected (${lightMatches.join(', ')}).`;
  } else if (isRegulatedArea) {
    score = 1;
    rationale = `Operates in a regulated business area (${businessArea}) without specific decision triggers.`;
  }

  return {
    id: 'decision_domain',
    label: 'Decision Domain',
    score,
    weight: DIMENSION_WEIGHTS.decision_domain,
    rationale,
  };
}

// ───────────────────────────────────────────────────────────────────
// Dimension 2: Decision Authority (autonomy level — inherent design)
// ───────────────────────────────────────────────────────────────────

export function scoreDecisionAuthority(input: InherentRiskInput): DimensionScore {
  const oversight = input.humanOversight;
  const aiTypes = input.aiType ?? [];
  const isAgent = aiTypes.includes('ai_agent');

  let score = 0;
  let rationale = 'Decision authority not yet specified.';

  switch (oversight) {
    case 'not_applicable':
      score = 0;
      rationale = 'Informational tool only — no decision authority.';
      break;
    case 'human_decides':
      score = 1;
      rationale = 'Human makes all decisions; AI provides information or suggestions only.';
      break;
    case 'human_reviews':
      score = 2;
      rationale = 'AI recommends, human reviews and approves before action.';
      break;
    case 'spot_check':
      score = 3;
      rationale = 'AI acts on its own; human spot-checks after the fact.';
      break;
    case 'fully_autonomous':
      score = 4;
      rationale = 'Fully autonomous operation with no routine human review.';
      break;
  }

  // Agentic AI adds inherent autonomy risk regardless of stated oversight
  if (isAgent && score < 3) {
    score = Math.min(4, score + 1);
    rationale = `${rationale} Agentic AI adds inherent autonomy risk.`;
  }

  const contributors: ScoreContributor[] = [];
  if (oversight) {
    contributors.push({
      field: 'humanOversight',
      label: 'Human Oversight',
      value: oversight,
      contribution: `Base score ${score} from oversight level`,
    });
  }
  if (isAgent) {
    contributors.push({
      field: 'aiType',
      label: 'AI Type',
      value: 'ai_agent',
      contribution: 'Agentic AI adds inherent autonomy risk',
    });
  }

  return {
    id: 'decision_authority',
    label: 'Decision Authority',
    score,
    weight: DIMENSION_WEIGHTS.decision_authority,
    rationale,
    contributors,
  };
}

// ───────────────────────────────────────────────────────────────────
// Dimension 3: Affected Population (scope, scale, vulnerability)
// ───────────────────────────────────────────────────────────────────

/**
 * P3A fix: impact severity modifier.
 *
 * Population scale is NOT a linear risk multiplier. A FAQ chatbot serving
 * 50,000 users should NOT score identically to a system freezing bank
 * accounts for 50,000 users. The modifier cross-references decision
 * authority (from humanOversight) and worst-case outcome (from worstOutcome)
 * to dampen the scale bump for low-authority, high-reversibility cases.
 *
 * Formula: scaleBump is applied only when the combined impact severity
 * (derived from oversight + worst outcome) justifies it. Low-authority +
 * minor-outcome cases at high scale get NO scale bump — their large user
 * base doesn't amplify risk because the system doesn't make consequential
 * decisions.
 */
function impactSeverity(input: InherentRiskInput): 'low' | 'medium' | 'high' {
  const oversight = input.humanOversight;
  const outcome = input.worstOutcome;

  // High severity: fully autonomous or serious outcomes
  if (oversight === 'fully_autonomous') return 'high';
  if (outcome === 'serious') return 'high';

  // Medium severity: spot-check oversight or significant outcome
  if (oversight === 'spot_check') return 'medium';
  if (outcome === 'significant') return 'medium';

  // Low severity: human decides/reviews + minor/moderate outcome
  return 'low';
}

export function scoreAffectedPopulation(input: InherentRiskInput): DimensionScore {
  const whoAffected = input.whoAffected;
  const peopleCount = input.peopleAffectedCount;
  const differentialTreatment = input.differentialTreatment;
  const severity = impactSeverity(input);

  let score = 0;
  let rationale = 'Affected population not yet specified.';

  // Base score from who is affected
  let baseScore = 0;
  let scopeLabel = '';
  switch (whoAffected) {
    case 'internal_only':
      baseScore = 1;
      scopeLabel = 'internal employees only';
      break;
    case 'external':
      baseScore = 3;
      scopeLabel = 'external customers';
      break;
    case 'both':
      baseScore = 3;
      scopeLabel = 'both internal and external people';
      break;
    case 'general_public':
      baseScore = 4;
      scopeLabel = 'the general public';
      break;
  }

  // P3A: Scale bump now modulated by impact severity.
  // High population + low authority + high reversibility → no scale bump.
  // High population + high authority + low reversibility → full bump.
  let scaleBump = 0;
  let scaleLabel = '';
  const isLargeScale = peopleCount === '10000_100000' || peopleCount === 'over_100000';
  const isExternallyFacing = whoAffected !== 'internal_only';

  switch (peopleCount) {
    case 'under_100':
      scaleLabel = 'small scale (<100)';
      break;
    case '100_1000':
      scaleLabel = 'modest scale (100-1k)';
      break;
    case '1000_10000':
      scaleLabel = 'significant scale (1k-10k)';
      break;
    case '10000_100000':
      scaleLabel = 'large scale (10k-100k)';
      break;
    case 'over_100000':
      scaleLabel = 'very large scale (100k+)';
      break;
  }

  if (isLargeScale && isExternallyFacing) {
    if (severity === 'high') {
      scaleBump = 1;
    } else if (severity === 'medium') {
      scaleBump = 1;
    }
    // severity === 'low' → no bump — large user base alone doesn't increase risk
    // when the system doesn't make consequential decisions
  }

  // Differential treatment is a real risk amplifier (bias potential)
  let biasBump = 0;
  let biasLabel = '';
  if (differentialTreatment === 'yes') {
    biasBump = 1;
    biasLabel = 'directly uses protected characteristics';
  } else if (differentialTreatment === 'possibly') {
    biasBump = 1;
    biasLabel = 'data could correlate with protected characteristics';
  } else if (differentialTreatment === 'unlikely') {
    biasBump = 0;
  }

  score = Math.min(4, baseScore + scaleBump + biasBump);

  if (whoAffected) {
    const parts: string[] = [`Affects ${scopeLabel}`];
    if (scaleLabel) parts.push(`at ${scaleLabel}`);
    if (severity !== 'high' && isLargeScale && isExternallyFacing) {
      parts.push(`scale dampened by ${severity} impact severity`);
    }
    if (biasLabel) parts.push(biasLabel);
    rationale = `${parts.join(', ')}.`;
  }

  const contributors: ScoreContributor[] = [];
  if (whoAffected) {
    contributors.push({
      field: 'whoAffected',
      label: 'Who is affected',
      value: whoAffected,
      contribution: `Base score ${baseScore}`,
    });
  }
  if (peopleCount) {
    contributors.push({
      field: 'peopleAffectedCount',
      label: 'Scale',
      value: peopleCount,
      contribution:
        scaleBump > 0 ? `+${scaleBump} scale bump (${severity} impact severity)` : 'No scale bump',
    });
  }
  if (differentialTreatment && biasBump > 0) {
    contributors.push({
      field: 'differentialTreatment',
      label: 'Differential treatment',
      value: differentialTreatment,
      contribution: `+${biasBump} bias risk`,
    });
  }

  return {
    id: 'affected_population',
    label: 'Affected Population',
    score,
    weight: DIMENSION_WEIGHTS.affected_population,
    rationale,
    contributors,
  };
}

// ───────────────────────────────────────────────────────────────────
// Dimension 4: Data Sensitivity
// ───────────────────────────────────────────────────────────────────

const DATA_SENSITIVITY_RANK: Record<string, number> = {
  public: 0,
  internal: 1,
  company_confidential: 2,
  customer_confidential: 3,
  personal_info: 3,
  health_info: 4,
  regulated_financial: 4,
};

export function scoreDataSensitivity(input: InherentRiskInput): DimensionScore {
  const dataSensitivity = input.dataSensitivity ?? [];

  if (dataSensitivity.length === 0) {
    return {
      id: 'data_sensitivity',
      label: 'Data Sensitivity',
      score: 0,
      weight: DIMENSION_WEIGHTS.data_sensitivity,
      rationale: 'Data sensitivity not yet specified.',
    };
  }

  // Highest-rank data class drives the score
  const ranks = dataSensitivity.map((d) => DATA_SENSITIVITY_RANK[d] ?? 0);
  const maxRank = Math.max(...ranks);
  const highest = dataSensitivity.find((d) => DATA_SENSITIVITY_RANK[d] === maxRank);

  // Multiple sensitive categories add modest amplification
  const sensitiveCount = dataSensitivity.filter((d) => (DATA_SENSITIVITY_RANK[d] ?? 0) >= 3).length;
  const multiBump = sensitiveCount >= 2 ? 0 : 0; // capped at 4 anyway

  const score = Math.min(4, maxRank + multiBump);

  let rationale = `Highest data class: ${highest?.replace(/_/g, ' ')}.`;
  if (sensitiveCount >= 2) {
    rationale += ` Multiple sensitive data categories (${sensitiveCount}) processed.`;
  }

  return {
    id: 'data_sensitivity',
    label: 'Data Sensitivity',
    score,
    weight: DIMENSION_WEIGHTS.data_sensitivity,
    rationale,
  };
}

// ───────────────────────────────────────────────────────────────────
// Dimension 5: AI Capability
// ───────────────────────────────────────────────────────────────────

export function scoreAiCapability(input: InherentRiskInput): DimensionScore {
  const aiTypes = input.aiType ?? [];
  const usesFoundationModel = input.usesFoundationModel;
  const triggers = input.highRiskTriggers ?? [];

  let score = 0;
  const rationaleParts: string[] = [];

  if (aiTypes.length === 0) {
    return {
      id: 'ai_capability',
      label: 'AI Capability',
      score: 0,
      weight: DIMENSION_WEIGHTS.ai_capability,
      rationale: 'AI type not yet specified.',
    };
  }

  // Generative AI hallucination risk
  if (aiTypes.includes('generative_ai')) {
    score = Math.max(score, 2);
    rationaleParts.push('generative AI (hallucination risk)');
  }

  // Agentic AI cascading action risk
  if (aiTypes.includes('ai_agent')) {
    score = Math.max(score, 3);
    rationaleParts.push('agentic AI (cascading action risk)');
  }

  // RAG — generative + retrieval = both hallucination and leakage
  if (aiTypes.includes('rag')) {
    score = Math.max(score, 2);
    rationaleParts.push('RAG (hallucination + information leakage)');
  }

  // Predictive scoring at scale
  if (aiTypes.includes('predictive_classification')) {
    score = Math.max(score, 1);
    rationaleParts.push('predictive scoring');
  }

  // Computer vision
  if (aiTypes.includes('computer_vision')) {
    score = Math.max(score, 2);
    rationaleParts.push('computer vision (recognition error risk)');
  }

  // Multi-modal / combined types add complexity
  const significantTypes = aiTypes.filter((t) =>
    ['generative_ai', 'ai_agent', 'rag', 'computer_vision'].includes(t),
  );
  if (significantTypes.length >= 2) {
    score = Math.min(4, score + 1);
    rationaleParts.push('multiple significant AI capabilities combined');
  }

  // Vendor-managed foundation model = less control = higher capability risk
  if (usesFoundationModel === 'yes_vendor_managed') {
    score = Math.min(4, score + 1);
    rationaleParts.push('vendor-managed foundation model (no model control)');
  }

  // Fine-tuning a foundation model adds risk
  if (triggers.includes('fine_tuning_llm')) {
    score = Math.min(4, score + 1);
    rationaleParts.push('fine-tuning foundation model');
  }

  return {
    id: 'ai_capability',
    label: 'AI Capability',
    score,
    weight: DIMENSION_WEIGHTS.ai_capability,
    rationale:
      rationaleParts.length > 0
        ? `Capabilities: ${rationaleParts.join('; ')}.`
        : 'Standard capabilities.',
  };
}

// ───────────────────────────────────────────────────────────────────
// Dimension 6: Regulatory Exposure (jurisdictional reach)
// ───────────────────────────────────────────────────────────────────

export function scoreRegulatoryExposure(input: InherentRiskInput): DimensionScore {
  const regions = input.deploymentRegions ?? [];
  const businessArea = input.businessArea ?? '';
  const triggers = input.highRiskTriggers ?? [];

  let score = 0;
  const rationaleParts: string[] = [];

  if (regions.length === 0) {
    return {
      id: 'regulatory_exposure',
      label: 'Regulatory Exposure',
      score: 0,
      weight: DIMENSION_WEIGHTS.regulatory_exposure,
      rationale: 'Deployment regions not yet specified.',
    };
  }

  // Cross-jurisdictional baseline
  const isUsOnly = regions.length === 1 && regions[0] === 'us_only';
  if (isUsOnly) {
    score = 1;
    rationaleParts.push('US-only deployment');
  } else if (regions.includes('eu_eea')) {
    score = 3;
    rationaleParts.push('EU/EEA deployment (EU AI Act + GDPR)');
  } else if (regions.length > 1) {
    score = 2;
    rationaleParts.push(`multi-region deployment (${regions.length} regions)`);
  }

  // UK deployment adds another regime
  if (regions.includes('uk')) {
    score = Math.max(score, 2);
    if (!rationaleParts.some((p) => p.includes('UK'))) rationaleParts.push('UK regime');
  }

  // Sector-specific regulatory load
  const FINANCIAL_AREAS = ['actuarial', 'claims', 'investments', 'underwriting', 'finance'];
  if (FINANCIAL_AREAS.includes(businessArea)) {
    score = Math.min(4, score + 1);
    rationaleParts.push('financial services sector (NAIC, SR 11-7, CFPB applicable)');
  }
  if (businessArea === 'hr') {
    score = Math.min(4, score + 1);
    rationaleParts.push('HR/employment sector (NYC LL144, Illinois HB3773, Colorado SB24-205)');
  }

  // EU + Annex III trigger = regulatory floor of 4
  const ANNEX_III_TRIGGERS = [
    'insurance_pricing',
    'investment_advice',
    'credit_lending',
    'hiring_workforce',
    'biometric_id',
    'emotion_detection',
  ];
  if (regions.includes('eu_eea') && triggers.some((t) => ANNEX_III_TRIGGERS.includes(t))) {
    score = 4;
    rationaleParts.push('EU + Annex III trigger (high-risk AI system under EU AI Act)');
  }

  return {
    id: 'regulatory_exposure',
    label: 'Regulatory Exposure',
    score,
    weight: DIMENSION_WEIGHTS.regulatory_exposure,
    rationale:
      rationaleParts.length > 0 ? `${rationaleParts.join('; ')}.` : 'Limited regulatory exposure.',
  };
}

// ───────────────────────────────────────────────────────────────────
// Dimension 7: Reversibility / Worst Outcome
// ───────────────────────────────────────────────────────────────────

export function scoreReversibility(input: InherentRiskInput): DimensionScore {
  const worstOutcome = input.worstOutcome;

  let score = 0;
  let rationale = 'Worst outcome not yet specified.';

  switch (worstOutcome) {
    case 'minor':
      score = 0;
      rationale = 'Minimal impact — easily caught and corrected.';
      break;
    case 'moderate':
      score = 1;
      rationale = 'Moderate impact — wrong information, individual inconvenience.';
      break;
    case 'significant':
      score = 3;
      rationale =
        'Significant impact — financial harm, security vulnerabilities, or denied access.';
      break;
    case 'serious':
      score = 4;
      rationale = 'Serious impact — widespread or hard to reverse.';
      break;
  }

  return {
    id: 'reversibility',
    label: 'Reversibility & Severity',
    score,
    weight: DIMENSION_WEIGHTS.reversibility,
    rationale,
  };
}

// ───────────────────────────────────────────────────────────────────
// Aggregator
// ───────────────────────────────────────────────────────────────────

/** Compute all 7 dimensions in order */
export function computeAllDimensions(input: InherentRiskInput): DimensionScore[] {
  return [
    scoreDecisionDomain(input),
    scoreDecisionAuthority(input),
    scoreAffectedPopulation(input),
    scoreDataSensitivity(input),
    scoreAiCapability(input),
    scoreRegulatoryExposure(input),
    scoreReversibility(input),
  ];
}

/**
 * Calculate the weighted base score (0-100) from dimensions.
 * Each dimension scores 0-4; multiplied by weight, summed, scaled to 100.
 */
export function calculateBaseScore(dimensions: DimensionScore[]): number {
  const weightedSum = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  // weighted sum is 0-4; scale to 0-100
  return Math.round((weightedSum / 4) * 100);
}
