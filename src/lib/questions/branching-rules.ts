import { intakeQuestions } from '@/config/questions';

/**
 * Branching rules engine for the intake wizard.
 * Pure function: takes current form state, returns the set of visible question IDs.
 */
export interface IntakeFormState {
  solutionType?: string;
  lifecycleStage?: string;
  reflectedInBudget?: string;
  ethicalAiAligned?: boolean;
  prohibitedPractices?: string;
  [key: string]: unknown;
}

/** Lifecycle stages where target dates are relevant */
const DATE_RELEVANT_STAGES = new Set(['ideation', 'in_development', 'poc']);

/**
 * Returns the set of visible intake question IDs based on current form state.
 *
 * Rules:
 * 1. Lifecycle stage gates timeline: Q12, Q13 only when lifecycle = ideation | in_development | poc
 * 2. Budget gates value estimate: Q17 only when Q16 (budget) = yes | no (not "none")
 * 3. Solution type: "Existing Tool" is handled in sidebar classification, not question visibility
 * 4. High-risk triggers (Q6=No, Q7=Yes) are shown as warning banners, not question gating
 */
export function getVisibleIntakeQuestions(state: IntakeFormState): Set<string> {
  const visible = new Set<string>();

  // Always-visible questions (15 of 17)
  const alwaysVisible = [
    'intake-q1', // useCaseName
    'intake-q2', // solutionType
    'intake-q3', // businessPurpose
    'intake-q4', // businessArea
    'intake-q5', // useCaseOwner
    'intake-q6', // ethicalAiAligned
    'intake-q7', // prohibitedPractices
    'intake-q8', // lifecycleStage
    'intake-q9', // useStatus
    'intake-q10', // executiveSponsor
    'intake-q11', // strategicPriority
    'intake-q14', // valueDescription
    'intake-q15', // valueCreationLevers
    'intake-q16', // reflectedInBudget
  ];

  for (const id of alwaysVisible) {
    visible.add(id);
  }

  // Q12, Q13: Target dates — show when lifecycle is early stage
  if (DATE_RELEVANT_STAGES.has(state.lifecycleStage ?? '')) {
    visible.add('intake-q12'); // targetPocQuarter
    visible.add('intake-q13'); // targetProductionQuarter
  }

  // Q17: Value estimate — show when budget = yes or no (not "none" or unset)
  if (state.reflectedInBudget === 'yes' || state.reflectedInBudget === 'no') {
    visible.add('intake-q17'); // valueEstimate
  }

  return visible;
}

/**
 * Returns array of visible question IDs (ordered) for convenience.
 */
export function getVisibleQuestions(formState: Record<string, unknown>): string[] {
  const visibleSet = getVisibleIntakeQuestions(formState);
  return intakeQuestions.filter((q) => visibleSet.has(q.id)).map((q) => q.id);
}

/**
 * Returns the set of visible intake stage IDs based on current form state.
 * A stage is visible if at least one of its questions is visible.
 * The "review" stage is always visible.
 */
export function getVisibleIntakeStages(state: IntakeFormState): string[] {
  const visibleQuestions = getVisibleIntakeQuestions(state);

  const stageQuestionMap: Record<string, string[]> = {
    'quick-intake': [
      'intake-q1',
      'intake-q2',
      'intake-q3',
      'intake-q4',
      'intake-q5',
      'intake-q6',
      'intake-q7',
    ],
    'strategic-alignment': [
      'intake-q8',
      'intake-q9',
      'intake-q10',
      'intake-q11',
      'intake-q12',
      'intake-q13',
    ],
    'value-capture': ['intake-q14', 'intake-q15', 'intake-q16', 'intake-q17'],
    review: [],
  };

  return Object.entries(stageQuestionMap)
    .filter(
      ([stageId, questionIds]) =>
        stageId === 'review' || questionIds.some((id) => visibleQuestions.has(id)),
    )
    .map(([stageId]) => stageId);
}

/**
 * Detect warning banners that should be shown based on form state.
 */
export interface WarningBanner {
  id: string;
  severity: 'red' | 'amber';
  message: string;
}

export function getWarningBanners(state: IntakeFormState): WarningBanner[] {
  const banners: WarningBanner[] = [];

  if (state.ethicalAiAligned === false) {
    banners.push({
      id: 'ethical-misalignment',
      severity: 'red',
      message:
        'Ethical AI misalignment detected \u2014 governance team review required before proceeding',
    });
  }

  if (state.prohibitedPractices === 'yes') {
    banners.push({
      id: 'prohibited-practices',
      severity: 'amber',
      message: 'This use case involves regulated AI practices and will require enhanced review',
    });
  }

  return banners;
}

/**
 * Counts visible and answered questions for progress calculation.
 */
export function calculateProgress(state: IntakeFormState): {
  answered: number;
  total: number;
  percentage: number;
  estimatedMinutes: number;
} {
  const visibleQuestions = getVisibleIntakeQuestions(state);
  const total = visibleQuestions.size;

  const questionFieldMap: Record<string, string> = {};
  for (const q of intakeQuestions) {
    questionFieldMap[q.id] = q.field;
  }

  let answered = 0;
  for (const questionId of visibleQuestions) {
    const field = questionFieldMap[questionId];
    if (!field) continue;
    const value = state[field];
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'boolean') {
        answered++;
      } else if (Array.isArray(value) && value.length === 0) {
        // empty array doesn't count
      } else {
        answered++;
      }
    }
  }

  // ~0.5 min per remaining question
  const estimatedMinutes = Math.max(1, Math.ceil((total - answered) * 0.5));

  return {
    answered,
    total,
    percentage: total === 0 ? 0 : Math.round((answered / total) * 100),
    estimatedMinutes,
  };
}
