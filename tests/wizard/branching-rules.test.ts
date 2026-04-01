import { describe, expect, it } from 'vitest';
import {
  calculateProgress,
  getVisibleIntakeQuestions,
  getVisibleIntakeStages,
  getVisibleQuestions,
  getWarningBanners,
} from '@/lib/questions/branching-rules';

describe('Intake Branching Rules', () => {
  describe('getVisibleIntakeQuestions', () => {
    it('shows 14 always-visible questions with no state', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.size).toBe(14);
    });

    it('includes all Stage 1 (Quick Intake) questions', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q1')).toBe(true); // useCaseName
      expect(visible.has('intake-q2')).toBe(true); // solutionType
      expect(visible.has('intake-q3')).toBe(true); // businessPurpose
      expect(visible.has('intake-q4')).toBe(true); // businessArea
      expect(visible.has('intake-q5')).toBe(true); // useCaseOwner
      expect(visible.has('intake-q6')).toBe(true); // ethicalAiAligned
      expect(visible.has('intake-q7')).toBe(true); // prohibitedPractices
    });

    it('includes Stage 2 core questions (not target dates)', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q8')).toBe(true); // lifecycleStage
      expect(visible.has('intake-q9')).toBe(true); // useStatus
      expect(visible.has('intake-q10')).toBe(true); // executiveSponsor
      expect(visible.has('intake-q11')).toBe(true); // strategicPriority
    });

    it('includes Stage 3 core questions (not value estimate)', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q14')).toBe(true); // valueDescription
      expect(visible.has('intake-q15')).toBe(true); // valueCreationLevers
      expect(visible.has('intake-q16')).toBe(true); // reflectedInBudget
    });

    // ── Target date visibility (Q12, Q13) ──

    it('hides target dates by default (no lifecycle stage set)', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q12')).toBe(false);
      expect(visible.has('intake-q13')).toBe(false);
    });

    it('shows target dates when lifecycle = ideation', () => {
      const visible = getVisibleIntakeQuestions({ lifecycleStage: 'ideation' });
      expect(visible.has('intake-q12')).toBe(true);
      expect(visible.has('intake-q13')).toBe(true);
    });

    it('shows target dates when lifecycle = in_development', () => {
      const visible = getVisibleIntakeQuestions({ lifecycleStage: 'in_development' });
      expect(visible.has('intake-q12')).toBe(true);
      expect(visible.has('intake-q13')).toBe(true);
    });

    it('shows target dates when lifecycle = poc', () => {
      const visible = getVisibleIntakeQuestions({ lifecycleStage: 'poc' });
      expect(visible.has('intake-q12')).toBe(true);
      expect(visible.has('intake-q13')).toBe(true);
    });

    it('hides target dates when lifecycle = in_production', () => {
      const visible = getVisibleIntakeQuestions({ lifecycleStage: 'in_production' });
      expect(visible.has('intake-q12')).toBe(false);
      expect(visible.has('intake-q13')).toBe(false);
    });

    it('hides target dates when lifecycle = backlog', () => {
      const visible = getVisibleIntakeQuestions({ lifecycleStage: 'backlog' });
      expect(visible.has('intake-q12')).toBe(false);
      expect(visible.has('intake-q13')).toBe(false);
    });

    it('hides target dates when lifecycle = cancelled', () => {
      const visible = getVisibleIntakeQuestions({ lifecycleStage: 'cancelled' });
      expect(visible.has('intake-q12')).toBe(false);
      expect(visible.has('intake-q13')).toBe(false);
    });

    it('hides target dates when lifecycle = decommissioned', () => {
      const visible = getVisibleIntakeQuestions({ lifecycleStage: 'decommissioned' });
      expect(visible.has('intake-q12')).toBe(false);
      expect(visible.has('intake-q13')).toBe(false);
    });

    // ── Value estimate visibility (Q17) ──

    it('hides value estimate by default (no budget answer)', () => {
      const visible = getVisibleIntakeQuestions({});
      expect(visible.has('intake-q17')).toBe(false);
    });

    it('shows value estimate when budget = yes', () => {
      const visible = getVisibleIntakeQuestions({ reflectedInBudget: 'yes' });
      expect(visible.has('intake-q17')).toBe(true);
    });

    it('shows value estimate when budget = no', () => {
      const visible = getVisibleIntakeQuestions({ reflectedInBudget: 'no' });
      expect(visible.has('intake-q17')).toBe(true);
    });

    it('hides value estimate when budget = none', () => {
      const visible = getVisibleIntakeQuestions({ reflectedInBudget: 'none' });
      expect(visible.has('intake-q17')).toBe(false);
    });

    // ── Combination tests ──

    it('shows maximum questions (17) with early lifecycle + budget yes', () => {
      const visible = getVisibleIntakeQuestions({
        lifecycleStage: 'ideation',
        reflectedInBudget: 'yes',
      });
      expect(visible.size).toBe(17);
    });

    it('shows minimum questions (14) with late lifecycle + budget none', () => {
      const visible = getVisibleIntakeQuestions({
        lifecycleStage: 'in_production',
        reflectedInBudget: 'none',
      });
      expect(visible.size).toBe(14);
    });

    it('shows 16 questions with early lifecycle + no budget detail', () => {
      const visible = getVisibleIntakeQuestions({
        lifecycleStage: 'poc',
        reflectedInBudget: 'none',
      });
      // 14 always + 2 dates = 16
      expect(visible.size).toBe(16);
    });

    it('shows 15 questions with late lifecycle + budget yes', () => {
      const visible = getVisibleIntakeQuestions({
        lifecycleStage: 'in_production',
        reflectedInBudget: 'yes',
      });
      // 14 always + Q17 = 15
      expect(visible.size).toBe(15);
    });

    // ── Solution type does NOT hide questions (handled in sidebar) ──

    it('existing_tool does not reduce question count', () => {
      const visible = getVisibleIntakeQuestions({
        solutionType: 'existing_tool',
        lifecycleStage: 'ideation',
      });
      // Target dates still show based on lifecycle
      expect(visible.has('intake-q12')).toBe(true);
      expect(visible.has('intake-q13')).toBe(true);
    });

    it('citizen_development shows same questions as custom', () => {
      const citizenDev = getVisibleIntakeQuestions({
        solutionType: 'citizen_development',
        lifecycleStage: 'poc',
      });
      const custom = getVisibleIntakeQuestions({
        solutionType: 'custom',
        lifecycleStage: 'poc',
      });
      expect(citizenDev.size).toBe(custom.size);
    });
  });

  describe('getVisibleQuestions (ordered array)', () => {
    it('returns ordered array of visible question IDs', () => {
      const ids = getVisibleQuestions({});
      expect(ids.length).toBe(14);
      expect(ids[0]).toBe('intake-q1');
      expect(ids[ids.length - 1]).toBe('intake-q16');
    });

    it('includes target dates in order when lifecycle is early', () => {
      const ids = getVisibleQuestions({ lifecycleStage: 'ideation' });
      const q12idx = ids.indexOf('intake-q12');
      const q13idx = ids.indexOf('intake-q13');
      expect(q12idx).toBeGreaterThan(-1);
      expect(q13idx).toBe(q12idx + 1);
    });
  });

  describe('getVisibleIntakeStages', () => {
    it('always includes review stage', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toContain('review');
    });

    it('always includes quick-intake stage', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toContain('quick-intake');
    });

    it('always includes strategic-alignment stage', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toContain('strategic-alignment');
    });

    it('always includes value-capture stage', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toContain('value-capture');
    });

    it('returns all 4 stages in order', () => {
      const stages = getVisibleIntakeStages({});
      expect(stages).toEqual([
        'quick-intake',
        'strategic-alignment',
        'value-capture',
        'review',
      ]);
    });
  });

  describe('getWarningBanners', () => {
    it('returns empty array for clean state', () => {
      const banners = getWarningBanners({});
      expect(banners).toEqual([]);
    });

    it('returns empty array when ethical AI is aligned', () => {
      const banners = getWarningBanners({ ethicalAiAligned: true });
      expect(banners).toEqual([]);
    });

    it('returns red banner when ethical AI is not aligned', () => {
      const banners = getWarningBanners({ ethicalAiAligned: false });
      expect(banners).toHaveLength(1);
      expect(banners[0].severity).toBe('red');
      expect(banners[0].id).toBe('ethical-misalignment');
    });

    it('returns amber banner when prohibited practices = yes', () => {
      const banners = getWarningBanners({ prohibitedPractices: 'yes' });
      expect(banners).toHaveLength(1);
      expect(banners[0].severity).toBe('amber');
      expect(banners[0].id).toBe('prohibited-practices');
    });

    it('returns no banner when prohibited practices = no', () => {
      const banners = getWarningBanners({ prohibitedPractices: 'no' });
      expect(banners).toEqual([]);
    });

    it('returns no banner when prohibited practices = none', () => {
      const banners = getWarningBanners({ prohibitedPractices: 'none' });
      expect(banners).toEqual([]);
    });

    it('returns both banners when both triggers active', () => {
      const banners = getWarningBanners({
        ethicalAiAligned: false,
        prohibitedPractices: 'yes',
      });
      expect(banners).toHaveLength(2);
      expect(banners.find((b) => b.severity === 'red')).toBeDefined();
      expect(banners.find((b) => b.severity === 'amber')).toBeDefined();
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
        businessArea: 'Insurance',
      });
      expect(progress.answered).toBe(2);
    });

    it('counts answered boolean questions', () => {
      const progress = calculateProgress({
        ethicalAiAligned: false,
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

    it('adjusts total based on visible questions', () => {
      const minProgress = calculateProgress({
        lifecycleStage: 'in_production',
        reflectedInBudget: 'none',
      });
      const maxProgress = calculateProgress({
        lifecycleStage: 'ideation',
        reflectedInBudget: 'yes',
      });
      expect(maxProgress.total).toBe(17);
      expect(minProgress.total).toBe(14);
    });

    it('returns estimated minutes remaining', () => {
      const progress = calculateProgress({});
      expect(progress.estimatedMinutes).toBeGreaterThan(0);
    });

    it('reduces estimated time as questions are answered', () => {
      const empty = calculateProgress({});
      const partial = calculateProgress({
        useCaseName: 'Test',
        solutionType: 'custom',
        businessPurpose: 'Testing the form',
        businessArea: 'Technology',
        useCaseOwner: 'John Doe',
        ethicalAiAligned: true,
      });
      expect(partial.estimatedMinutes).toBeLessThan(empty.estimatedMinutes);
    });
  });
});
