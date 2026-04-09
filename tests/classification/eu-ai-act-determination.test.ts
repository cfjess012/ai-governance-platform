import { describe, expect, it } from 'vitest';
import {
  classifyEuAiActAssessment,
  type EuAssessmentInput,
} from '@/lib/classification/eu-ai-act-determination';

const baseInput: EuAssessmentInput = {
  deploymentRegions: ['us'],
  businessActivities: ['none'],
  replacesHumanDecisions: 'no',
  automatesExternalDecisions: 'no',
  monitorsHumanActivity: 'no',
  usesGenAi: 'no',
  customerFacingOutputs: 'no',
  hasExternalUsers: 'no',
  interactsWithPii: 'no',
  dataClassification: 'public',
};

describe('EU AI Act Assessment Classification', () => {
  describe('No EU nexus', () => {
    it('returns minimal with hasEuNexus=false when no EU deployment', () => {
      const result = classifyEuAiActAssessment({ ...baseInput, deploymentRegions: ['us'] });
      expect(result.tier).toBe('minimal');
      expect(result.hasEuNexus).toBe(false);
      expect(result.triggers).toHaveLength(0);
    });
  });

  describe('High Risk (Annex III)', () => {
    it('flags insurance decisions in EU as high risk', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        businessActivities: ['insurance_decisions'],
      });
      expect(result.tier).toBe('high');
      expect(result.hasEuNexus).toBe(true);
      expect(result.triggers.some((t) => t.annexRef === 'Annex III #5a')).toBe(true);
    });

    it('flags investment decisions in EU as high risk', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        businessActivities: ['investment_decisions'],
      });
      expect(result.tier).toBe('high');
      expect(result.triggers.some((t) => t.annexRef === 'Annex III #5b')).toBe(true);
    });

    it('flags automated hiring in EU as high risk', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        businessActivities: ['hr_automated_hiring'],
      });
      expect(result.tier).toBe('high');
      expect(result.triggers.some((t) => t.annexRef === 'Annex III #4')).toBe(true);
    });

    it('flags pricing/underwriting in EU as high risk', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        businessActivities: ['pricing_underwriting'],
      });
      expect(result.tier).toBe('high');
      expect(result.triggers.some((t) => t.annexRef === 'Annex III #5a')).toBe(true);
    });

    it('flags automated decisions replacing humans in regulated activity', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        businessActivities: ['insurance_decisions'],
        replacesHumanDecisions: 'yes',
      });
      expect(result.tier).toBe('high');
      expect(result.triggers.length).toBeGreaterThan(1);
    });

    it('flags workforce monitoring in HR context', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        businessActivities: ['hr_workforce_monitoring'],
        monitorsHumanActivity: 'yes',
      });
      expect(result.tier).toBe('high');
    });

    it('includes high-risk obligations', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        businessActivities: ['insurance_decisions'],
      });
      expect(result.obligations.length).toBeGreaterThan(5);
      expect(result.obligations.some((o) => o.includes('Article 9'))).toBe(true);
    });
  });

  describe('Limited Risk (Article 50)', () => {
    it('flags GenAI in EU as limited risk', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        usesGenAi: 'yes',
      });
      expect(result.tier).toBe('limited');
      expect(result.triggers.some((t) => t.annexRef === 'Article 50')).toBe(true);
    });

    it('flags customer-facing outputs in EU as limited risk', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        customerFacingOutputs: 'yes',
      });
      expect(result.tier).toBe('limited');
    });

    it('flags external users in EU as limited risk', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        hasExternalUsers: 'yes',
      });
      expect(result.tier).toBe('limited');
    });

    it('includes limited risk obligations', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        usesGenAi: 'yes',
      });
      expect(result.obligations.some((o) => o.includes('Article 50'))).toBe(true);
    });
  });

  describe('Minimal Risk', () => {
    it('returns minimal for low-risk internal EU system', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
      });
      expect(result.tier).toBe('minimal');
      expect(result.hasEuNexus).toBe(true);
      expect(result.triggers).toHaveLength(0);
    });
  });

  describe('Priority ordering', () => {
    it('high risk takes priority over limited risk', () => {
      const result = classifyEuAiActAssessment({
        ...baseInput,
        deploymentRegions: ['eu'],
        businessActivities: ['insurance_decisions'],
        usesGenAi: 'yes',
        customerFacingOutputs: 'yes',
      });
      expect(result.tier).toBe('high');
    });
  });
});
