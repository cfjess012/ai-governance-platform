import { describe, expect, it } from 'vitest';
import {
  classifyEuAiActIntake,
  classifyIntake,
  detectRiskSignals,
} from '@/lib/classification/intake-classifier';

describe('Intake Classifier', () => {
  describe('classifyEuAiActIntake', () => {
    it('returns potentially_high_or_prohibited when prohibited practices = yes', () => {
      const result = classifyEuAiActIntake({ prohibitedPractices: 'yes' });
      expect(result.indicator).toBe('potentially_high_or_prohibited');
      expect(result.color).toBe('red');
    });

    it('returns likely_high_financial for insurance business area', () => {
      const result = classifyEuAiActIntake({ businessArea: 'Insurance Operations' });
      expect(result.indicator).toBe('likely_high_financial');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_financial for investment business area', () => {
      const result = classifyEuAiActIntake({ businessArea: 'Investment Management' });
      expect(result.indicator).toBe('likely_high_financial');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_financial for credit business area', () => {
      const result = classifyEuAiActIntake({ businessArea: 'Credit Risk' });
      expect(result.indicator).toBe('likely_high_financial');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_financial for underwriting business area', () => {
      const result = classifyEuAiActIntake({ businessArea: 'Underwriting' });
      expect(result.indicator).toBe('likely_high_financial');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_employment when business purpose mentions hiring', () => {
      const result = classifyEuAiActIntake({
        businessPurpose: 'Automate hiring decisions for the engineering team',
      });
      expect(result.indicator).toBe('likely_high_employment');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_employment when business purpose mentions recruitment', () => {
      const result = classifyEuAiActIntake({
        businessPurpose: 'AI-driven recruitment screening tool',
      });
      expect(result.indicator).toBe('likely_high_employment');
      expect(result.color).toBe('amber');
    });

    it('returns to_be_determined for generic use case', () => {
      const result = classifyEuAiActIntake({
        businessPurpose: 'Generate marketing reports from data',
        businessArea: 'Marketing',
      });
      expect(result.indicator).toBe('to_be_determined');
      expect(result.color).toBe('gray');
    });

    it('returns to_be_determined with no input', () => {
      const result = classifyEuAiActIntake({});
      expect(result.indicator).toBe('to_be_determined');
    });

    it('prioritizes prohibited practices over financial area', () => {
      const result = classifyEuAiActIntake({
        prohibitedPractices: 'yes',
        businessArea: 'Insurance',
      });
      expect(result.indicator).toBe('potentially_high_or_prohibited');
    });

    it('prioritizes financial area over employment keywords', () => {
      const result = classifyEuAiActIntake({
        businessArea: 'Insurance',
        businessPurpose: 'Hiring tool',
      });
      expect(result.indicator).toBe('likely_high_financial');
    });
  });

  describe('detectRiskSignals', () => {
    it('returns empty array for clean input', () => {
      const signals = detectRiskSignals({
        ethicalAiAligned: true,
        prohibitedPractices: 'no',
        solutionType: 'custom',
      });
      expect(signals).toEqual([]);
    });

    it('flags ethical AI misalignment', () => {
      const signals = detectRiskSignals({ ethicalAiAligned: false });
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe('ethical_misalignment');
      expect(signals[0].severity).toBe('red');
    });

    it('flags regulated practices', () => {
      const signals = detectRiskSignals({ prohibitedPractices: 'yes' });
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe('regulated_practices');
      expect(signals[0].severity).toBe('amber');
    });

    it('flags citizen development', () => {
      const signals = detectRiskSignals({ solutionType: 'citizen_development' });
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe('citizen_development');
      expect(signals[0].severity).toBe('blue');
    });

    it('can return multiple signals', () => {
      const signals = detectRiskSignals({
        ethicalAiAligned: false,
        prohibitedPractices: 'yes',
        solutionType: 'citizen_development',
      });
      expect(signals).toHaveLength(3);
    });

    it('does not flag when ethical AI is aligned', () => {
      const signals = detectRiskSignals({ ethicalAiAligned: true });
      expect(signals.find((s) => s.id === 'ethical_misalignment')).toBeUndefined();
    });

    it('does not flag prohibited when answer is no', () => {
      const signals = detectRiskSignals({ prohibitedPractices: 'no' });
      expect(signals.find((s) => s.id === 'regulated_practices')).toBeUndefined();
    });

    it('does not flag prohibited when answer is none', () => {
      const signals = detectRiskSignals({ prohibitedPractices: 'none' });
      expect(signals.find((s) => s.id === 'regulated_practices')).toBeUndefined();
    });
  });

  describe('classifyIntake (combined)', () => {
    it('returns both EU AI Act result and risk signals', () => {
      const result = classifyIntake({
        prohibitedPractices: 'yes',
        ethicalAiAligned: false,
        solutionType: 'citizen_development',
      });
      expect(result.euAiAct.indicator).toBe('potentially_high_or_prohibited');
      expect(result.riskSignals).toHaveLength(3);
    });

    it('returns clean result for low-risk input', () => {
      const result = classifyIntake({
        businessPurpose: 'Generate weekly analytics dashboards',
        businessArea: 'Marketing',
        ethicalAiAligned: true,
        prohibitedPractices: 'no',
        solutionType: 'existing_tool',
      });
      expect(result.euAiAct.indicator).toBe('to_be_determined');
      expect(result.riskSignals).toHaveLength(0);
    });
  });
});
