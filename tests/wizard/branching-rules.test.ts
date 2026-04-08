import { describe, expect, it } from 'vitest';
import {
  calculateProgress,
  getInlineBanners,
  getVisibleIntakeQuestions,
  getVisibleIntakeStages,
  getVisibleQuestions,
  getWarningBanners,
  isFastTrackEligible,
} from '@/lib/questions/branching-rules';

describe('Intake Branching Rules', () => {
  describe('getVisibleIntakeQuestions', () => {
    // Updated: 30 always-visible (added intake-q29 reviewUrgency)
    it('shows 30 always-visible questions with no state', () => {
      const visible = getVisibleIntakeQuestions({});
      // 30 always-visible (all except q9a, q9b, q10a, q11a)
      expect(visible.size).toBe(30);
    });

    it('includes all Section A core questions', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q1')).toBe(true); // useCaseName
      expect(visible.has('intake-q2')).toBe(true); // useCaseOwner
      expect(visible.has('intake-q3')).toBe(true); // executiveSponsor
      expect(visible.has('intake-q4')).toBe(true); // businessArea
      expect(visible.has('intake-q5')).toBe(true); // businessProblem
      expect(visible.has('intake-q6')).toBe(true); // howAiHelps
      expect(visible.has('intake-q7')).toBe(true); // aiType
      expect(visible.has('intake-q8')).toBe(true); // buildOrAcquire
      expect(visible.has('intake-q9')).toBe(true); // thirdPartyInvolved
      expect(visible.has('intake-q10')).toBe(true); // usesFoundationModel
      expect(visible.has('intake-q11')).toBe(true); // deploymentRegions
      expect(visible.has('intake-q12')).toBe(true); // lifecycleStage
      expect(visible.has('intake-q13')).toBe(true); // previouslyReviewed
      expect(visible.has('intake-q14')).toBe(true); // highRiskTriggers
      expect(visible.has('intake-q15a')).toBe(true); // whoUsesSystem
      expect(visible.has('intake-q15b')).toBe(true); // whoAffected
      expect(visible.has('intake-q16')).toBe(true); // worstOutcome
    });

    it('includes all Section B questions', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q17')).toBe(true); // dataSensitivity
      expect(visible.has('intake-q18')).toBe(true); // humanOversight
      expect(visible.has('intake-q19')).toBe(true); // differentialTreatment
      expect(visible.has('intake-q20')).toBe(true); // peopleAffectedCount
      expect(visible.has('intake-q21')).toBe(true); // additionalNotes
    });

    it('includes all Section C questions including reviewUrgency', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q22')).toBe(true); // strategicPriority
      expect(visible.has('intake-q23')).toBe(true); // targetPocQuarter
      expect(visible.has('intake-q24')).toBe(true); // targetProductionQuarter
      expect(visible.has('intake-q25')).toBe(true); // valueDescription
      expect(visible.has('intake-q26')).toBe(true); // valueCreationLevers
      expect(visible.has('intake-q27')).toBe(true); // reflectedInBudget
      expect(visible.has('intake-q28')).toBe(true); // valueEstimate
      expect(visible.has('intake-q29')).toBe(true); // reviewUrgency
    });

    // ── Third-party vendor sub-fields (Q9a, Q9b) ──

    it('hides vendor sub-fields by default', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q9a')).toBe(false);
      expect(visible.has('intake-q9b')).toBe(false);
    });

    it('shows vendor sub-fields when thirdPartyInvolved = yes', () => {
      const visible = getVisibleIntakeQuestions({ thirdPartyInvolved: 'yes' });
      expect(visible.has('intake-q9a')).toBe(true); // vendorName
      expect(visible.has('intake-q9b')).toBe(true); // auditability
    });

    it('hides vendor sub-fields when thirdPartyInvolved = no', () => {
      const visible = getVisibleIntakeQuestions({ thirdPartyInvolved: 'no' });
      expect(visible.has('intake-q9a')).toBe(false);
      expect(visible.has('intake-q9b')).toBe(false);
    });

    // ── Foundation model sub-field (Q10a) ──

    it('hides which models by default', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q10a')).toBe(false);
    });

    it('shows which models when usesFoundationModel = yes', () => {
      const visible = getVisibleIntakeQuestions({ usesFoundationModel: 'yes' });
      expect(visible.has('intake-q10a')).toBe(true);
    });

    it('hides which models when usesFoundationModel = no', () => {
      const visible = getVisibleIntakeQuestions({ usesFoundationModel: 'no' });
      expect(visible.has('intake-q10a')).toBe(false);
    });

    it('hides which models when usesFoundationModel = dont_know', () => {
      const visible = getVisibleIntakeQuestions({ usesFoundationModel: 'dont_know' });
      expect(visible.has('intake-q10a')).toBe(false);
    });

    // ── Other region sub-field (Q11a) ──

    it('hides other region by default', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q11a')).toBe(false);
    });

    it('shows other region when deploymentRegions includes other', () => {
      const visible = getVisibleIntakeQuestions({ deploymentRegions: ['us_only', 'other'] });
      expect(visible.has('intake-q11a')).toBe(true);
    });

    it('hides other region when only US selected', () => {
      const visible = getVisibleIntakeQuestions({ deploymentRegions: ['us_only'] });
      expect(visible.has('intake-q11a')).toBe(false);
    });

    // ── Combination tests ──

    // Updated: 34 with all conditionals (was 33, now +1 for reviewUrgency)
    it('shows max questions (34) with all conditionals active', () => {
      const visible = getVisibleIntakeQuestions({
        thirdPartyInvolved: 'yes',
        usesFoundationModel: 'yes',
        deploymentRegions: ['us_only', 'other'],
      });
      // 30 always + 2 vendor + 1 model + 1 region = 34
      expect(visible.size).toBe(34);
    });

    it('shows minimum questions (30) with no conditionals triggered', () => {
      const visible = getVisibleIntakeQuestions({
        thirdPartyInvolved: 'no',
        usesFoundationModel: 'no',
        deploymentRegions: ['us_only'],
      });
      expect(visible.size).toBe(30);
    });
  });

  describe('getVisibleQuestions (ordered array)', () => {
    it('returns ordered array of visible question IDs', () => {
      const ids = getVisibleQuestions({});
      expect(ids.length).toBe(30);
      expect(ids[0]).toBe('intake-q1');
    });
  });

  describe('getVisibleIntakeStages', () => {
    it('always includes review stage', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toContain('review');
    });

    it('always includes section-a stage', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toContain('section-a');
    });

    it('always includes section-b stage', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toContain('section-b');
    });

    it('always includes section-c stage', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toContain('section-c');
    });

    it('returns all 4 stages in order', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toEqual(['section-a', 'section-b', 'section-c', 'review']);
    });
  });

  describe('getWarningBanners', () => {
    it('returns empty array (banners are now inline)', () => {
      const banners = getWarningBanners({});
      expect(banners).toEqual([]);
    });
  });

  describe('getInlineBanners', () => {
    it('returns empty array for clean state', () => {
      const banners = getInlineBanners({});
      expect(banners).toEqual([]);
    });

    it('shows non-US banner when EU/EEA selected', () => {
      const banners = getInlineBanners({ deploymentRegions: ['eu_eea'] });
      const banner = banners.find((b) => b.id === 'non-us-regions');
      expect(banner).toBeDefined();
      expect(banner?.severity).toBe('info');
      expect(banner?.afterQuestionId).toBe('intake-q11a');
    });

    it('does not show non-US banner when only US selected', () => {
      const banners = getInlineBanners({ deploymentRegions: ['us_only'] });
      expect(banners.find((b) => b.id === 'non-us-regions')).toBeUndefined();
    });

    it('shows unreviewed production warning', () => {
      const banners = getInlineBanners({
        lifecycleStage: 'in_production',
        previouslyReviewed: 'no',
      });
      const banner = banners.find((b) => b.id === 'unreviewed-production');
      expect(banner).toBeDefined();
      expect(banner?.severity).toBe('warning');
      expect(banner?.afterQuestionId).toBe('intake-q13');
    });

    it('does not show unreviewed warning when stage is not production', () => {
      const banners = getInlineBanners({
        lifecycleStage: 'idea_planning',
        previouslyReviewed: 'no',
      });
      expect(banners.find((b) => b.id === 'unreviewed-production')).toBeUndefined();
    });

    it('does not show unreviewed warning when previously reviewed', () => {
      const banners = getInlineBanners({
        lifecycleStage: 'in_production',
        previouslyReviewed: 'yes',
      });
      expect(banners.find((b) => b.id === 'unreviewed-production')).toBeUndefined();
    });

    it('shows high-risk trigger banner when triggers selected', () => {
      const banners = getInlineBanners({
        highRiskTriggers: ['insurance_pricing'],
      });
      const banner = banners.find((b) => b.id === 'high-risk-triggers');
      expect(banner).toBeDefined();
      expect(banner?.severity).toBe('info');
      expect(banner?.afterQuestionId).toBe('intake-q14');
    });

    it('does not show high-risk banner when only none_of_above selected', () => {
      const banners = getInlineBanners({
        highRiskTriggers: ['none_of_above'],
      });
      expect(banners.find((b) => b.id === 'high-risk-triggers')).toBeUndefined();
    });

    it('shows multiple banners when multiple conditions met', () => {
      const banners = getInlineBanners({
        deploymentRegions: ['eu_eea'],
        lifecycleStage: 'in_production',
        previouslyReviewed: 'no',
        highRiskTriggers: ['insurance_pricing'],
      });
      expect(banners.length).toBe(3);
    });
  });

  describe('calculateProgress', () => {
    it('returns 0% for empty state', () => {
      const progress = calculateProgress({});
      expect(progress.percentage).toBe(0);
      expect(progress.answered).toBe(0);
    });

    it('counts answered text questions', () => {
      const progress = calculateProgress({
        useCaseName: 'Test Use Case',
        businessArea: 'claims',
      });
      expect(progress.answered).toBe(2);
    });

    it('counts answered boolean questions', () => {
      const progress = calculateProgress({
        reflectedInBudget: true,
      });
      expect(progress.answered).toBe(1);
    });

    it('does not count empty arrays as answered', () => {
      const progress = calculateProgress({
        valueCreationLevers: [],
      });
      expect(progress.answered).toBe(0);
    });

    it('counts filled arrays as answered', () => {
      const progress = calculateProgress({
        valueCreationLevers: ['bv_acquire_new_customers'],
      });
      expect(progress.answered).toBe(1);
    });

    it('returns estimated minutes remaining', () => {
      const progress = calculateProgress({});
      expect(progress.estimatedMinutes).toBeGreaterThan(0);
    });

    it('reduces estimated time as questions are answered', () => {
      const empty = calculateProgress({});
      const partial = calculateProgress({
        useCaseName: 'Test',
        useCaseOwner: 'John Doe',
        executiveSponsor: 'Jane Smith',
        businessArea: 'it',
        businessProblem: 'Need to automate data processing',
        howAiHelps: 'AI will classify and route documents',
      });
      expect(partial.estimatedMinutes).toBeLessThan(empty.estimatedMinutes);
    });
  });

  describe('isFastTrackEligible', () => {
    /** Build a state that meets every fast-track condition */
    function eligibleState() {
      return {
        thirdPartyInvolved: 'yes',
        aiType: ['generative_ai'],
        dataSensitivity: ['public', 'internal'],
        highRiskTriggers: ['none_of_above'],
        whoUsesSystem: 'internal_only' as const,
        whoAffected: 'internal_only' as const,
        worstOutcome: 'minor',
      };
    }

    it('returns true when all conditions are met', () => {
      expect(isFastTrackEligible(eligibleState())).toBe(true);
    });

    it('returns false when not third-party', () => {
      expect(isFastTrackEligible({ ...eligibleState(), thirdPartyInvolved: 'no' })).toBe(false);
    });

    it('returns false when AI type does not include generative_ai', () => {
      expect(
        isFastTrackEligible({ ...eligibleState(), aiType: ['predictive_classification'] }),
      ).toBe(false);
    });

    it('returns false when data sensitivity includes PII', () => {
      expect(
        isFastTrackEligible({ ...eligibleState(), dataSensitivity: ['public', 'personal_info'] }),
      ).toBe(false);
    });

    it('returns false when data sensitivity includes customer confidential', () => {
      expect(
        isFastTrackEligible({
          ...eligibleState(),
          dataSensitivity: ['public', 'customer_confidential'],
        }),
      ).toBe(false);
    });

    it('returns false when a substantive high-risk trigger is selected', () => {
      expect(
        isFastTrackEligible({ ...eligibleState(), highRiskTriggers: ['investment_advice'] }),
      ).toBe(false);
    });

    it('returns false when financial_info_retrieval is the only trigger (still allowed)', () => {
      // financial_info_retrieval is treated as low-risk and SHOULD allow fast-track
      // when combined with otherwise eligible state
      expect(
        isFastTrackEligible({
          ...eligibleState(),
          highRiskTriggers: ['financial_info_retrieval'],
        }),
      ).toBe(true);
    });

    it('returns false when external users are present', () => {
      expect(isFastTrackEligible({ ...eligibleState(), whoUsesSystem: 'external_only' })).toBe(
        false,
      );
    });

    it('returns false when external people are affected', () => {
      expect(isFastTrackEligible({ ...eligibleState(), whoAffected: 'external' })).toBe(false);
    });

    it('returns false when worst outcome is significant', () => {
      expect(isFastTrackEligible({ ...eligibleState(), worstOutcome: 'significant' })).toBe(false);
    });

    it('returns false when worst outcome is serious', () => {
      expect(isFastTrackEligible({ ...eligibleState(), worstOutcome: 'serious' })).toBe(false);
    });

    it('returns false when state is empty', () => {
      expect(isFastTrackEligible({})).toBe(false);
    });
  });

  describe('Fast-track section visibility', () => {
    /** Build a state that meets fast-track eligibility */
    function eligibleState() {
      return {
        thirdPartyInvolved: 'yes',
        aiType: ['generative_ai'],
        dataSensitivity: ['public'],
        highRiskTriggers: ['none_of_above'],
        whoUsesSystem: 'internal_only' as const,
        whoAffected: 'internal_only' as const,
        worstOutcome: 'minor',
      };
    }

    it('hides section-c questions when fast-track is opted in', () => {
      const visible = getVisibleIntakeQuestions({ ...eligibleState(), fastTrackOptIn: true });
      expect(visible.has('intake-q22')).toBe(false); // strategicPriority
      expect(visible.has('intake-q26')).toBe(false); // valueCreationLevers
      expect(visible.has('intake-q29')).toBe(false); // reviewUrgency
    });

    it('hides section-c stage when fast-track is opted in', () => {
      const stages = getVisibleIntakeStages({ ...eligibleState(), fastTrackOptIn: true });
      expect(stages).not.toContain('section-c');
      expect(stages).toContain('review');
    });

    it('shows section-c when fast-track is opted in but no longer eligible', () => {
      // User opted in, then changed data sensitivity to include PII
      const visible = getVisibleIntakeQuestions({
        ...eligibleState(),
        dataSensitivity: ['personal_info'],
        fastTrackOptIn: true,
      });
      expect(visible.has('intake-q22')).toBe(true); // section-c reappears
    });

    it('shows section-c when fast-track is declined', () => {
      const visible = getVisibleIntakeQuestions({
        ...eligibleState(),
        fastTrackOptIn: false,
      });
      expect(visible.has('intake-q22')).toBe(true);
    });

    it('shows section-c when fast-track decision not yet made', () => {
      const visible = getVisibleIntakeQuestions({ ...eligibleState() });
      expect(visible.has('intake-q22')).toBe(true);
    });
  });

  describe('Shadow AI banner', () => {
    it('shows informational banner for in_use_seeking_approval lifecycle', () => {
      const banners = getInlineBanners({ lifecycleStage: 'in_use_seeking_approval' });
      const banner = banners.find((b) => b.id === 'shadow-ai-informal-use');
      expect(banner).toBeDefined();
      expect(banner?.severity).toBe('info');
    });

    it('does not show shadow-ai banner for other lifecycle stages', () => {
      const banners = getInlineBanners({ lifecycleStage: 'in_production' });
      expect(banners.find((b) => b.id === 'shadow-ai-informal-use')).toBeUndefined();
    });
  });
});
