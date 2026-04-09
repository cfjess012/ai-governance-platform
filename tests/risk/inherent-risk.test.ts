import { describe, expect, it } from 'vitest';
import { calculateInherentRisk, hasEnoughDataForRisk } from '@/lib/risk/inherent-risk';
import type { InherentRiskInput } from '@/lib/risk/types';
import { escalateTier, maxTier, TIER_DISPLAY } from '@/lib/risk/types';

// ─── Test fixtures ────────────────────────────────────────────────

/** Minimum-risk fixture: marketer using Claude for blog drafts */
const lowRiskFixture: InherentRiskInput = {
  businessProblem: 'Generate blog post drafts',
  howAiHelps: 'Helps writers ideate faster',
  businessArea: 'marketing',
  aiType: ['generative_ai'],
  buildOrAcquire: 'using_existing_tool',
  thirdPartyInvolved: 'yes',
  auditability: 'inputs_outputs_only',
  usesFoundationModel: 'yes_vendor_managed',
  deploymentRegions: ['us_only'],
  lifecycleStage: 'in_use_seeking_approval',
  previouslyReviewed: 'no',
  highRiskTriggers: ['none_of_above'],
  whoUsesSystem: 'internal_only',
  whoAffected: 'internal_only',
  worstOutcome: 'minor',
  dataSensitivity: ['public'],
  humanOversight: 'human_decides',
  differentialTreatment: 'no',
  peopleAffectedCount: 'under_100',
};

/** High-risk EU + Annex III fixture: hiring AI in EU */
const euAnnexIiiFixture: InherentRiskInput = {
  businessProblem: 'Screen job applicants',
  howAiHelps: 'Ranks candidates by fit',
  businessArea: 'hr',
  aiType: ['predictive_classification'],
  buildOrAcquire: 'buying_new_vendor',
  thirdPartyInvolved: 'yes',
  auditability: 'black_box',
  usesFoundationModel: 'no',
  deploymentRegions: ['eu_eea', 'us_only'],
  lifecycleStage: 'development_poc',
  previouslyReviewed: 'no',
  highRiskTriggers: ['hiring_workforce'],
  whoUsesSystem: 'internal_only',
  whoAffected: 'external',
  worstOutcome: 'serious',
  dataSensitivity: ['personal_info'],
  humanOversight: 'human_reviews',
  differentialTreatment: 'possibly',
  peopleAffectedCount: '10000_100000',
};

/** Retirement chatbot fixture: financial info retrieval, customer-facing */
const retirementChatbotFixture: InherentRiskInput = {
  businessProblem: 'Answer participant questions about retirement plans',
  howAiHelps: 'Reduces call center volume',
  businessArea: 'customer_experience',
  aiType: ['generative_ai', 'rag'],
  buildOrAcquire: 'buying_new_vendor',
  thirdPartyInvolved: 'yes',
  auditability: 'inputs_outputs_only',
  usesFoundationModel: 'yes',
  deploymentRegions: ['us_only'],
  lifecycleStage: 'testing_pilot',
  previouslyReviewed: 'no',
  highRiskTriggers: ['financial_info_retrieval'],
  whoUsesSystem: 'external_only',
  whoAffected: 'external',
  worstOutcome: 'moderate',
  dataSensitivity: ['customer_confidential', 'personal_info'],
  humanOversight: 'spot_check',
  differentialTreatment: 'unlikely',
  peopleAffectedCount: 'over_100000',
};

/** Shadow IT fixture: citizen-built tool already in use with sensitive data */
const shadowItFixture: InherentRiskInput = {
  businessArea: 'sales',
  aiType: ['generative_ai'],
  buildOrAcquire: 'citizen_development',
  thirdPartyInvolved: 'yes',
  auditability: 'inputs_outputs_only',
  usesFoundationModel: 'yes',
  deploymentRegions: ['us_only'],
  lifecycleStage: 'in_production',
  previouslyReviewed: 'no',
  highRiskTriggers: ['none_of_above'],
  whoUsesSystem: 'internal_only',
  whoAffected: 'external',
  worstOutcome: 'moderate',
  dataSensitivity: ['customer_confidential'],
  humanOversight: 'human_reviews',
  differentialTreatment: 'no',
  peopleAffectedCount: '1000_10000',
};

// ─── Tier helpers ─────────────────────────────────────────────────

