import { describe, expect, it } from 'vitest';
import { classifyEuAiAct } from '@/lib/classification/eu-ai-act';

const baseInput = {
  geographicScope: ['us_only'] as const,
  primaryBusinessActivity: 'research' as const,
  dataTypes: ['public'] as const,
  decisionsAboutIndividuals: 'no' as const,
  expectedUserBase: 'internal_small',
  hasAgentCapabilities: false,
};

describe('EU AI Act Classification', () => {
  describe('No EU nexus', () => {
    it('returns minimal with mandatory=false when no EU scope', () => {
      const result = classifyEuAiAct({ ...baseInput, geographicScope: ['us_only'] });
      expect(result.tier).toBe('minimal');
      expect(result.mandatory).toBe(false);
    });
  });

  describe('Prohibited tier', () => {
    it('flags biometric + HR + automated decisions in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        primaryBusinessActivity: 'hr',
        dataTypes: ['biometric'],
        decisionsAboutIndividuals: 'automated',
      });
      expect(result.tier).toBe('prohibited');
      expect(result.mandatory).toBe(true);
      expect(result.triggers.length).toBeGreaterThan(0);
    });

    it('flags unrestricted autonomous agents in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        hasAgentCapabilities: true,
        agentAutonomyLevel: 'unrestricted',
      });
      expect(result.tier).toBe('prohibited');
    });
  });

  describe('High risk tier', () => {
    it('flags underwriting with automated decisions in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        primaryBusinessActivity: 'underwriting',
        decisionsAboutIndividuals: 'automated',
      });
      expect(result.tier).toBe('high');
    });

    it('flags fraud detection with assisted decisions in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        primaryBusinessActivity: 'fraud_detection',
        decisionsAboutIndividuals: 'assists',
      });
      expect(result.tier).toBe('high');
    });

    it('flags PII + automated decisions in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        dataTypes: ['pii'],
        decisionsAboutIndividuals: 'automated',
      });
      expect(result.tier).toBe('high');
    });

    it('flags PHI + automated decisions in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        dataTypes: ['phi'],
        decisionsAboutIndividuals: 'automated',
      });
      expect(result.tier).toBe('high');
    });

    it('flags compliance + automated decisions in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        primaryBusinessActivity: 'compliance',
        decisionsAboutIndividuals: 'automated',
      });
      expect(result.tier).toBe('high');
    });

    it('classifies global scope as EU-applicable', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['global'],
        primaryBusinessActivity: 'hr',
        decisionsAboutIndividuals: 'assists',
      });
      expect(result.tier).toBe('high');
      expect(result.mandatory).toBe(true);
    });
  });

  describe('Limited risk tier', () => {
    it('flags external-facing systems in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        expectedUserBase: 'external_broad',
      });
      expect(result.tier).toBe('limited');
    });

    it('flags external_limited user base in EU', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        expectedUserBase: 'external_limited',
      });
      expect(result.tier).toBe('limited');
    });
  });

  describe('Minimal risk tier', () => {
    it('returns minimal for low-risk internal EU system', () => {
      const result = classifyEuAiAct({
        ...baseInput,
        geographicScope: ['eu'],
        dataTypes: ['public'],
        decisionsAboutIndividuals: 'no',
        expectedUserBase: 'internal_small',
      });
      expect(result.tier).toBe('minimal');
      expect(result.mandatory).toBe(true);
    });
  });
});
