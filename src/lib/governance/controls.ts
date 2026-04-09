/**
 * Controls library — the operationalization layer that turns "this framework
 * applies" into "here are the specific obligations and the evidence each one
 * requires."
 *
 * Each Control entry represents a discrete, citable obligation from a
 * recognized framework. It names the evidence categories that satisfy it,
 * the role responsible, and the review cadence that keeps it current.
 *
 * Coverage in this initial release (deliberately partial — see TODO at bottom):
 *   • EU AI Act high-risk obligations (Articles 9, 11, 12, 14, 15, 27)
 *   • EU AI Act transparency obligations (Article 50)
 *   • GDPR Article 22 (automated decision-making) + Article 35 (DPIA)
 *   • NIST AI RMF — GOVERN, MAP, MEASURE, MANAGE skeleton subcategories
 *   • SR 11-7 model risk management essentials
 *   • ISO 42001 AIMS clauses 6 (planning) and 8 (operation)
 *
 * NOT YET MAPPED (logged as TODO at the bottom of this file):
 *   • NYC Local Law 144, Colorado SB24-205, NAIC Model Bulletin
 *   • HIPAA AI-specific guidance
 *   • ISO 42001 Annex A controls (full)
 *   • EU AI Act Articles 51-55 (general purpose AI)
 */

import type { EvidenceCategory } from './types';

/** A discrete framework requirement that the platform tracks */
export interface Control {
  /** Stable id (e.g., "eu-ai-act-art-9") */
  id: string;
  /** Framework this control belongs to */
  framework: string;
  /** Citation / reference within the framework */
  citation: string;
  /** Short title */
  title: string;
  /** What the requirement actually demands */
  requirement: string;
  /**
   * Evidence categories that satisfy this control. Any one of them being
   * collected and attested counts as satisfying the control.
   */
  acceptableEvidence: EvidenceCategory[];
  /** Role responsible for producing the evidence */
  responsibleRole:
    | 'use_case_owner'
    | 'risk_officer'
    | 'data_protection_officer'
    | 'security'
    | 'legal'
    | 'model_validator';
  /** How often this control's evidence must be refreshed */
  refreshFrequency: 'annual' | 'semi_annual' | 'quarterly' | 'on_change';
  /** Whether this control is mandatory or recommended */
  severity: 'mandatory' | 'recommended';
  /** Optional URL to the full framework text */
  citationUrl?: string;
}

// ─── EU AI Act high-risk obligations (Articles 9–15, 27) ─────────────