describe('Tier helpers', () => {
  describe('maxTier', () => {
    it('returns the higher of two tiers', () => {
      expect(maxTier('low', 'medium')).toBe('medium');
      expect(maxTier('medium_high', 'medium')).toBe('medium_high');
      expect(maxTier('high', 'low')).toBe('high');
    });

    it('returns same tier when equal', () => {
      expect(maxTier('medium', 'medium')).toBe('medium');
    });
  });

  describe('escalateTier', () => {
    it('bumps each tier up one level', () => {
      expect(escalateTier('low')).toBe('medium_low');
      expect(escalateTier('medium_low')).toBe('medium');
      expect(escalateTier('medium')).toBe('medium_high');
      expect(escalateTier('medium_high')).toBe('high');
    });

    it('caps high at high', () => {
      expect(escalateTier('high')).toBe('high');
    });
  });

  describe('TIER_DISPLAY', () => {
    it('has all 5 tiers', () => {
      expect(Object.keys(TIER_DISPLAY)).toHaveLength(5);
    });

    it('orders tiers by ordinal correctly', () => {
      expect(TIER_DISPLAY.low.ordinal).toBe(1);
      expect(TIER_DISPLAY.medium_low.ordinal).toBe(2);
      expect(TIER_DISPLAY.medium.ordinal).toBe(3);
      expect(TIER_DISPLAY.medium_high.ordinal).toBe(4);
      expect(TIER_DISPLAY.high.ordinal).toBe(5);
    });
  });
});

// ─── End-to-end scenarios ─────────────────────────────────────────

describe('calculateInherentRisk end-to-end', () => {
  describe('Low-risk scenarios', () => {
    it('rates a marketer using Claude for blog drafts as Low or Medium-Low', () => {
      const result = calculateInherentRisk(lowRiskFixture);
      expect(['low', 'medium_low']).toContain(result.tier);
      expect(result.firedRules).toHaveLength(0);
    });

    it('produces a small number of contributors for low-risk cases', () => {
      const result = calculateInherentRisk(lowRiskFixture);
      expect(result.topContributors.length).toBeLessThanOrEqual(3);
    });

    it('marks the result as a pure base score (no rules/patterns) for low-risk', () => {
      const result = calculateInherentRisk(lowRiskFixture);
      expect(result.pureBaseScore).toBe(true);
    });
  });

  describe('High-risk EU + Annex III scenario', () => {
    it('rates EU + hiring + Annex III as High (forced by hard rule)', () => {
      const result = calculateInherentRisk(euAnnexIiiFixture);
      expect(result.tier).toBe('high');
    });

    it('fires the EU AI Act Annex III rule', () => {
      const result = calculateInherentRisk(euAnnexIiiFixture);
      expect(result.firedRules.find((r) => r.id === 'eu_annex_iii_high_risk')).toBeDefined();
    });

    it('detects EU AI Act and GDPR frameworks as applicable', () => {
      const result = calculateInherentRisk(euAnnexIiiFixture);
      const frameworks = result.applicableFrameworks.map((f) => f.framework);
      expect(frameworks).toContain('EU AI Act');
      expect(frameworks).toContain('GDPR');
    });

    it('pureBaseScore is false because rules fired', () => {
      const result = calculateInherentRisk(euAnnexIiiFixture);
      expect(result.pureBaseScore).toBe(false);
    });
  });

  describe('Retirement chatbot scenario (the user feedback case)', () => {
    it('rates as Medium or Medium-High (financial info + customer-facing + 100k+ users)', () => {
      const result = calculateInherentRisk(retirementChatbotFixture);
      expect(['medium', 'medium_high', 'high']).toContain(result.tier);
    });

    it('detects the GenAI Customer Exposure pattern', () => {
      const result = calculateInherentRisk(retirementChatbotFixture);
      expect(
        result.firedPatterns.find((p) => p.id === 'genai_customer_unconstrained'),
      ).toBeDefined();
    });

    it('does NOT classify as Low (because of 100k+ users with sensitive data)', () => {
      const result = calculateInherentRisk(retirementChatbotFixture);
      expect(result.tier).not.toBe('low');
    });
  });

  describe('Shadow IT scenario', () => {
    it('detects Shadow IT in Production pattern', () => {
      const result = calculateInherentRisk(shadowItFixture);
      expect(result.firedPatterns.find((p) => p.id === 'shadow_it_in_production')).toBeDefined();
    });

    it('fires unreviewed-production-external rule', () => {
      const result = calculateInherentRisk(shadowItFixture);
      expect(
        result.firedRules.find((r) => r.id === 'unreviewed_production_external'),
      ).toBeDefined();
    });

    it('rates at least Medium-High due to unreviewed production with external impact', () => {
      const result = calculateInherentRisk(shadowItFixture);
      const ordinal = TIER_DISPLAY[result.tier].ordinal;
      expect(ordinal).toBeGreaterThanOrEqual(TIER_DISPLAY.medium_high.ordinal);
    });
  });
});

