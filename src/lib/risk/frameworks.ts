/**
 * Regulatory framework applicability detection.
 *
 * Given intake answers, determine which AI governance frameworks apply
 * to this use case. The result is shown as "This case is governed by..."
 * and is the audit trail's first line of defense.
 */

import type { ApplicableFramework, InherentRiskInput } from './types';

/**
 * Detect which regulatory frameworks apply to the use case based on intake answers.
 * This is INDEPENDENT of the tier — even Low-tier cases may have framework obligations.
 */
export function detectApplicableFrameworks(input: InherentRiskInput): ApplicableFramework[] {
  const frameworks: ApplicableFramework[] = [];
  const triggers = input.highRiskTriggers ?? [];
  const regions = input.deploymentRegions ?? [];
  const businessArea = input.businessArea;
  const dataSensitivity = input.dataSensitivity ?? [];
  const oversight = input.humanOversight;
  const aiTypes = input.aiType ?? [];
  const whoAffected = input.whoAffected;

  // ── EU AI Act ──
  if (regions.includes('eu_eea')) {
    // Check for prohibited practices first
    if (triggers.some((t) => ['biometric_id', 'emotion_detection'].includes(t))) {
      frameworks.push({
        framework: 'EU AI Act',
        reference: 'Article 5 (Prohibited Practices)',
        applicabilityReason:
          'Practices involving biometric ID or emotion detection are prohibited or heavily restricted in the EU.',
        obligationType: 'documentation',
      });
    }

    // Annex III high-risk
    const annexIiiTriggers = triggers.filter((t) =>
      ['insurance_pricing', 'investment_advice', 'credit_lending', 'hiring_workforce'].includes(t),
    );
    if (annexIiiTriggers.length > 0) {
      frameworks.push({
        framework: 'EU AI Act',
        reference: 'Article 6 + Annex III (High-Risk AI Systems)',
        applicabilityReason: `Activities ${annexIiiTriggers.join(', ')} are listed in Annex III as high-risk areas.`,
        obligationType: 'registration',
      });

      frameworks.push({
        framework: 'EU AI Act',
        reference: 'Article 27 (Fundamental Rights Impact Assessment)',
        applicabilityReason:
          'High-risk AI systems used by public authorities or for essential private services require an FRIA.',
        obligationType: 'impact_assessment',
      });
    }

    // Article 50 transparency for GenAI
    if (aiTypes.includes('generative_ai') || aiTypes.includes('rag')) {
      frameworks.push({
        framework: 'EU AI Act',
        reference: 'Article 50 (Transparency Obligations)',
        applicabilityReason:
          'Generative AI systems must clearly label AI-generated content and inform users they are interacting with AI.',
        obligationType: 'transparency',
      });
    }

    // Foundation model obligations
    if (input.usesFoundationModel === 'yes' || input.usesFoundationModel === 'yes_vendor_managed') {
      frameworks.push({
        framework: 'EU AI Act',
        reference: 'Articles 51-55 (General Purpose AI Models)',
        applicabilityReason:
          'Use of foundation/general-purpose AI models in the EU requires documentation of model provenance and training data.',
        obligationType: 'documentation',
      });
    }
  }

  // ── GDPR ──
  if (regions.includes('eu_eea') || regions.includes('uk')) {
    const hasPii = dataSensitivity.some((d) =>
      ['personal_info', 'health_info', 'regulated_financial', 'customer_confidential'].includes(d),
    );
    if (hasPii) {
      frameworks.push({
        framework: 'GDPR',
        reference: 'Chapter II (Principles)',
        applicabilityReason:
          'Processing personal data of EU/UK residents requires lawful basis, data minimization, purpose limitation.',
        obligationType: 'documentation',
      });

      // Article 22 if automated decision-making
      const isAutomated = oversight === 'fully_autonomous' || oversight === 'spot_check';
      if (
        isAutomated &&
        (whoAffected === 'external' || whoAffected === 'general_public' || whoAffected === 'both')
      ) {
        frameworks.push({
          framework: 'GDPR',
          reference: 'Article 22 (Automated Individual Decision-Making)',
          applicabilityReason:
            'Solely automated decisions about individuals with legal or similarly significant effects require explicit legal basis and right to human review.',
          obligationType: 'human_oversight',
        });
      }

      // DPIA likely required
      const hasSensitive = dataSensitivity.some((d) =>
        ['health_info', 'regulated_financial'].includes(d),
      );
      if (hasSensitive || isAutomated) {
        frameworks.push({
          framework: 'GDPR',
          reference: 'Article 35 (Data Protection Impact Assessment)',
          applicabilityReason:
            'Large-scale processing of sensitive personal data or automated decision-making requires a DPIA.',
          obligationType: 'impact_assessment',
        });
      }
    }
  }

  // ── NIST AI RMF (always applicable as best practice) ──
  frameworks.push({
    framework: 'NIST AI RMF 1.0',
    reference: 'GOVERN, MAP, MEASURE, MANAGE Functions',
    applicabilityReason:
      'NIST AI Risk Management Framework applies as best-practice baseline for all AI systems.',
    obligationType: 'documentation',
  });

  // ── NYC Local Law 144 ──
  const isHrOrHiring = triggers.includes('hiring_workforce') || businessArea === 'hr';
  const isUsDeployment = regions.includes('us_only') || regions.length > 0;
  if (isHrOrHiring && isUsDeployment) {
    frameworks.push({
      framework: 'NYC Local Law 144',
      reference: 'NYC Admin Code §20-870 (AEDT)',
      applicabilityReason:
        'Automated employment decision tools used in NYC require annual independent bias audit and candidate notification.',
      obligationType: 'bias_audit',
    });
  }

  // ── Colorado AI Act ──
  const consequentialDomains =
    triggers.some((t) =>
      ['insurance_pricing', 'investment_advice', 'credit_lending', 'hiring_workforce'].includes(t),
    ) ||
    ['actuarial', 'claims', 'investments', 'underwriting', 'finance', 'hr'].includes(
      businessArea ?? '',
    );
  const affectsExternalPeople =
    whoAffected === 'external' || whoAffected === 'both' || whoAffected === 'general_public';
  if (consequentialDomains && affectsExternalPeople && isUsDeployment) {
    frameworks.push({
      framework: 'Colorado AI Act',
      reference: 'SB 24-205 §6-1-1701',
      applicabilityReason:
        'AI making consequential decisions about consumers in Colorado requires algorithmic impact assessment, consumer notice, and right to appeal (effective Feb 2026).',
      obligationType: 'impact_assessment',
    });
  }

  // ── NAIC Model Bulletin (insurance) ──
  if (
    triggers.includes('insurance_pricing') ||
    ['actuarial', 'underwriting', 'claims'].includes(businessArea ?? '')
  ) {
    frameworks.push({
      framework: 'NAIC Model Bulletin',
      reference: 'Use of AI Systems by Insurers (2023)',
      applicabilityReason:
        'Insurance AI for underwriting, pricing, claims, or fraud detection must follow NAIC governance framework and unfair discrimination protections.',
      obligationType: 'documentation',
    });
  }

  // ── SR 11-7 (Federal Reserve MRM) ──
  if (
    ['investments', 'finance', 'risk_management'].includes(businessArea ?? '') &&
    aiTypes.some((t) => ['predictive_classification', 'generative_ai'].includes(t))
  ) {
    frameworks.push({
      framework: 'Federal Reserve SR 11-7',
      reference: 'Guidance on Model Risk Management',
      applicabilityReason:
        'Financial institution model used for material business decisions requires independent validation and ongoing monitoring.',
      obligationType: 'monitoring',
    });
  }

  // ── HIPAA ──
  if (dataSensitivity.includes('health_info')) {
    frameworks.push({
      framework: 'HIPAA',
      reference: '45 CFR Part 164 (Privacy Rule)',
      applicabilityReason:
        'Processing health information requires HIPAA-compliant safeguards, business associate agreements with vendors, and breach notification.',
      obligationType: 'documentation',
    });
  }

  // ── ISO 42001 (AI Management System) ──
  // Always applicable as a recommended framework
  frameworks.push({
    framework: 'ISO/IEC 42001:2023',
    reference: 'AI Management System',
    applicabilityReason:
      'ISO 42001 provides the international standard for AI management systems and applies as a best-practice baseline.',
    obligationType: 'documentation',
  });

  // ── P11: US domain-specific frameworks ──

  // ECOA / Fair Housing — triggered by credit/lending decisions
  if (
    triggers.includes('credit_lending') ||
    triggers.includes('insurance_pricing') ||
    ['underwriting', 'actuarial'].includes(businessArea ?? '')
  ) {
    frameworks.push({
      framework: 'ECOA / Fair Housing',
      reference: 'ECOA §701 / FHA §3604-3606',
      applicabilityReason:
        'Credit or housing-related AI decisions must comply with fair lending and fair housing laws, including disparate impact testing and adverse action notice requirements.',
      obligationType: 'bias_audit',
    });
  }

  // SEC / FINRA — triggered by investment research or financial advice
  if (
    triggers.includes('investment_advice') ||
    triggers.includes('financial_info_retrieval') ||
    businessArea === 'investments'
  ) {
    frameworks.push({
      framework: 'SEC / FINRA',
      reference: 'FINRA Rule 2111 / Reg BI',
      applicabilityReason:
        'AI used for investment research, recommendations, or financial advice must comply with suitability and best interest obligations.',
      obligationType: 'documentation',
    });
  }

  // Reg E / EFTA — triggered by fraud detection affecting account access
  if (
    triggers.includes('fraud_detection') ||
    (businessArea === 'claims' && whoAffected !== 'internal_only')
  ) {
    frameworks.push({
      framework: 'Reg E / EFTA',
      reference: 'Reg E §1005.11',
      applicabilityReason:
        'AI-driven fraud detection or account actions must comply with Regulation E error resolution and unauthorized transfer liability provisions.',
      obligationType: 'human_oversight',
    });
  }

  // FTC Act Section 5 — triggered by customer-facing AI content generation
  if (
    triggers.includes('external_content_generation') ||
    (whoAffected !== 'internal_only' && aiTypes.includes('generative_ai'))
  ) {
    frameworks.push({
      framework: 'FTC Act Section 5',
      reference: '15 U.S.C. §45(a)',
      applicabilityReason:
        'Customer-facing AI systems must not engage in deceptive or unfair practices. AI-generated content disclosed to consumers triggers FTC scrutiny.',
      obligationType: 'transparency',
    });
  }

  // CFPB / OCC — triggered by credit decisions
  if (triggers.includes('credit_lending')) {
    frameworks.push({
      framework: 'CFPB / OCC',
      reference: 'OCC 2011-12 / CFPB Circular 2022-03',
      applicabilityReason:
        'AI models used in credit decisions require independent validation per OCC model risk guidance, and must provide specific adverse action reasons per CFPB requirements.',
      obligationType: 'monitoring',
    });
  }

  // P8: Proxy variable detection — geolocation, device fingerprint, zip code,
  // or IP address used in financial decisions triggers ECOA / CFPB fair lending.
  // Citation: CFPB Circular 2022-03 (proxy discrimination in algorithmic
  // decision-making). Geolocation correlates with race and national origin;
  // device fingerprint correlates with age and income.
  const PROXY_DATA = ['customer_confidential', 'personal_info', 'regulated_financial'];
  const FINANCIAL_TRIGGERS = [
    'credit_lending',
    'insurance_pricing',
    'investment_advice',
    'fraud_detection',
    'financial_info_retrieval',
  ];
  const hasProxyData = dataSensitivity.some((d) => PROXY_DATA.includes(d));
  const hasFinancialDecision = triggers.some((t) => FINANCIAL_TRIGGERS.includes(t));
  const isFinancialArea = [
    'finance',
    'actuarial',
    'claims',
    'underwriting',
    'investments',
  ].includes(businessArea ?? '');

  if (hasProxyData && (hasFinancialDecision || isFinancialArea)) {
    // Only add if not already tagged by credit_lending or explicit trigger
    if (!triggers.includes('credit_lending')) {
      frameworks.push({
        framework: 'ECOA / Fair Housing',
        reference: 'ECOA §701 / CFPB Circular 2022-03',
        applicabilityReason:
          'Financial decision system processes data categories that correlate with protected characteristics (proxy variables). Requires disparate impact testing under ECOA and CFPB fair lending guidance.',
        obligationType: 'bias_audit',
      });
    }
    if (!triggers.includes('credit_lending')) {
      frameworks.push({
        framework: 'CFPB / OCC',
        reference: 'CFPB Circular 2022-03 (proxy discrimination)',
        applicabilityReason:
          'Data features used in this financial decision system may serve as proxies for protected class characteristics. CFPB requires testing for proxy discrimination and documentation of feature selection rationale.',
        obligationType: 'monitoring',
      });
    }
  }

  return frameworks;
}
