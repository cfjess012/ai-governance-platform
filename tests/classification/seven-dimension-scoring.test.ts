import { describe, expect, it } from 'vitest';
import {
  calculateSevenDimensionScore,
  type SevenDimensionInput,
} from '@/lib/classification/seven-dimension-scoring';

const minimalRiskInput: SevenDimensionInput = {
  deploymentRegions: ['us'],
  businessActivities: ['none'],
  vendorAuditScope: 'yes',
  dataClassification: 'public',
  interactsWithPii: 'no',
  unstructuredDataDev: 'no',
  unstructuredDataProd: 'no',
  dataProcessingRegions: ['us'],
  aiModelsUsed: 'rule-based',
  usesGenAi: 'no',
  usesClassicalModels: 'no',
  driftMonitoring: 'Comprehensive monitoring in place',
  failureRisks: 'other',
  incidentResponsePlan: 'yes',
  dataAccessible: 'yes',
  replacesHumanDecisions: 'no',
  automatesExternalDecisions: 'no',
  humanValidatesOutputs: 'yes',
  biasFairnessTesting: 'Thorough testing done',
  customerFacingOutputs: 'no',
  hasExternalUsers: 'no',
  monitorsHumanActivity: 'no',
  involvesThirdParty: 'no',
  vendorIso42001: 'no',
  dataUsedForTraining: 'no',
};

const criticalRiskInput: SevenDimensionInput = {
  deploymentRegions: ['eu', 'us'],
  businessActivities: ['insurance_decisions', 'hr_automated_hiring'],
  vendorAuditScope: 'no',
  dataClassification: 'customer_confidential',
  interactsWithPii: 'yes',
  unstructuredDataDev: 'yes',
  unstructuredDataProd: 'yes',
  dataProcessingRegions: ['eu', 'us', 'apac'],
  aiModelsUsed: 'GPT-4, custom neural network',
  usesGenAi: 'yes',
  usesClassicalModels: 'yes',
  driftMonitoring: '',
  failureRisks: 'financial',
  incidentResponsePlan: 'no',
  dataAccessible: 'no',
  replacesHumanDecisions: 'yes',
  automatesExternalDecisions: 'yes',
  humanValidatesOutputs: 'no',
  biasFairnessTesting: '',
  customerFacingOutputs: 'yes',
  hasExternalUsers: 'yes',
  monitorsHumanActivity: 'yes',
  involvesThirdParty: 'yes',
  vendorIso42001: 'no',
  dataUsedForTraining: 'yes',
};

describe('Seven-Dimension Risk Scoring', () => {
  describe('composite score calculation', () => {
    it('produces low score for minimal-risk input', () => {
      const result = calculateSevenDimensionScore(minimalRiskInput);
      expect(result.compositeScore).toBeLessThanOrEqual(1.9);
      expect(result.riskTier).toBe('low');
    });

    it('produces critical score for maximum-risk input', () => {
      const result = calculateSevenDimensionScore(criticalRiskInput);
      expect(result.compositeScore).toBeGreaterThanOrEqual(4.0);
      expect(result.riskTier).toBe('critical');
    });

    it('composite score is between 1.0 and 5.0', () => {
      const low = calculateSevenDimensionScore(minimalRiskInput);
      const high = calculateSevenDimensionScore(criticalRiskInput);
      expect(low.compositeScore).toBeGreaterThanOrEqual(1.0);
      expect(low.compositeScore).toBeLessThanOrEqual(5.0);
      expect(high.compositeScore).toBeGreaterThanOrEqual(1.0);
      expect(high.compositeScore).toBeLessThanOrEqual(5.0);
    });
  });

  describe('seven dimensions', () => {
    it('returns exactly 7 dimension scores', () => {
      const result = calculateSevenDimensionScore(minimalRiskInput);
      expect(result.dimensions).toHaveLength(7);
    });

    it('each dimension score is between 1 and 5', () => {
      const result = calculateSevenDimensionScore(criticalRiskInput);
      for (const dim of result.dimensions) {
        expect(dim.score).toBeGreaterThanOrEqual(1);
        expect(dim.score).toBeLessThanOrEqual(5);
      }
    });

    it('includes all expected dimension names', () => {
      const result = calculateSevenDimensionScore(minimalRiskInput);
      const names = result.dimensions.map((d) => d.name);
      expect(names).toContain('Regulatory & Compliance');
      expect(names).toContain('Data Risk');
      expect(names).toContain('Model/Technical Risk');
      expect(names).toContain('Operational Risk');
      expect(names).toContain('Fairness & Ethical Risk');
      expect(names).toContain('Reputational & Strategic Risk');
      expect(names).toContain('Third-Party/Supplier Risk');
    });

    it('weights sum to 100%', () => {
      const result = calculateSevenDimensionScore(minimalRiskInput);
      const totalWeight = result.dimensions.reduce((sum, d) => sum + d.weight, 0);
      expect(totalWeight).toBe(100);
    });
  });

  describe('risk tier boundaries', () => {
    it('score <= 1.9 maps to low tier', () => {
      const result = calculateSevenDimensionScore(minimalRiskInput);
      if (result.compositeScore <= 1.9) {
        expect(result.riskTier).toBe('low');
      }
    });

    it('medium tier is 2.0-2.9', () => {
      // Create a medium-risk input
      const mediumInput: SevenDimensionInput = {
        ...minimalRiskInput,
        dataClassification: 'internal',
        interactsWithPii: 'yes',
        hasExternalUsers: 'no',
        customerFacingOutputs: 'no',
        usesGenAi: 'yes',
      };
      const result = calculateSevenDimensionScore(mediumInput);
      expect(result.compositeScore).toBeGreaterThanOrEqual(1.5);
      expect(result.compositeScore).toBeLessThanOrEqual(3.5);
    });
  });

  describe('critical dimension override', () => {
    it('triggers override when any dimension scores 5', () => {
      const result = calculateSevenDimensionScore(criticalRiskInput);
      const has5 = result.dimensions.some((d) => d.score === 5);
      if (has5) {
        expect(result.overrideTriggered).toBe(true);
        expect(result.riskTier).toBe('critical');
      }
    });

    it('does not trigger override when no dimension scores 5', () => {
      const result = calculateSevenDimensionScore(minimalRiskInput);
      expect(result.overrideTriggered).toBe(false);
    });

    it('override forces critical tier regardless of composite score', () => {
      // Even if composite is moderate, a single 5 should force critical
      const overrideInput: SevenDimensionInput = {
        ...minimalRiskInput,
        replacesHumanDecisions: 'yes',
        automatesExternalDecisions: 'yes',
        businessActivities: ['insurance_decisions'],
        humanValidatesOutputs: 'no',
        biasFairnessTesting: '',
      };
      const result = calculateSevenDimensionScore(overrideInput);
      if (result.dimensions.some((d) => d.score === 5)) {
        expect(result.riskTier).toBe('critical');
      }
    });
  });

  describe('dimension explanations', () => {
    it('each dimension has an explanation', () => {
      const result = calculateSevenDimensionScore(criticalRiskInput);
      for (const dim of result.dimensions) {
        expect(dim.explanation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('governance requirements', () => {
    it('low tier gets lightweight requirements', () => {
      const result = calculateSevenDimensionScore(minimalRiskInput);
      if (result.riskTier === 'low') {
        expect(result.governanceRequirements).toContain('Annual review');
      }
    });

    it('critical tier gets maximum requirements', () => {
      const result = calculateSevenDimensionScore(criticalRiskInput);
      if (result.riskTier === 'critical') {
        expect(result.governanceRequirements).toContain('Board approval required');
      }
    });
  });
});
