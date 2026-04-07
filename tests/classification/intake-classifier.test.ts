import { describe, expect, it } from 'vitest';
import {
  classifyEuAiActIntake,
  classifyIntake,
  detectRiskSignals,
} from '@/lib/classification/intake-classifier';

describe('Intake Classifier', () => {
  describe('classifyEuAiActIntake', () => {
    it('returns potentially_high_or_prohibited when prohibited triggers selected', () => {
      const result = classifyEuAiActIntake({ highRiskTriggers: ['fine_tuning_llm'] });
      expect(result.indicator).toBe('potentially_high_or_prohibited');
      expect(result.color).toBe('red');
    });

    it('returns potentially_high_or_prohibited for biometric triggers', () => {
      const result = classifyEuAiActIntake({ highRiskTriggers: ['biometric_id'] });
      expect(result.indicator).toBe('potentially_high_or_prohibited');
      expect(result.color).toBe('red');
    });

    it('returns potentially_high_or_prohibited for emotion detection triggers', () => {
      const result = classifyEuAiActIntake({ highRiskTriggers: ['emotion_detection'] });
      expect(result.indicator).toBe('potentially_high_or_prohibited');
      expect(result.color).toBe('red');
    });

    it('returns likely_high_financial for insurance business area', () => {
      const result = classifyEuAiActIntake({ businessArea: 'claims' });
      expect(result.indicator).toBe('likely_high_financial');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_financial for investment business area', () => {
      const result = classifyEuAiActIntake({ businessArea: 'investments' });
      expect(result.indicator).toBe('likely_high_financial');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_financial for insurance pricing triggers', () => {
      const result = classifyEuAiActIntake({ highRiskTriggers: ['insurance_pricing'] });
      expect(result.indicator).toBe('likely_high_financial');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_financial for investment advice triggers', () => {
      const result = classifyEuAiActIntake({ highRiskTriggers: ['investment_advice'] });
      expect(result.indicator).toBe('likely_high_financial');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_employment when descriptions mention hiring', () => {
      const result = classifyEuAiActIntake({
        businessProblem: 'Automate hiring decisions for the engineering team',
      });
      expect(result.indicator).toBe('likely_high_employment');
      expect(result.color).toBe('amber');
    });

    it('returns likely_high_employment for hiring triggers', () => {
      const result = classifyEuAiActIntake({ highRiskTriggers: ['hiring_workforce'] });
      expect(result.indicator).toBe('likely_high_employment');
      expect(result.color).toBe('amber');
    });

    it('returns to_be_determined for generic use case', () => {
      const result = classifyEuAiActIntake({
        businessProblem: 'Generate marketing reports from data',
        businessArea: 'marketing',
      });
      expect(result.indicator).toBe('to_be_determined');
      expect(result.color).toBe('gray');
    });

    it('returns to_be_determined with no input', () => {
      const result = classifyEuAiActIntake({});
      expect(result.indicator).toBe('to_be_determined');
    });

    it('prioritizes prohibited triggers over financial area', () => {
      const result = classifyEuAiActIntake({
        highRiskTriggers: ['biometric_id'],
        businessArea: 'claims',
      });
      expect(result.indicator).toBe('potentially_high_or_prohibited');
    });

    it('prioritizes financial triggers over employment keywords', () => {
      const result = classifyEuAiActIntake({
        highRiskTriggers: ['insurance_pricing'],
        businessProblem: 'Hiring tool',
      });
      expect(result.indicator).toBe('likely_high_financial');
    });

    // ── New: financial_info_retrieval trigger does NOT trigger high-risk financial classification ──
    it('does not classify financial_info_retrieval alone as high-risk financial', () => {
      const result = classifyEuAiActIntake({
        highRiskTriggers: ['financial_info_retrieval'],
        businessArea: 'customer_experience',
      });
      // financial_info_retrieval is NOT in FINANCIAL_TRIGGERS, so it should be TBD
      // unless a financial business area is present
      expect(result.indicator).toBe('to_be_determined');
    });

    it('classifies financial_info_retrieval in a financial business area as high-risk', () => {
      const result = classifyEuAiActIntake({
        highRiskTriggers: ['financial_info_retrieval'],
        businessArea: 'investments',
      });
      // The business area alone triggers financial classification
      expect(result.indicator).toBe('likely_high_financial');
    });
  });

  describe('detectRiskSignals', () => {
    it('returns empty array for clean input', () => {
      const signals = detectRiskSignals({
        highRiskTriggers: ['none_of_above'],
        buildOrAcquire: 'custom_development',
      });
      expect(signals).toEqual([]);
    });

    it('flags high-risk triggers', () => {
      const signals = detectRiskSignals({ highRiskTriggers: ['insurance_pricing'] });
      expect(signals.find((s) => s.id === 'high_risk_triggers')).toBeDefined();
      expect(signals.find((s) => s.id === 'high_risk_triggers')?.severity).toBe('amber');
    });

    it('flags citizen development', () => {
      const signals = detectRiskSignals({ buildOrAcquire: 'citizen_development' });
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe('citizen_development');
      expect(signals[0].severity).toBe('blue');
    });

    it('flags unknown build type', () => {
      const signals = detectRiskSignals({ buildOrAcquire: 'not_sure_yet' });
      expect(signals.find((s) => s.id === 'unknown_build')).toBeDefined();
    });

    it('flags serious outcome', () => {
      const signals = detectRiskSignals({ worstOutcome: 'serious' });
      expect(signals.find((s) => s.id === 'serious_outcome')).toBeDefined();
      expect(signals.find((s) => s.id === 'serious_outcome')?.severity).toBe('red');
    });

    it('flags fully autonomous oversight', () => {
      const signals = detectRiskSignals({ humanOversight: 'fully_autonomous' });
      expect(signals.find((s) => s.id === 'fully_autonomous')).toBeDefined();
    });

    it('flags EU/EEA deployment', () => {
      const signals = detectRiskSignals({ deploymentRegions: ['eu_eea'] });
      expect(signals.find((s) => s.id === 'eu_deployment')).toBeDefined();
    });

    it('can return multiple signals', () => {
      const signals = detectRiskSignals({
        highRiskTriggers: ['insurance_pricing'],
        buildOrAcquire: 'citizen_development',
        worstOutcome: 'serious',
      });
      expect(signals.length).toBeGreaterThanOrEqual(3);
    });

    it('does not flag none_of_above as high-risk', () => {
      const signals = detectRiskSignals({ highRiskTriggers: ['none_of_above'] });
      expect(signals.find((s) => s.id === 'high_risk_triggers')).toBeUndefined();
    });

    // ── New: financial_info_retrieval signal tests ──

    it('produces a blue financial_info_retrieval signal instead of amber high-risk', () => {
      const signals = detectRiskSignals({ highRiskTriggers: ['financial_info_retrieval'] });
      expect(signals.find((s) => s.id === 'financial_info_retrieval')).toBeDefined();
      expect(signals.find((s) => s.id === 'financial_info_retrieval')?.severity).toBe('blue');
      // Should NOT produce the amber high_risk_triggers signal
      expect(signals.find((s) => s.id === 'high_risk_triggers')).toBeUndefined();
    });

    it('produces both signals when financial_info_retrieval combined with a real high-risk trigger', () => {
      const signals = detectRiskSignals({
        highRiskTriggers: ['financial_info_retrieval', 'insurance_pricing'],
      });
      expect(signals.find((s) => s.id === 'financial_info_retrieval')).toBeDefined();
      expect(signals.find((s) => s.id === 'high_risk_triggers')).toBeDefined();
    });
  });

  describe('classifyIntake (combined)', () => {
    it('returns both EU AI Act result and risk signals', () => {
      const result = classifyIntake({
        highRiskTriggers: ['biometric_id', 'insurance_pricing'],
        buildOrAcquire: 'citizen_development',
      });
      expect(result.euAiAct.indicator).toBe('potentially_high_or_prohibited');
      expect(result.riskSignals.length).toBeGreaterThanOrEqual(2);
    });

    it('returns clean result for low-risk input', () => {
      const result = classifyIntake({
        businessProblem: 'Generate weekly analytics dashboards',
        businessArea: 'marketing',
        highRiskTriggers: ['none_of_above'],
        buildOrAcquire: 'using_existing_tool',
      });
      expect(result.euAiAct.indicator).toBe('to_be_determined');
      expect(result.riskSignals).toHaveLength(0);
    });

    // ── New: the chatbot scenario from user feedback ──
    it('handles FAQ chatbot scenario correctly (financial_info_retrieval + customer_experience)', () => {
      const result = classifyIntake({
        businessProblem:
          'Answer participant questions about retirement plan rules and contribution limits',
        businessArea: 'customer_experience',
        highRiskTriggers: ['financial_info_retrieval'],
        buildOrAcquire: 'buying_new_vendor',
        deploymentRegions: ['us_only'],
      });
      // Should NOT be classified as high-risk financial (it's info retrieval, not advice)
      expect(result.euAiAct.indicator).toBe('to_be_determined');
      // Should get the lighter blue signal, not the amber high-risk one
      const infoSignal = result.riskSignals.find((s) => s.id === 'financial_info_retrieval');
      expect(infoSignal).toBeDefined();
      expect(infoSignal?.severity).toBe('blue');
      expect(result.riskSignals.find((s) => s.id === 'high_risk_triggers')).toBeUndefined();
    });
  });
});