// ─── Hard rule tests ──────────────────────────────────────────────

describe('Hard rules', () => {
  describe('EU prohibited practice', () => {
    it('fires for biometric ID in EU', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        deploymentRegions: ['eu_eea'],
        highRiskTriggers: ['biometric_id'],
      });
      expect(result.firedRules.find((r) => r.id === 'eu_prohibited_practice')).toBeDefined();
      expect(result.tier).toBe('high');
    });

    it('does NOT fire for biometric ID outside EU', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        deploymentRegions: ['us_only'],
        highRiskTriggers: ['biometric_id'],
      });
      expect(result.firedRules.find((r) => r.id === 'eu_prohibited_practice')).toBeUndefined();
    });

    it('fires for emotion detection in EU', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        deploymentRegions: ['eu_eea'],
        highRiskTriggers: ['emotion_detection'],
      });
      expect(result.firedRules.find((r) => r.id === 'eu_prohibited_practice')).toBeDefined();
    });
  });

  describe('NYC LL144 AEDT', () => {
    it('fires for hiring trigger with US deployment', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        businessArea: 'hr',
        highRiskTriggers: ['hiring_workforce'],
        deploymentRegions: ['us_only'],
      });
      expect(result.firedRules.find((r) => r.id === 'nyc_ll144_aedt')).toBeDefined();
      expect(result.tier).toBe('high');
    });
  });

  describe('Colorado consequential decision', () => {
    it('fires for consequential decision with automated authority + external impact', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        businessArea: 'finance',
        highRiskTriggers: ['credit_lending'],
        humanOversight: 'human_reviews',
        whoAffected: 'external',
      });
      expect(
        result.firedRules.find((r) => r.id === 'colorado_consequential_decision'),
      ).toBeDefined();
    });

    it('does NOT fire for internal-only systems', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        businessArea: 'finance',
        highRiskTriggers: ['credit_lending'],
        humanOversight: 'human_reviews',
        whoAffected: 'internal_only',
      });
      expect(
        result.firedRules.find((r) => r.id === 'colorado_consequential_decision'),
      ).toBeUndefined();
    });
  });

  describe('GDPR Article 22', () => {
    it('fires for EU + sensitive data + automated decisions', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        deploymentRegions: ['eu_eea'],
        dataSensitivity: ['personal_info'],
        humanOversight: 'fully_autonomous',
        whoAffected: 'external',
      });
      expect(result.firedRules.find((r) => r.id === 'gdpr_art_22')).toBeDefined();
    });

    it('does not fire when human is in the loop', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        deploymentRegions: ['eu_eea'],
        dataSensitivity: ['personal_info'],
        humanOversight: 'human_decides',
      });
      expect(result.firedRules.find((r) => r.id === 'gdpr_art_22')).toBeUndefined();
    });
  });

  describe('Health data + automated decisions', () => {
    it('fires for health data + automated decisions affecting external people', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        dataSensitivity: ['health_info'],
        humanOversight: 'spot_check',
        whoAffected: 'external',
      });
      expect(result.firedRules.find((r) => r.id === 'health_data_decisions')).toBeDefined();
    });
  });
});

// ─── Confluence pattern tests ──────────────────────────────────────

describe('Confluence patterns', () => {
  describe('GenAI Customer Exposure', () => {
    it('fires for generative AI + customer-facing + sensitive data', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        aiType: ['generative_ai'],
        whoAffected: 'external',
        dataSensitivity: ['customer_confidential'],
      });
      expect(
        result.firedPatterns.find((p) => p.id === 'genai_customer_unconstrained'),
      ).toBeDefined();
    });

    it('does not fire for internal-only systems', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        aiType: ['generative_ai'],
        whoAffected: 'internal_only',
        dataSensitivity: ['customer_confidential'],
      });
      expect(
        result.firedPatterns.find((p) => p.id === 'genai_customer_unconstrained'),
      ).toBeUndefined();
    });
  });

  describe('Cross-Border Sensitive Data', () => {
    it('fires for EU + PII + foundation model', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        deploymentRegions: ['eu_eea'],
        dataSensitivity: ['personal_info'],
        usesFoundationModel: 'yes',
      });
      expect(
        result.firedPatterns.find((p) => p.id === 'cross_border_sensitive_data'),
      ).toBeDefined();
    });
  });

  describe('Shadow IT in Production', () => {
    it('fires for citizen development + production + sensitive data', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        buildOrAcquire: 'citizen_development',
        lifecycleStage: 'in_production',
        dataSensitivity: ['customer_confidential'],
      });
      expect(result.firedPatterns.find((p) => p.id === 'shadow_it_in_production')).toBeDefined();
    });
  });

  describe('Black Box Vendor + Consequential', () => {
    it('fires for third-party black-box + consequential decision', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        thirdPartyInvolved: 'yes',
        auditability: 'black_box',
        highRiskTriggers: ['credit_lending'],
      });
      expect(
        result.firedPatterns.find((p) => p.id === 'black_box_vendor_consequential'),
      ).toBeDefined();
    });
  });

  describe('Agentic Code Execution', () => {
    it('fires for AI agent + code-to-production + low oversight', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        aiType: ['ai_agent'],
        highRiskTriggers: ['code_to_production'],
        humanOversight: 'spot_check',
      });
      expect(result.firedPatterns.find((p) => p.id === 'agentic_code_execution')).toBeDefined();
    });

    it('forces minimum tier of medium_high', () => {
      const result = calculateInherentRisk({
        ...lowRiskFixture,
        aiType: ['ai_agent'],
        highRiskTriggers: ['code_to_production'],
        humanOversight: 'spot_check',
      });
      const ordinal = TIER_DISPLAY[result.tier].ordinal;
      expect(ordinal).toBeGreaterThanOrEqual(TIER_DISPLAY.medium_high.ordinal);
    });
  });
});

