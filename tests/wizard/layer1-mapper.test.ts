import { describe, expect, it } from 'vitest';
import type { IntakeLayer1Data } from '@/lib/questions/intake-layer1-schema';
import { intakeSchema } from '@/lib/questions/intake-schema';
import { mapLayer1ToIntake } from '@/lib/wizard/layer1-mapper';

function baseL1(overrides: Partial<IntakeLayer1Data> = {}): IntakeLayer1Data {
  return {
    useCaseName: 'Auto-summarizer',
    ownerName: 'Ada Lovelace',
    ownerEmail: 'ada@example.com',
    businessArea: 'marketing',
    description: 'Summarizes weekly marketing reports for the team.',
    aiType: ['generative_ai'],
    lifecycleStage: 'planning',
    riskTouchpoints: ['none_of_above'],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema round-trip — the most important invariant
// ─────────────────────────────────────────────────────────────────────────────

describe('mapLayer1ToIntake — schema compatibility', () => {
  it('produces an intake that passes the full Zod schema', () => {
    const intake = mapLayer1ToIntake(baseL1());
    expect(intakeSchema.safeParse(intake).success).toBe(true);
  });

  it('passes the schema for every lane combination', () => {
    const cases: IntakeLayer1Data[] = [
      baseL1(),
      baseL1({ riskTouchpoints: ['customer_personal_data'] }),
      baseL1({
        riskTouchpoints: ['financial_decisions'],
        businessArea: 'investments',
      }),
      baseL1({
        riskTouchpoints: ['employment_decisions'],
        businessArea: 'hr',
      }),
      baseL1({
        riskTouchpoints: ['acts_autonomously', 'financial_decisions'],
      }),
      baseL1({
        riskTouchpoints: ['health_biometric'],
        aiType: ['computer_vision'],
      }),
      baseL1({ lifecycleStage: 'live' }),
      baseL1({ aiType: ['ai_agent', 'predictive_ml'] }),
    ];
    for (const c of cases) {
      const result = intakeSchema.safeParse(mapLayer1ToIntake(c));
      if (!result.success) {
        throw new Error(
          `Schema parse failed for ${JSON.stringify(c)}: ${JSON.stringify(result.error.issues)}`,
        );
      }
      expect(result.success).toBe(true);
    }
  });

  it('pads very short descriptions to meet the 10-char minimum', () => {
    const intake = mapLayer1ToIntake(baseL1({ description: 'abc' }));
    expect(intake.businessProblem.length).toBeGreaterThanOrEqual(10);
    expect(intake.howAiHelps.length).toBeGreaterThanOrEqual(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Owner mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('mapLayer1ToIntake — owner', () => {
  it('combines name and email into useCaseOwner', () => {
    const intake = mapLayer1ToIntake(baseL1());
    expect(intake.useCaseOwner).toBe('Ada Lovelace <ada@example.com>');
  });

  it('trims whitespace', () => {
    const intake = mapLayer1ToIntake(
      baseL1({ ownerName: '  Ada  ', ownerEmail: '  ada@example.com  ' }),
    );
    expect(intake.useCaseOwner).toBe('Ada <ada@example.com>');
  });

  it('records the submission source in additionalNotes with owner info', () => {
    const intake = mapLayer1ToIntake(baseL1());
    expect(intake.additionalNotes).toContain('Ada Lovelace');
    expect(intake.additionalNotes).toContain('ada@example.com');
    expect(intake.additionalNotes).toContain('Layer 1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI type mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('mapLayer1ToIntake — aiType', () => {
  it('maps predictive_ml to predictive_classification', () => {
    const intake = mapLayer1ToIntake(baseL1({ aiType: ['predictive_ml'] }));
    expect(intake.aiType).toContain('predictive_classification');
  });

  it('passes through ai_agent, rpa_with_ai, computer_vision unchanged', () => {
    const intake = mapLayer1ToIntake(
      baseL1({ aiType: ['ai_agent', 'rpa_with_ai', 'computer_vision'] }),
    );
    expect(intake.aiType).toContain('ai_agent');
    expect(intake.aiType).toContain('rpa_with_ai');
    expect(intake.aiType).toContain('computer_vision');
  });

  it('infers usesFoundationModel=yes when generative_ai is selected', () => {
    const intake = mapLayer1ToIntake(baseL1({ aiType: ['generative_ai'] }));
    expect(intake.usesFoundationModel).toBe('yes');
  });

  it('uses dont_know for non-generative AI types', () => {
    const intake = mapLayer1ToIntake(baseL1({ aiType: ['predictive_ml'] }));
    expect(intake.usesFoundationModel).toBe('dont_know');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle stage mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('mapLayer1ToIntake — lifecycleStage', () => {
  it('planning → idea_planning', () => {
    expect(mapLayer1ToIntake(baseL1({ lifecycleStage: 'planning' })).lifecycleStage).toBe(
      'idea_planning',
    );
  });

  it('building → development_poc', () => {
    expect(mapLayer1ToIntake(baseL1({ lifecycleStage: 'building' })).lifecycleStage).toBe(
      'development_poc',
    );
  });

  it('piloting → testing_pilot', () => {
    expect(mapLayer1ToIntake(baseL1({ lifecycleStage: 'piloting' })).lifecycleStage).toBe(
      'testing_pilot',
    );
  });

  it('live → in_use_seeking_approval (shadow-AI amnesty)', () => {
    expect(mapLayer1ToIntake(baseL1({ lifecycleStage: 'live' })).lifecycleStage).toBe(
      'in_use_seeking_approval',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// High-risk trigger mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('mapLayer1ToIntake — highRiskTriggers', () => {
  it('none_of_above → [none_of_above]', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['none_of_above'] }));
    expect(intake.highRiskTriggers).toEqual(['none_of_above']);
  });

  it('employment_decisions → hiring_workforce', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['employment_decisions'] }));
    expect(intake.highRiskTriggers).toContain('hiring_workforce');
    expect(intake.highRiskTriggers).not.toContain('none_of_above');
  });

  it('generates_customer_content → external_content_generation', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['generates_customer_content'] }));
    expect(intake.highRiskTriggers).toContain('external_content_generation');
  });

  it('acts_autonomously → code_to_production', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['acts_autonomously'] }));
    expect(intake.highRiskTriggers).toContain('code_to_production');
  });

  it('health_biometric → biometric_id', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['health_biometric'] }));
    expect(intake.highRiskTriggers).toContain('biometric_id');
  });

  it('financial_decisions + investments → investment_advice (context-aware)', () => {
    const intake = mapLayer1ToIntake(
      baseL1({
        businessArea: 'investments',
        riskTouchpoints: ['financial_decisions'],
      }),
    );
    expect(intake.highRiskTriggers).toContain('investment_advice');
  });

  it('financial_decisions + actuarial → insurance_pricing', () => {
    const intake = mapLayer1ToIntake(
      baseL1({
        businessArea: 'actuarial',
        riskTouchpoints: ['financial_decisions'],
      }),
    );
    expect(intake.highRiskTriggers).toContain('insurance_pricing');
  });

  it('financial_decisions + finance → credit_lending', () => {
    const intake = mapLayer1ToIntake(
      baseL1({
        businessArea: 'finance',
        riskTouchpoints: ['financial_decisions'],
      }),
    );
    expect(intake.highRiskTriggers).toContain('credit_lending');
  });

  it('financial_decisions in other areas → generic financial_info_retrieval', () => {
    const intake = mapLayer1ToIntake(
      baseL1({
        businessArea: 'marketing',
        riskTouchpoints: ['financial_decisions'],
      }),
    );
    expect(intake.highRiskTriggers).toContain('financial_info_retrieval');
  });

  it('does not include none_of_above alongside real triggers', () => {
    const intake = mapLayer1ToIntake(
      baseL1({ riskTouchpoints: ['financial_decisions', 'none_of_above'] }),
    );
    expect(intake.highRiskTriggers).not.toContain('none_of_above');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Data sensitivity mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('mapLayer1ToIntake — dataSensitivity', () => {
  it('customer_personal_data → personal_info + customer_confidential', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['customer_personal_data'] }));
    expect(intake.dataSensitivity).toContain('personal_info');
    expect(intake.dataSensitivity).toContain('customer_confidential');
  });

  it('employee_data → personal_info', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['employee_data'] }));
    expect(intake.dataSensitivity).toContain('personal_info');
  });

  it('health_biometric → health_info', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['health_biometric'] }));
    expect(intake.dataSensitivity).toContain('health_info');
  });

  it('financial_decisions → regulated_financial', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['financial_decisions'] }));
    expect(intake.dataSensitivity).toContain('regulated_financial');
  });

  it('defaults to [internal] when nothing sensitive is selected', () => {
    const intake = mapLayer1ToIntake(baseL1({ riskTouchpoints: ['none_of_above'] }));
    expect(intake.dataSensitivity).toEqual(['internal']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Derived fields: who's affected, who uses, worst outcome, oversight
// ─────────────────────────────────────────────────────────────────────────────

describe('mapLayer1ToIntake — derived fields', () => {
  it('customer-facing touchpoints → whoAffected=external', () => {
    expect(
      mapLayer1ToIntake(baseL1({ riskTouchpoints: ['customer_personal_data'] })).whoAffected,
    ).toBe('external');
    expect(
      mapLayer1ToIntake(baseL1({ riskTouchpoints: ['generates_customer_content'] })).whoAffected,
    ).toBe('external');
  });

  it('internal-only touchpoints → whoAffected=internal_only', () => {
    expect(mapLayer1ToIntake(baseL1({ riskTouchpoints: ['employee_data'] })).whoAffected).toBe(
      'internal_only',
    );
  });

  it('generates_customer_content → whoUsesSystem=external_only', () => {
    expect(
      mapLayer1ToIntake(baseL1({ riskTouchpoints: ['generates_customer_content'] })).whoUsesSystem,
    ).toBe('external_only');
  });

  it('acts_autonomously → humanOversight=fully_autonomous', () => {
    expect(
      mapLayer1ToIntake(baseL1({ riskTouchpoints: ['acts_autonomously'] })).humanOversight,
    ).toBe('fully_autonomous');
  });

  it('non-autonomous → humanOversight=human_reviews by default', () => {
    expect(mapLayer1ToIntake(baseL1({ riskTouchpoints: ['none_of_above'] })).humanOversight).toBe(
      'human_reviews',
    );
  });

  it('serious touchpoints (financial/employment/health/autonomous) → worstOutcome=significant', () => {
    for (const tp of [
      'financial_decisions',
      'employment_decisions',
      'health_biometric',
      'acts_autonomously',
    ] as const) {
      expect(mapLayer1ToIntake(baseL1({ riskTouchpoints: [tp] })).worstOutcome).toBe('significant');
    }
  });

  it('customer-adjacent touchpoints → worstOutcome=moderate', () => {
    expect(
      mapLayer1ToIntake(baseL1({ riskTouchpoints: ['customer_personal_data'] })).worstOutcome,
    ).toBe('moderate');
  });

  it('none_of_above → worstOutcome=minor', () => {
    expect(mapLayer1ToIntake(baseL1({ riskTouchpoints: ['none_of_above'] })).worstOutcome).toBe(
      'minor',
    );
  });
});
