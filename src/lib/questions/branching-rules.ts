import { intakeQuestions } from '@/config/questions';

/**
 * Branching rules engine for the intake wizard.
 * Pure function: takes current form state, returns the set of visible question IDs.
 */
export interface IntakeFormState {
  thirdPartyInvolved?: string;
  usesFoundationModel?: string;
  deploymentRegions?: string[];
  lifecycleStage?: string;
  previouslyReviewed?: string;
  highRiskTriggers?: string[];
  [key: string]: unknown;
}

/**
 * Returns the set of visible intake question IDs based on current form state.
 *
 * Conditional rules:
 * 1. Q9a (vendorName) + Q9b (auditability): only when thirdPartyInvolved = "yes"
 * 2. Q10a (whichModels): only when usesFoundationModel = "yes"
 * 3. Q11a (deploymentRegionsOther): only when deploymentRegions includes "other"
 */
export function getVisibleIntakeQuestions(state: IntakeFormState): Set<string> {
  const visible = new Set<string>();

  // Always-visible questions
  const alwaysVisible = [
    // Section A
    'intake-q1', // useCaseName
    'intake-q2', // useCaseOwner
    'intake-q3', // executiveSponsor
    'intake-q4', // businessArea
    'intake-q5', // businessProblem
    'intake-q6', // howAiHelps
    'intake-q7', // aiType
    'intake-q8', // buildOrAcquire
    'intake-q9', // thirdPartyInvolved
    'intake-q10', // usesFoundationModel
    'intake-q11', // deploymentRegions
    'intake-q12', // lifecycleStage
    'intake-q13', // previouslyReviewed
    'intake-q14', // highRiskTriggers
    'intake-q15a', // whoUsesSystem
    'intake-q15b', // whoAffected
    'intake-q16', // worstOutcome
    // Section B
    'intake-q17', // dataSensitivity
    'intake-q18', // humanOversight
    'intake-q19', // differentialTreatment
    'intake-q20', // peopleAffectedCount
    'intake-q21', // additionalNotes
    // Section C
    'intake-q22', // strategicPriority
    'intake-q23', // targetPocQuarter
    'intake-q24', // targetProductionQuarter
    'intake-q25', // valueDescription
    'intake-q26', // valueCreationLevers
    'intake-q27', // reflectedInBudget
    'intake-q28', // valueEstimate
    'intake-q29', // reviewUrgency
  ];

  for (const id of alwaysVisible) {
    visible.add(id);
  }

  // Q9a, Q9b: Vendor sub-fields — show when thirdPartyInvolved = "yes"
  if (state.thirdPartyInvolved === 'yes') {
    visible.add('intake-q9a'); // vendorName
    visible.add('intake-q9b'); // auditability
  }

  // Q10a: Which models — show when usesFoundationModel = "yes"
  if (state.usesFoundationModel === 'yes') {
    visible.add('intake-q10a'); // whichModels
  }

  // Q11a: Other regions — show when deploymentRegions includes "other"
  const regions = Array.isArray(state.deploymentRegions) ? state.deploymentRegions : [];
  if (regions.includes('other')) {
    visible.add('intake-q11a'); // deploymentRegionsOther
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
    'section-a': [
      'intake-q1',
      'intake-q2',
      'intake-q3',
      'intake-q4',
      'intake-q5',
      'intake-q6',
      'intake-q7',
      'intake-q8',
      'intake-q9',
      'intake-q9a',
      'intake-q9b',
      'intake-q10',
      'intake-q10a',
      'intake-q11',
      'intake-q11a',
      'intake-q12',
      'intake-q13',
      'intake-q14',
      'intake-q15a',
      'intake-q15b',
      'intake-q16',
    ],
    'section-b': ['intake-q17', 'intake-q18', 'intake-q19', 'intake-q20', 'intake-q21'],
    'section-c': [
      'intake-q22',
      'intake-q23',
      'intake-q24',
      'intake-q25',
      'intake-q26',
      'intake-q27',
      'intake-q28',
      'intake-q29',
    ],
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
 * Detect inline banners that should be shown based on form state.
 * These appear contextually after specific questions.
 */
export interface InlineBanner {
  id: string;
  severity: 'info' | 'warning';
  message: string;
  /** Show this banner after this question ID */
  afterQuestionId: string;
}

export function getInlineBanners(state: IntakeFormState): InlineBanner[] {
  const banners: InlineBanner[] = [];

  // After Q11 (deploymentRegions): if non-US region selected
  const regions = Array.isArray(state.deploymentRegions) ? state.deploymentRegions : [];
  const hasNonUs = regions.some((r) => r !== 'us_only');
  if (hasNonUs && regions.length > 0) {
    banners.push({
      id: 'non-us-regions',
      severity: 'info',
      afterQuestionId: 'intake-q11a',
      message:
        'Use cases operating outside the US may be subject to additional regulations. The governance team will assess applicability during review.',
    });
  }

  // After Q13 (previouslyReviewed): if in production AND not previously reviewed
  if (state.lifecycleStage === 'in_production' && state.previouslyReviewed === 'no') {
    banners.push({
      id: 'unreviewed-production',
      severity: 'warning',
      afterQuestionId: 'intake-q13',
      message:
        "Because this system is already in production and hasn't been reviewed, this submission will be prioritized for assessment.",
    });
  }

  // After Q14 (highRiskTriggers): if any high-risk trigger selected (not just "none_of_above")
  const triggers = Array.isArray(state.highRiskTriggers) ? state.highRiskTriggers : [];
  const hasHighRisk = triggers.length > 0 && !triggers.every((t) => t === 'none_of_above');
  if (hasHighRisk) {
    banners.push({
      id: 'high-risk-triggers',
      severity: 'info',
      afterQuestionId: 'intake-q14',
      message:
        'Based on your answers, this use case will go through a comprehensive assessment. The governance team will reach out to schedule a review.',
    });
  }

  return banners;
}

/**
 * Detect warning banners that should be shown at the top of the form.
 * (Kept for backwards compatibility with WizardShell.)
 */
export interface WarningBanner {
  id: string;
  severity: 'red' | 'amber';
  message: string;
}

export function getWarningBanners(_state: IntakeFormState): WarningBanner[] {
  // Top-level banners removed in revised form — all banners are now inline
  return [];
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