// ─── Dimensions ───────────────────────────────────────────────────

describe('Dimension scoring', () => {
  it('returns 7 dimensions for any input', () => {
    const result = calculateInherentRisk(lowRiskFixture);
    expect(result.dimensions).toHaveLength(7);
  });

  it('has dimensions whose weights sum to ~1.0', () => {
    const result = calculateInherentRisk(lowRiskFixture);
    const sum = result.dimensions.reduce((acc, d) => acc + d.weight, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });

  it('has dimensions all in the 0-4 range', () => {
    const result = calculateInherentRisk(euAnnexIiiFixture);
    for (const dim of result.dimensions) {
      expect(dim.score).toBeGreaterThanOrEqual(0);
      expect(dim.score).toBeLessThanOrEqual(4);
    }
  });

  it('produces base score 0-100', () => {
    const result = calculateInherentRisk(euAnnexIiiFixture);
    expect(result.baseScore).toBeGreaterThanOrEqual(0);
    expect(result.baseScore).toBeLessThanOrEqual(100);
  });
});

// ─── Frameworks ────────────────────────────────────────────────────

describe('Applicable frameworks', () => {
  it('always includes NIST AI RMF as a baseline', () => {
    const result = calculateInherentRisk(lowRiskFixture);
    expect(result.applicableFrameworks.find((f) => f.framework.startsWith('NIST'))).toBeDefined();
  });

  it('always includes ISO 42001', () => {
    const result = calculateInherentRisk(lowRiskFixture);
    expect(result.applicableFrameworks.find((f) => f.framework.startsWith('ISO'))).toBeDefined();
  });

  it('includes EU AI Act when deployed to EU', () => {
    const result = calculateInherentRisk(euAnnexIiiFixture);
    expect(result.applicableFrameworks.find((f) => f.framework === 'EU AI Act')).toBeDefined();
  });

  it('includes NAIC for insurance use cases', () => {
    const result = calculateInherentRisk({
      ...lowRiskFixture,
      businessArea: 'underwriting',
    });
    expect(
      result.applicableFrameworks.find((f) => f.framework === 'NAIC Model Bulletin'),
    ).toBeDefined();
  });

  it('includes HIPAA when health data is processed', () => {
    const result = calculateInherentRisk({
      ...lowRiskFixture,
      dataSensitivity: ['health_info'],
    });
    expect(result.applicableFrameworks.find((f) => f.framework === 'HIPAA')).toBeDefined();
  });
});

// ─── hasEnoughDataForRisk ──────────────────────────────────────────

describe('hasEnoughDataForRisk', () => {
  it('returns false for empty input', () => {
    expect(hasEnoughDataForRisk({})).toBe(false);
  });

  it('returns true when minimum required fields are present', () => {
    expect(
      hasEnoughDataForRisk({
        aiType: ['generative_ai'],
        businessArea: 'marketing',
        deploymentRegions: ['us_only'],
        whoAffected: 'internal_only',
        worstOutcome: 'minor',
      }),
    ).toBe(true);
  });

  it('returns false if AI type is missing', () => {
    expect(
      hasEnoughDataForRisk({
        businessArea: 'marketing',
        deploymentRegions: ['us_only'],
        whoAffected: 'internal_only',
        worstOutcome: 'minor',
      }),
    ).toBe(false);
  });
});