const EU_AI_ACT_CONTROLS: Control[] = [
  {
    id: 'eu-ai-act-art-9',
    framework: 'EU AI Act',
    citation: 'Article 9',
    title: 'Risk Management System',
    requirement:
      'Establish, implement, document, and maintain a risk management system as a continuous, iterative process throughout the entire lifecycle of the high-risk AI system.',
    acceptableEvidence: ['risk_management_plan'],
    responsibleRole: 'risk_officer',
    refreshFrequency: 'annual',
    severity: 'mandatory',
    citationUrl: 'https://artificialintelligenceact.eu/article/9/',
  },
  {
    id: 'eu-ai-act-art-10',
    framework: 'EU AI Act',
    citation: 'Article 10',
    title: 'Data and Data Governance',
    requirement:
      'Training, validation, and test datasets shall be subject to data governance and management practices appropriate for the intended purpose. Datasets shall be relevant, sufficiently representative, and to the best extent possible, free of errors and complete.',
    acceptableEvidence: ['dataset_sheet', 'technical_documentation'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'on_change',
    severity: 'mandatory',
    citationUrl: 'https://artificialintelligenceact.eu/article/10/',
  },
  {
    id: 'eu-ai-act-art-11',
    framework: 'EU AI Act',
    citation: 'Article 11 / Annex IV',
    title: 'Technical Documentation',
    requirement:
      'Technical documentation shall be drawn up before the system is placed on the market or put into service, demonstrating compliance with high-risk requirements.',
    acceptableEvidence: ['technical_documentation', 'model_card'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'on_change',
    severity: 'mandatory',
    citationUrl: 'https://artificialintelligenceact.eu/article/11/',
  },
  {
    id: 'eu-ai-act-art-12',
    framework: 'EU AI Act',
    citation: 'Article 12',
    title: 'Record-Keeping (Automated Logging)',
    requirement:
      'High-risk AI systems shall technically allow for the automatic recording of events (logs) over the lifetime of the system.',
    acceptableEvidence: ['monitoring_plan', 'technical_documentation'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'annual',
    severity: 'mandatory',
    citationUrl: 'https://artificialintelligenceact.eu/article/12/',
  },
  {
    id: 'eu-ai-act-art-14',
    framework: 'EU AI Act',
    citation: 'Article 14',
    title: 'Human Oversight',
    requirement:
      'High-risk AI systems shall be designed and developed in such a way that they can be effectively overseen by natural persons during the period in which they are in use.',
    acceptableEvidence: ['human_oversight_design'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'annual',
    severity: 'mandatory',
    citationUrl: 'https://artificialintelligenceact.eu/article/14/',
  },
  {
    id: 'eu-ai-act-art-15',
    framework: 'EU AI Act',
    citation: 'Article 15',
    title: 'Accuracy, Robustness, Cybersecurity',
    requirement:
      'High-risk AI systems shall be designed and developed in such a way that they achieve an appropriate level of accuracy, robustness, and cybersecurity, and perform consistently in those respects throughout their lifecycle.',
    acceptableEvidence: ['robustness_test', 'security_assessment', 'validation_report'],
    responsibleRole: 'model_validator',
    refreshFrequency: 'semi_annual',
    severity: 'mandatory',
    citationUrl: 'https://artificialintelligenceact.eu/article/15/',
  },
  {
    id: 'eu-ai-act-art-27',
    framework: 'EU AI Act',
    citation: 'Article 27',
    title: 'Fundamental Rights Impact Assessment',
    requirement:
      'Before deploying a high-risk AI system referred to in Article 6(2), with the exception of those intended for use in critical infrastructure, deployers that are bodies governed by public law, private operators providing public services, and certain financial-services/creditworthiness operators shall perform a fundamental rights impact assessment.',
    acceptableEvidence: ['fria'],
    responsibleRole: 'legal',
    refreshFrequency: 'annual',
    severity: 'mandatory',
    citationUrl: 'https://artificialintelligenceact.eu/article/27/',
  },
  {
    id: 'eu-ai-act-art-50',
    framework: 'EU AI Act',
    citation: 'Article 50',
    title: 'Transparency Obligations for AI Systems Interacting with People',
    requirement:
      'Providers shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural persons concerned are informed that they are interacting with an AI system.',
    acceptableEvidence: ['attestation', 'technical_documentation'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'annual',
    severity: 'mandatory',
    citationUrl: 'https://artificialintelligenceact.eu/article/50/',
  },
];

// ─── GDPR ────────────────────────────────────────────────────────────

const GDPR_CONTROLS: Control[] = [
  {
    id: 'gdpr-art-22',
    framework: 'GDPR',
    citation: 'Article 22',
    title: 'Automated Individual Decision-Making',
    requirement:
      'The data subject shall have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning him or her or similarly significantly affects him or her. Where such processing is permitted, suitable measures must be implemented to safeguard the data subject\u2019s rights, including the right to obtain human intervention.',
    acceptableEvidence: ['human_oversight_design', 'attestation'],
    responsibleRole: 'data_protection_officer',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'gdpr-art-35',
    framework: 'GDPR',
    citation: 'Article 35',
    title: 'Data Protection Impact Assessment',
    requirement:
      'Where a type of processing, in particular using new technologies, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data.',
    acceptableEvidence: ['dpia'],
    responsibleRole: 'data_protection_officer',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
];

// ─── NIST AI RMF (subcategory skeleton) ─────────────────────────────

const NIST_RMF_CONTROLS: Control[] = [
  {
    id: 'nist-rmf-govern-1-1',
    framework: 'NIST AI RMF 1.0',
    citation: 'GOVERN 1.1',
    title: 'Legal & Regulatory Requirements Understood',
    requirement:
      'Legal and regulatory requirements involving AI are understood, managed, and documented.',
    acceptableEvidence: ['risk_management_plan', 'attestation'],
    responsibleRole: 'legal',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'nist-rmf-map-1-1',
    framework: 'NIST AI RMF 1.0',
    citation: 'MAP 1.1',
    title: 'Context Established and Understood',
    requirement:
      'Intended purposes, potentially beneficial uses, context-specific laws, norms, and expectations, and prospective settings in which the AI system will be deployed are understood and documented.',
    acceptableEvidence: ['model_card', 'technical_documentation'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'on_change',
    severity: 'mandatory',
  },
  {
    id: 'nist-rmf-measure-2-7',
    framework: 'NIST AI RMF 1.0',
    citation: 'MEASURE 2.7',
    title: 'AI System Security and Resilience',
    requirement:
      'AI system security and resilience — as identified in the MAP function — are evaluated and documented.',
    acceptableEvidence: ['security_assessment', 'robustness_test'],
    responsibleRole: 'security',
    refreshFrequency: 'semi_annual',
    severity: 'mandatory',
  },
  {
    id: 'nist-rmf-measure-2-11',
    framework: 'NIST AI RMF 1.0',
    citation: 'MEASURE 2.11',
    title: 'Fairness and Bias Evaluated',
    requirement:
      'Fairness and bias \u2014 as identified in the MAP function \u2014 are evaluated and results are documented.',
    acceptableEvidence: ['bias_audit'],
    responsibleRole: 'model_validator',
    refreshFrequency: 'semi_annual',
    severity: 'mandatory',
  },
  {
    id: 'nist-rmf-manage-4-1',
    framework: 'NIST AI RMF 1.0',
    citation: 'MANAGE 4.1',
    title: 'Post-Deployment Monitoring',
    requirement:
      'Post-deployment AI system monitoring plans are implemented, including mechanisms for capturing and evaluating input from users and other relevant AI actors, appeal and override, decommissioning, incident response, and change management.',
    acceptableEvidence: ['monitoring_plan', 'incident_response_plan'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'quarterly',
    severity: 'mandatory',
  },
];

// ─── SR 11-7 (Model Risk Management for Banks) ──────────────────────

const SR_11_7_CONTROLS: Control[] = [
  {
    id: 'sr-11-7-validation',
    framework: 'Federal Reserve SR 11-7',
    citation: 'Model Validation',
    title: 'Independent Model Validation',
    requirement:
      'An effective validation framework should include three core elements: evaluation of conceptual soundness, ongoing monitoring, and outcomes analysis. Validation should be conducted by staff with the necessary knowledge, skills, and expertise who are independent of model development.',
    acceptableEvidence: ['validation_report'],
    responsibleRole: 'model_validator',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'sr-11-7-ongoing-monitoring',
    framework: 'Federal Reserve SR 11-7',
    citation: 'Ongoing Monitoring',
    title: 'Ongoing Performance Monitoring',
    requirement:
      'Ongoing monitoring is essential to evaluate whether changes in products, exposures, activities, clients, or market conditions necessitate adjustment, redevelopment, or replacement of the model and to verify that any extension of the model beyond its original scope is valid.',
    acceptableEvidence: ['monitoring_plan'],
    responsibleRole: 'model_validator',
    refreshFrequency: 'quarterly',
    severity: 'mandatory',
  },
];

// ─── ISO 42001 AIMS ──────────────────────────────────────────────────

const ISO_42001_CONTROLS: Control[] = [
  {
    id: 'iso-42001-6-1-2',
    framework: 'ISO/IEC 42001:2023',
    citation: 'Clause 6.1.2',
    title: 'AI Risk Assessment',
    requirement:
      'The organization shall define and apply an AI risk assessment process that identifies, analyses, and evaluates AI risks relevant to the organization\u2019s context and the intended uses of its AI systems.',
    acceptableEvidence: ['risk_management_plan'],
    responsibleRole: 'risk_officer',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'iso-42001-8-3',
    framework: 'ISO/IEC 42001:2023',
    citation: 'Clause 8.3',
    title: 'AI System Impact Assessment',
    requirement:
      'The organization shall assess and document the potential consequences for individuals, groups of individuals, and societies that may result from the development, provision, or use of AI systems.',
    acceptableEvidence: ['fria', 'dpia'],
    responsibleRole: 'risk_officer',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
];

// ─── P11: US domain-specific frameworks ──────────────────────────────

const ECOA_FAIR_HOUSING_CONTROLS: Control[] = [
  {
    id: 'ecoa-disparate-impact',
    framework: 'ECOA / Fair Housing',
    citation: 'ECOA §701 / FHA §3604-3606',
    title: 'Disparate Impact Testing',
    requirement:
      'Credit and housing decisions using AI models must be tested for disparate impact across protected classes (race, color, religion, national origin, sex, familial status, disability). Results must be documented and adverse impacts mitigated.',
    acceptableEvidence: ['bias_audit', 'validation_report'],
    responsibleRole: 'model_validator',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'ecoa-adverse-action',
    framework: 'ECOA / Fair Housing',
    citation: 'ECOA §701(d) / Reg B §1002.9',
    title: 'Adverse Action Notice Requirements',
    requirement:
      'When a credit application is denied or terms are changed adversely, the creditor must provide specific reasons. AI-driven decisions must be explainable enough to generate compliant adverse action notices.',
    acceptableEvidence: ['technical_documentation', 'human_oversight_design'],
    responsibleRole: 'legal',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
];

const SEC_FINRA_CONTROLS: Control[] = [
  {
    id: 'sec-finra-suitability',
    framework: 'SEC / FINRA',
    citation: 'FINRA Rule 2111 / Reg BI',
    title: 'Suitability and Best Interest Obligation',
    requirement:
      'AI systems that recommend investments or provide financial advice must ensure recommendations are in the best interest of the customer, considering their risk tolerance, financial situation, and investment objectives.',
    acceptableEvidence: ['validation_report', 'human_oversight_design'],
    responsibleRole: 'risk_officer',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'sec-finra-books-records',
    framework: 'SEC / FINRA',
    citation: 'SEC Rule 17a-4 / FINRA Rule 4511',
    title: 'Books and Records Preservation',
    requirement:
      'All AI-generated investment research, recommendations, and communications must be preserved as business records for the required retention period (typically 3-6 years).',
    acceptableEvidence: ['monitoring_plan', 'technical_documentation'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
];

const REG_E_EFTA_CONTROLS: Control[] = [
  {
    id: 'reg-e-error-resolution',
    framework: 'Reg E / EFTA',
    citation: 'Reg E §1005.11',
    title: 'Error Resolution Procedures',
    requirement:
      'When AI-driven fraud detection triggers account actions (freezes, blocks, reversals), the institution must provide error resolution procedures including investigation within 10 business days and provisional credit.',
    acceptableEvidence: ['incident_response_plan', 'human_oversight_design'],
    responsibleRole: 'use_case_owner',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'reg-e-unauthorized-transfers',
    framework: 'Reg E / EFTA',
    citation: 'Reg E §1005.6',
    title: 'Unauthorized Transfer Liability Limits',
    requirement:
      'AI systems that freeze or reverse transactions must comply with consumer liability limits for unauthorized transfers. False positive fraud flags that incorrectly block legitimate transactions create regulatory exposure.',
    acceptableEvidence: ['robustness_test', 'monitoring_plan'],
    responsibleRole: 'risk_officer',
    refreshFrequency: 'semi_annual',
    severity: 'mandatory',
  },
];

const FTC_ACT_CONTROLS: Control[] = [
  {
    id: 'ftc-section-5-deception',
    framework: 'FTC Act Section 5',
    citation: '15 U.S.C. §45(a)',
    title: 'AI Disclosure and Deceptive Practices',
    requirement:
      'Customer-facing AI systems must not engage in deceptive practices. Users must be informed when they are interacting with AI-generated content. Marketing claims about AI capabilities must be substantiated.',
    acceptableEvidence: ['attestation', 'technical_documentation'],
    responsibleRole: 'legal',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'ftc-section-5-unfairness',
    framework: 'FTC Act Section 5',
    citation: '15 U.S.C. §45(n)',
    title: 'AI Unfairness Prevention',
    requirement:
      'AI systems must not cause substantial injury to consumers that is not reasonably avoidable and not outweighed by countervailing benefits. Applies to AI-driven pricing, recommendations, and content generation.',
    acceptableEvidence: ['bias_audit', 'risk_management_plan'],
    responsibleRole: 'risk_officer',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
];

const CFPB_OCC_CONTROLS: Control[] = [
  {
    id: 'cfpb-occ-model-risk',
    framework: 'CFPB / OCC',
    citation: 'OCC Bulletin 2011-12 / CFPB Circular 2022-03',
    title: 'AI Model Risk in Credit Decisions',
    requirement:
      'Financial institutions using AI/ML for credit decisions must comply with model risk management guidance (OCC 2011-12). CFPB requires that lenders using AI provide specific and accurate adverse action reasons, not generic explanations.',
    acceptableEvidence: ['validation_report', 'technical_documentation'],
    responsibleRole: 'model_validator',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
  {
    id: 'cfpb-occ-fair-lending',
    framework: 'CFPB / OCC',
    citation: 'CFPB Circular 2023-03',
    title: 'Fair Lending Compliance for AI',
    requirement:
      'AI used in underwriting or pricing must be evaluated for fair lending compliance. Institutions must document how AI models were tested for discriminatory outcomes and what steps were taken to mitigate identified disparities.',
    acceptableEvidence: ['bias_audit', 'risk_management_plan'],
    responsibleRole: 'risk_officer',
    refreshFrequency: 'semi_annual',
    severity: 'mandatory',
  },
  {
    id: 'cfpb-occ-proxy-variable-testing',
    framework: 'CFPB / OCC',
    citation: 'CFPB Circular 2022-03',
    title: 'Proxy Variable Disparate Impact Testing',
    requirement:
      'When AI/ML models use data features that correlate with protected class characteristics (geolocation, device fingerprint, zip code, IP address, browser type), institutions must test for disparate impact through those proxy variables and document the results. Feature selection rationale must be recorded.',
    acceptableEvidence: ['bias_audit', 'validation_report'],
    responsibleRole: 'model_validator',
    refreshFrequency: 'semi_annual',
    severity: 'mandatory',
    citationUrl:
      'https://www.consumerfinance.gov/compliance/circulars/circular-2022-03-adverse-action-notification-requirements-in-connection-with-credit-decisions-based-on-complex-algorithms/',
  },
  {
    id: 'cfpb-occ-adverse-action-explainability',
    framework: 'CFPB / OCC',
    citation: 'ECOA §202.9 / CFPB Circular 2022-03',
    title: 'Adverse Action Notice Requirements',
    requirement:
      'When AI-driven decisions result in adverse action (denial, account freeze, rate increase), the institution must provide specific and accurate reasons. Generic explanations referencing "the algorithm" or "risk score" are insufficient. Each adverse action factor must be traceable to a specific model input.',
    acceptableEvidence: ['technical_documentation', 'human_oversight_design'],
    responsibleRole: 'legal',
    refreshFrequency: 'annual',
    severity: 'mandatory',
  },
];

// ─── Master library ─────────────────────────────────────────────────

export const CONTROLS_LIBRARY: Control[] = [
  ...EU_AI_ACT_CONTROLS,
  ...GDPR_CONTROLS,
  ...NIST_RMF_CONTROLS,
  ...SR_11_7_CONTROLS,
  ...ISO_42001_CONTROLS,
  ...ECOA_FAIR_HOUSING_CONTROLS,
  ...SEC_FINRA_CONTROLS,
  ...REG_E_EFTA_CONTROLS,
  ...FTC_ACT_CONTROLS,
  ...CFPB_OCC_CONTROLS,
];

// ─── Lookups & helpers ──────────────────────────────────────────────

/** Find a control by id */
export function getControl(id: string): Control | undefined {
  return CONTROLS_LIBRARY.find((c) => c.id === id);
}

/** All controls for a given framework name */
export function controlsForFramework(framework: string): Control[] {
  return CONTROLS_LIBRARY.filter((c) => c.framework === framework);
}

/** All controls whose acceptable evidence includes a given category */
export function controlsForEvidenceCategory(category: EvidenceCategory): Control[] {
  return CONTROLS_LIBRARY.filter((c) => c.acceptableEvidence.includes(category));
}

/**
 * Determine which controls apply to a use case given its detected frameworks.
 *
 * @param frameworkNames List of framework names from inherent risk's
 *                       `applicableFrameworks` (e.g., ["EU AI Act", "GDPR"])
 * @param euAiActTier    The EU AI Act tier — only "high" pulls in EU AI Act
 *                       Articles 9-15 + 27. Other tiers get only the
 *                       transparency obligations (Article 50).
 * @returns Deduplicated list of Control objects that apply
 */
export function applicableControls(frameworkNames: string[], euAiActTier?: string): Control[] {
  const applicable = new Set<string>();
  const result: Control[] = [];

  for (const name of frameworkNames) {
    if (name === 'EU AI Act') {
      // High-risk pulls in the full Article 9-15 + 27 set
      const isHighRisk = euAiActTier === 'high';
      for (const c of EU_AI_ACT_CONTROLS) {
        // Article 50 (transparency) applies to all tiers above minimal;
        // Articles 9-15 + 27 only to high-risk
        const isTransparency = c.id === 'eu-ai-act-art-50';
        if (isTransparency || isHighRisk) {
          if (!applicable.has(c.id)) {
            applicable.add(c.id);
            result.push(c);
          }
        }
      }
    } else {
      const fwControls = controlsForFramework(name);
      for (const c of fwControls) {
        if (!applicable.has(c.id)) {
          applicable.add(c.id);
          result.push(c);
        }
      }
    }
  }

  return result;
}

/**
 * Group controls by framework for display.
 */
export function groupControlsByFramework(controls: Control[]): Record<string, Control[]> {
  const groups: Record<string, Control[]> = {};
  for (const c of controls) {
    if (!groups[c.framework]) groups[c.framework] = [];
    groups[c.framework].push(c);
  }
  return groups;
}

/**
 * TODO — control families not yet mapped in this initial release.
 * Each one is a discrete content effort that requires regulatory expertise.
 *
 *   • NYC Local Law 144 (Automated Employment Decision Tools):
 *       - Annual independent bias audit
 *       - Audit results publication
 *       - Candidate notification
 *
 *   • Colorado SB24-205 (algorithmic discrimination in insurance/HR):
 *       - Risk management program
 *       - Annual impact assessment
 *
 *   • NAIC Model Bulletin (insurance AI):
 *       - Documented governance program
 *       - Third-party AI vendor oversight
 *
 *   • HIPAA AI-specific guidance (HHS/OCR):
 *       - Section 1557 nondiscrimination
 *       - Risk analysis under Security Rule
 *
 *   • ISO 42001 Annex A controls (full):
 *       - 38 controls across 9 categories — currently only 2 are mapped
 *
 *   • EU AI Act Articles 51-55 (general purpose AI obligations):
 *       - Training data summary
 *       - Capability documentation
 *       - Copyright compliance
 *       - Systemic risk evaluation (>10^25 FLOPS)
 *
 *   • SOC 2 trust service criteria mapping (CC, PI, A, C, P)
 */
