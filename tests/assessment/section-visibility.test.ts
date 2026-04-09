import { describe, expect, it } from 'vitest';
import {
  ASSESSMENT_SECTION_IDS,
  calculatePathBasedVisibility,
  deriveAssessmentValuesFromIntake,
  getPrePopulatedFields,
  getVisibleSectionSet,
  isSectionVisible,
} from '@/lib/assessment/section-visibility';
import type { IntakeFormData } from '@/lib/questions/intake-schema';

function intake(overrides: Partial<IntakeFormData> = {}): Partial<IntakeFormData> {
  return {
    useCaseName: 'Test',
    aiType: ['predictive_classification'],
    buildOrAcquire: 'custom_development',
    thirdPartyInvolved: 'no',
    usesFoundationModel: 'no',
    deploymentRegions: ['us_only'],
    lifecycleStage: 'development_poc',
    previouslyReviewed: 'no',
    highRiskTriggers: ['none_of_above'],
    whoUsesSystem: 'internal_only',
    whoAffected: 'internal_only',
    worstOutcome: 'minor',
    dataSensitivity: ['public'],
    humanOversight: 'human_decides',
    differentialTreatment: 'no',
    peopleAffectedCount: 'under_100',
    ...overrides,
  };
}

describe('Path-based assessment section visibility', () => {
  describe('full path', () => {
    it('shows every section regardless of intake', () => {
      const result = calculatePathBasedVisibility(intake(), 'full');
      // Every section except possibly section-i (vendor) should be visible
      expect(result.visible).toContain('section-a');
      expect(result.visible).toContain('section-b');
      expect(result.visible).toContain('section-c');
      expect(result.visible).toContain('section-d');
      expect(result.visible).toContain('section-e');
      expect(result.visible).toContain('section-f');
      expect(result.visible).toContain('section-g');
      expect(result.visible).toContain('section-h');
      expect(result.visible).toContain('assessment-review');
    });

    it('still skips vendor section when third-party is no', () => {
      const result = calculatePathBasedVisibility(intake({ thirdPartyInvolved: 'no' }), 'full');
      expect(result.visible).not.toContain('section-i');
      expect(result.skipped.find((s) => s.sectionId === 'section-i')).toBeDefined();
    });

    it('shows vendor section when third-party is yes', () => {
      const result = calculatePathBasedVisibility(intake({ thirdPartyInvolved: 'yes' }), 'full');
      expect(result.visible).toContain('section-i');
    });
  });

  describe('standard path - decisioning section (section-d)', () => {
    it('skips when human decides everything and no high-risk triggers', () => {
      const result = calculatePathBasedVisibility(
        intake({
          humanOversight: 'human_decides',
          highRiskTriggers: ['none_of_above'],
        }),
        'standard',
      );
      expect(result.visible).not.toContain('section-d');
      expect(result.skipped.find((s) => s.sectionId === 'section-d')).toBeDefined();
    });

    it('shows when human does not decide everything', () => {
      const result = calculatePathBasedVisibility(
        intake({
          humanOversight: 'fully_autonomous',
          highRiskTriggers: ['none_of_above'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-d');
    });

    it('shows when high-risk triggers are present even if human decides', () => {
      const result = calculatePathBasedVisibility(
        intake({
          humanOversight: 'human_decides',
          highRiskTriggers: ['investment_advice'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-d');
    });

    it('treats financial_info_retrieval as low-risk (still skips)', () => {
      const result = calculatePathBasedVisibility(
        intake({
          humanOversight: 'human_decides',
          highRiskTriggers: ['financial_info_retrieval'],
        }),
        'standard',
      );
      expect(result.visible).not.toContain('section-d');
    });
  });

  describe('standard path - emerging risks section (section-g)', () => {
    it('skips when no foundation model and AI type is not generative/agent/RAG', () => {
      const result = calculatePathBasedVisibility(
        intake({
          usesFoundationModel: 'no',
          aiType: ['predictive_classification'],
        }),
        'standard',
      );
      expect(result.visible).not.toContain('section-g');
    });

    it('shows when foundation model is used', () => {
      const result = calculatePathBasedVisibility(
        intake({
          usesFoundationModel: 'yes',
          aiType: ['predictive_classification'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-g');
    });

    it('shows when foundation model is vendor-managed', () => {
      const result = calculatePathBasedVisibility(
        intake({
          usesFoundationModel: 'yes_vendor_managed',
          aiType: ['predictive_classification'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-g');
    });

    it('shows when AI type includes generative_ai', () => {
      const result = calculatePathBasedVisibility(
        intake({
          usesFoundationModel: 'no',
          aiType: ['generative_ai'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-g');
    });

    it('shows when AI type includes ai_agent', () => {
      const result = calculatePathBasedVisibility(
        intake({
          usesFoundationModel: 'no',
          aiType: ['ai_agent'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-g');
    });

    it('shows when AI type includes rag', () => {
      const result = calculatePathBasedVisibility(
        intake({
          usesFoundationModel: 'no',
          aiType: ['rag'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-g');
    });

    it('shows when AI type includes multiple types with at least one emerging', () => {
      const result = calculatePathBasedVisibility(
        intake({
          usesFoundationModel: 'no',
          aiType: ['predictive_classification', 'generative_ai'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-g');
    });
  });

  describe('standard path - explainability section (section-h)', () => {
    it('skips when internal-only and no decision triggers', () => {
      const result = calculatePathBasedVisibility(
        intake({
          whoUsesSystem: 'internal_only',
          whoAffected: 'internal_only',
          highRiskTriggers: ['none_of_above'],
        }),
        'standard',
      );
      expect(result.visible).not.toContain('section-h');
    });

    it('shows when external users are present', () => {
      const result = calculatePathBasedVisibility(
        intake({
          whoUsesSystem: 'external_only',
          whoAffected: 'external',
          highRiskTriggers: ['none_of_above'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-h');
    });

    it('shows when affecting general public', () => {
      const result = calculatePathBasedVisibility(
        intake({
          whoUsesSystem: 'internal_only',
          whoAffected: 'general_public',
          highRiskTriggers: ['none_of_above'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-h');
    });

    it('shows when consequential decision triggers are present', () => {
      const result = calculatePathBasedVisibility(
        intake({
          whoUsesSystem: 'internal_only',
          whoAffected: 'internal_only',
          highRiskTriggers: ['hiring_workforce'],
        }),
        'standard',
      );
      expect(result.visible).toContain('section-h');
    });
  });

  describe('vendor section (section-i)', () => {
    it('always skipped when third-party is no, regardless of path', () => {
      for (const path of ['standard', 'full'] as const) {
        const result = calculatePathBasedVisibility(intake({ thirdPartyInvolved: 'no' }), path);
        expect(result.visible).not.toContain('section-i');
      }
    });

    it('always shown when third-party is yes, regardless of path', () => {
      for (const path of ['standard', 'full'] as const) {
        const result = calculatePathBasedVisibility(intake({ thirdPartyInvolved: 'yes' }), path);
        expect(result.visible).toContain('section-i');
      }
    });
  });

  describe('skipped reasons', () => {
    it('records a reason for every skipped section', () => {
      const result = calculatePathBasedVisibility(
        intake({
          humanOversight: 'human_decides',
          highRiskTriggers: ['none_of_above'],
          usesFoundationModel: 'no',
          aiType: ['predictive_classification'],
          whoUsesSystem: 'internal_only',
          whoAffected: 'internal_only',
          thirdPartyInvolved: 'no',
        }),
        'standard',
      );
      // Multiple sections should be skipped
      expect(result.skipped.length).toBeGreaterThan(0);
      for (const skip of result.skipped) {
        expect(skip.reason).toBeTruthy();
        expect(skip.reason.length).toBeGreaterThan(10);
      }
    });

    it('sections in visible and skipped are mutually exclusive', () => {
      const result = calculatePathBasedVisibility(intake(), 'standard');
      const visibleSet = new Set(result.visible);
      const skippedSet = new Set(result.skipped.map((s) => s.sectionId));
      for (const id of visibleSet) {
        expect(skippedSet.has(id)).toBe(false);
      }
    });

    it('every section is accounted for (visible OR skipped)', () => {
      const result = calculatePathBasedVisibility(intake(), 'standard');
      const accountedFor = new Set([...result.visible, ...result.skipped.map((s) => s.sectionId)]);
      for (const id of ASSESSMENT_SECTION_IDS) {
        expect(accountedFor.has(id)).toBe(true);
      }
    });
  });

  describe('helpers', () => {
    it('getVisibleSectionSet returns a Set of visible section IDs', () => {
      const set = getVisibleSectionSet(intake(), 'full');
      expect(set instanceof Set).toBe(true);
      expect(set.has('section-a')).toBe(true);
    });

    it('isSectionVisible returns true for shown sections', () => {
      expect(isSectionVisible('section-a', intake(), 'full')).toBe(true);
    });

    it('isSectionVisible returns false for hidden sections', () => {
      expect(isSectionVisible('section-i', intake({ thirdPartyInvolved: 'no' }), 'standard')).toBe(
        false,
      );
    });
  });
});

describe('deriveAssessmentValuesFromIntake', () => {
  it('derives customerFacingOutputs from whoAffected', () => {
    expect(
      deriveAssessmentValuesFromIntake(intake({ whoAffected: 'external' })).customerFacingOutputs,
    ).toBe('yes');
    expect(
      deriveAssessmentValuesFromIntake(intake({ whoAffected: 'general_public' }))
        .customerFacingOutputs,
    ).toBe('yes');
    expect(
      deriveAssessmentValuesFromIntake(intake({ whoAffected: 'internal_only' }))
        .customerFacingOutputs,
    ).toBe('no');
  });

  it('derives hasInternalUsers and hasExternalUsers from whoUsesSystem', () => {
    const both = deriveAssessmentValuesFromIntake(intake({ whoUsesSystem: 'both' }));
    expect(both.hasInternalUsers).toBe('yes');
    expect(both.hasExternalUsers).toBe('yes');

    const internalOnly = deriveAssessmentValuesFromIntake(
      intake({ whoUsesSystem: 'internal_only' }),
    );
    expect(internalOnly.hasInternalUsers).toBe('yes');
    expect(internalOnly.hasExternalUsers).toBe('no');

    const externalOnly = deriveAssessmentValuesFromIntake(
      intake({ whoUsesSystem: 'external_only' }),
    );
    expect(externalOnly.hasInternalUsers).toBe('no');
    expect(externalOnly.hasExternalUsers).toBe('yes');
  });

  it('derives usesGenAi from aiType (not usesFoundationModel)', () => {
    // P2 fix: GenAI is derived from aiType, not usesFoundationModel.
    // A predictive ML system using a vendor foundation model is NOT GenAI.
    expect(deriveAssessmentValuesFromIntake(intake({ aiType: ['generative_ai'] })).usesGenAi).toBe(
      'yes',
    );
    expect(deriveAssessmentValuesFromIntake(intake({ aiType: ['rag'] })).usesGenAi).toBe('yes');
    expect(
      deriveAssessmentValuesFromIntake(intake({ aiType: ['predictive_classification'] })).usesGenAi,
    ).toBe('no');
    // Foundation model alone does NOT imply GenAI
    expect(
      deriveAssessmentValuesFromIntake(
        intake({ usesFoundationModel: 'yes', aiType: ['predictive_classification'] }),
      ).usesGenAi,
    ).toBe('no');
  });

  it('derives third party fields', () => {
    const result = deriveAssessmentValuesFromIntake(
      intake({ thirdPartyInvolved: 'yes', vendorName: 'Acme AI' }),
    );
    expect(result.involvesThirdParty).toBe('yes');
    expect(result.thirdPartyName).toBe('Acme AI');
  });

  it('derives data classification from highest sensitivity level', () => {
    expect(
      deriveAssessmentValuesFromIntake(intake({ dataSensitivity: ['health_info'] }))
        .dataClassification,
    ).toBe('highly_confidential');
    expect(
      deriveAssessmentValuesFromIntake(intake({ dataSensitivity: ['regulated_financial'] }))
        .dataClassification,
    ).toBe('highly_confidential');
    expect(
      deriveAssessmentValuesFromIntake(intake({ dataSensitivity: ['personal_info'] }))
        .dataClassification,
    ).toBe('confidential');
    expect(
      deriveAssessmentValuesFromIntake(intake({ dataSensitivity: ['company_confidential'] }))
        .dataClassification,
    ).toBe('internal');
    expect(
      deriveAssessmentValuesFromIntake(intake({ dataSensitivity: ['public'] })).dataClassification,
    ).toBe('public');
  });

  it('derives PII flag from dataSensitivity', () => {
    expect(
      deriveAssessmentValuesFromIntake(intake({ dataSensitivity: ['personal_info'] }))
        .interactsWithPii,
    ).toBe('yes');
    expect(
      deriveAssessmentValuesFromIntake(intake({ dataSensitivity: ['health_info'] }))
        .interactsWithPii,
    ).toBe('yes');
    expect(
      deriveAssessmentValuesFromIntake(intake({ dataSensitivity: ['public'] })).interactsWithPii,
    ).toBe('no');
  });

  it('maps deployment regions from intake codes to assessment codes', () => {
    const result = deriveAssessmentValuesFromIntake(
      intake({ deploymentRegions: ['us_only', 'eu_eea'] }),
    );
    // P1/P2 fix: eu_eea → eu, us_only → us
    expect(result.deploymentRegions).toEqual(['us', 'eu']);
  });
});

describe('getPrePopulatedFields', () => {
  it('returns the set of fields that will be pre-populated from a given intake', () => {
    const fields = getPrePopulatedFields(
      intake({
        whoAffected: 'external',
        whoUsesSystem: 'external_only',
        usesFoundationModel: 'yes',
        thirdPartyInvolved: 'yes',
        vendorName: 'Test',
      }),
    );
    expect(fields.has('customerFacingOutputs')).toBe(true);
    expect(fields.has('hasInternalUsers')).toBe(true);
    expect(fields.has('hasExternalUsers')).toBe(true);
    expect(fields.has('usesGenAi')).toBe(true);
    expect(fields.has('involvesThirdParty')).toBe(true);
    expect(fields.has('thirdPartyName')).toBe(true);
  });
});
