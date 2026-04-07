import { describe, expect, it } from 'vitest';
import { getClientConsistencyWarnings } from '@/components/wizard/ConsistencyWarnings';

describe('Client Consistency Warnings', () => {
  describe('existing warnings', () => {
    it('returns empty for clean state', () => {
      const warnings = getClientConsistencyWarnings({});
      expect(warnings).toEqual([]);
    });

    it('flags in-production without review', () => {
      const warnings = getClientConsistencyWarnings({
        lifecycleStage: 'in_production',
        previouslyReviewed: 'no',
      });
      expect(warnings.find((w) => w.id === 'production-not-reviewed')).toBeDefined();
    });

    it('flags enterprise strategy without sponsor', () => {
      const warnings = getClientConsistencyWarnings({
        strategicPriority: 'enterprise_strategy',
        executiveSponsor: '',
      });
      expect(warnings.find((w) => w.id === 'strategy-no-sponsor')).toBeDefined();
    });
  });

  describe('worst outcome cross-validation (Fix #7)', () => {
    it('flags minor outcome + financial area + external people', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'minor',
        businessArea: 'investments',
        whoAffected: 'external',
        highRiskTriggers: ['none_of_above'],
      });
      const w = warnings.find((w) => w.id === 'outcome-mismatch-financial');
      expect(w).toBeDefined();
      expect(w?.message).toContain('financial services area');
    });

    it('flags minor outcome + financial trigger + external people', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'minor',
        businessArea: 'customer_experience',
        highRiskTriggers: ['financial_info_retrieval'],
        whoAffected: 'both',
      });
      expect(warnings.find((w) => w.id === 'outcome-mismatch-financial')).toBeDefined();
    });

    it('flags minor outcome + large external population', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'minor',
        businessArea: 'it',
        highRiskTriggers: ['none_of_above'],
        whoAffected: 'external',
        peopleAffectedCount: 'over_100000',
      });
      expect(warnings.find((w) => w.id === 'outcome-mismatch-scale')).toBeDefined();
    });

    it('does NOT flag minor outcome for internal-only systems', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'minor',
        businessArea: 'investments',
        whoAffected: 'internal_only',
        highRiskTriggers: ['none_of_above'],
      });
      expect(warnings.find((w) => w.id === 'outcome-mismatch-financial')).toBeUndefined();
    });

    it('does NOT flag moderate or higher outcomes for financial areas', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'significant',
        businessArea: 'claims',
        whoAffected: 'external',
        highRiskTriggers: ['insurance_pricing'],
      });
      expect(warnings.find((w) => w.id === 'outcome-mismatch-financial')).toBeUndefined();
    });

    it('flags moderate outcome + high-risk decision trigger', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'moderate',
        highRiskTriggers: ['investment_advice'],
      });
      expect(warnings.find((w) => w.id === 'outcome-mismatch-trigger')).toBeDefined();
    });

    it('flags moderate outcome + hiring trigger', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'moderate',
        highRiskTriggers: ['hiring_workforce'],
      });
      expect(warnings.find((w) => w.id === 'outcome-mismatch-trigger')).toBeDefined();
    });

    it('does NOT flag moderate outcome with no high-risk triggers', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'moderate',
        highRiskTriggers: ['financial_info_retrieval'],
      });
      expect(warnings.find((w) => w.id === 'outcome-mismatch-trigger')).toBeUndefined();
    });

    // ── The exact chatbot scenario from user feedback ──
    it('flags the retirement chatbot scenario: minor + financial area + 50K+ external users', () => {
      const warnings = getClientConsistencyWarnings({
        worstOutcome: 'minor',
        businessArea: 'customer_experience',
        highRiskTriggers: ['financial_info_retrieval'],
        whoAffected: 'external',
        peopleAffectedCount: 'over_100000',
      });
      // Should flag either financial mismatch or scale mismatch
      const hasWarning =
        warnings.some((w) => w.id === 'outcome-mismatch-financial') ||
        warnings.some((w) => w.id === 'outcome-mismatch-scale');
      expect(hasWarning).toBe(true);
    });
  });
});
