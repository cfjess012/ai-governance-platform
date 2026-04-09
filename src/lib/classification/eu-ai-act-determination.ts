/**
 * EU AI Act Classification Engine — Assessment-based.
 * Classifies use cases based on pre-production risk assessment answers.
 */

export interface EuAssessmentInput {
  deploymentRegions: string[];
  businessActivities: string[];
  replacesHumanDecisions: string;
  automatesExternalDecisions: string;
  monitorsHumanActivity: string;
  usesGenAi: string;
  customerFacingOutputs: string;
  hasExternalUsers: string;
  interactsWithPii: string;
  dataClassification: string;
}

export type EuAiActTier = 'prohibited' | 'high' | 'limited' | 'minimal';

export interface EuAiActTrigger {
  category: string;
  reason: string;
  annexRef: string;
}

export interface EuAiActAssessmentResult {
  tier: EuAiActTier;
  triggers: EuAiActTrigger[];
  obligations: string[];
  hasEuNexus: boolean;
  disclaimer: string;
}

function hasEuNexus(regions: string[]): boolean {
  return regions.includes('eu');
}

// Annex III high-risk activity mapping
const ANNEX_III_MAPPINGS: Record<string, { category: string; annexRef: string }> = {
  insurance_decisions: {
    category: 'Creditworthiness & Insurance',
    annexRef: 'Annex III #5a',
  },
  investment_decisions: {
    category: 'Financial Services',
    annexRef: 'Annex III #5b',
  },
  hr_automated_hiring: {
    category: 'Employment, Workers Management',
    annexRef: 'Annex III #4',
  },
  pricing_underwriting: {
    category: 'Creditworthiness & Insurance',
    annexRef: 'Annex III #5a',
  },
  hr_workforce_monitoring: {
    category: 'Employment, Workers Management',
    annexRef: 'Annex III #4',
  },
};

function getHighRiskObligations(): string[] {
  return [
    'Risk management system (Article 9)',
    'Data governance & quality requirements (Article 10)',
    'Technical documentation (Article 11)',
    'Record-keeping / logging (Article 12)',
    'Transparency and provision of information to deployers (Article 13)',
    'Human oversight measures (Article 14)',
    'Accuracy, robustness and cybersecurity (Article 15)',
    'Conformity assessment before deployment',
    'Registration in EU database',
    'Post-market monitoring',
  ];
}

function getLimitedRiskObligations(): string[] {
  return [
    'Transparency obligations (Article 50)',
    'Disclose AI-generated content to users',
    'Mark AI-generated/manipulated content',
    'Inform individuals interacting with AI system',
  ];
}

export function classifyEuAiActAssessment(input: EuAssessmentInput): EuAiActAssessmentResult {
  const euNexus = hasEuNexus(input.deploymentRegions);
  const triggers: EuAiActTrigger[] = [];

  if (!euNexus) {
    return {
      tier: 'minimal',
      triggers: [],
      obligations: [],
      hasEuNexus: false,
      disclaimer:
        'No EU nexus detected. EU AI Act classification is informational only. Monitor for changes if deployment scope expands.',
    };
  }

  // ── Check Annex III high-risk activities ──
  for (const activity of input.businessActivities) {
    const mapping = ANNEX_III_MAPPINGS[activity];
    if (mapping) {
      triggers.push({
        category: mapping.category,
        reason: `Business activity "${activity}" maps to ${mapping.annexRef}`,
        annexRef: mapping.annexRef,
      });
    }
  }

  // Additional high-risk triggers
  if (
    input.replacesHumanDecisions === 'yes' &&
    input.businessActivities.some((a) => ANNEX_III_MAPPINGS[a])
  ) {
    triggers.push({
      category: 'Automated Decision-Making',
      reason: 'AI replaces human decisions in regulated business activity',
      annexRef: 'Article 6(2)',
    });
  }

  if (
    input.monitorsHumanActivity === 'yes' &&
    input.businessActivities.some(
      (a) => a === 'hr_automated_hiring' || a === 'hr_workforce_monitoring',
    )
  ) {
    triggers.push({
      category: 'Workplace Surveillance',
      reason: 'AI monitors human activity in employment context',
      annexRef: 'Annex III #4',
    });
  }

  if (
    input.automatesExternalDecisions === 'yes' &&
    (input.interactsWithPii === 'yes' || input.dataClassification === 'customer_confidential')
  ) {
    triggers.push({
      category: 'Automated External Decisions',
      reason: 'Automated decisions on external stakeholders using sensitive data',
      annexRef: 'Article 6(2)',
    });
  }

  // P1: EU AI Act Annex III Category 5(b) — autonomous decisions affecting
  // consumer financial account access in EU/EEA deployment.
  // Citation: Regulation (EU) 2024/1689, Annex III §5(b): "AI systems intended
  // to be used to evaluate the creditworthiness of natural persons or establish
  // their credit score, with the exception of AI systems used for the purpose
  // of detecting financial fraud."
  if (
    euNexus &&
    input.automatesExternalDecisions === 'yes' &&
    input.businessActivities.some((a) =>
      ['insurance_decisions', 'investment_decisions', 'pricing_underwriting'].includes(a),
    )
  ) {
    triggers.push({
      category: 'Financial Account Access',
      reason:
        'EU/EEA deployment with autonomous decisions affecting consumer financial account access — Annex III Category 5(b)',
      annexRef: 'Annex III #5(b)',
    });
  }

  // ── Determine tier ──
  if (triggers.length > 0) {
    return {
      tier: 'high',
      triggers,
      obligations: getHighRiskObligations(),
      hasEuNexus: true,
      disclaimer:
        'This is an automated classification and should be reviewed by legal/compliance for final determination. A Fundamental Rights Impact Assessment may be required.',
    };
  }

  // ── Limited risk (Article 50) ──
  if (
    input.usesGenAi === 'yes' ||
    input.customerFacingOutputs === 'yes' ||
    input.hasExternalUsers === 'yes'
  ) {
    return {
      tier: 'limited',
      triggers: [
        {
          category: 'Transparency',
          reason:
            input.usesGenAi === 'yes'
              ? 'Generative AI system — transparency obligations apply'
              : 'System interacts with external users — disclosure required',
          annexRef: 'Article 50',
        },
      ],
      obligations: getLimitedRiskObligations(),
      hasEuNexus: true,
      disclaimer:
        'This is an automated classification. Limited Risk systems have transparency obligations under Article 50.',
    };
  }

  // ── Minimal risk ──
  return {
    tier: 'minimal',
    triggers: [],
    obligations: [],
    hasEuNexus: true,
    disclaimer:
      'No high-risk indicators detected. Minimal risk classification under EU AI Act. Voluntary codes of conduct may still apply.',
  };
}
