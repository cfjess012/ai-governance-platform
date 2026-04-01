import { assessmentQuestions } from '@/config/questions';

/**
 * Branching rules for the pre-production risk assessment.
 */
export interface AssessmentFormState {
  usesGenAi?: string;
  autonomousActions?: string;
  usesToolCalling?: string;
  involvesThirdParty?: string;
  deploymentRegions?: string[];
  businessActivities?: string[];
  [key: string]: unknown;
}

/**
 * Returns the set of visible assessment question IDs based on form state.
 *
 * Rules:
 * 1. GenAI gates: If usesGenAi=No, hide Q39 (adversarial testing) and Q41 (RAG)
 * 2. Agentic gates: If autonomousActions=No AND usesToolCalling=No, hide Q43 (max impact)
 * 3. Vendor gates: If involvesThirdParty=No, hide Q48-Q67 (entire vendor section)
 * 4. EU + regulated activity triggers FRIA banner (handled separately)
 */
export function getVisibleAssessmentQuestions(state: AssessmentFormState): Set<string> {
  const visible = new Set<string>();

  // Add all assessment questions first
  for (const q of assessmentQuestions) {
    visible.add(q.id);
  }

  // GenAI gates
  if (state.usesGenAi === 'no') {
    visible.delete('assess-q39'); // adversarialTesting
    visible.delete('assess-q41'); // usesRag
  }

  // Agentic AI gates
  if (state.autonomousActions === 'no' && state.usesToolCalling === 'no') {
    visible.delete('assess-q43'); // maxAutonomousImpact
  }

  // Vendor section gates (Q48-Q67)
  if (state.involvesThirdParty === 'no') {
    for (let i = 48; i <= 67; i++) {
      visible.delete(`assess-q${i}`);
    }
  }

  return visible;
}

/**
 * Returns visible assessment section IDs.
 */
export function getVisibleAssessmentSections(state: AssessmentFormState): string[] {
  const visibleQuestions = getVisibleAssessmentQuestions(state);

  const sectionQuestionMap: Record<string, string[]> = {
    'section-a': ['assess-q1', 'assess-q2', 'assess-q3', 'assess-q4', 'assess-q5'],
    'section-b': [
      'assess-q6',
      'assess-q7',
      'assess-q8',
      'assess-q9',
      'assess-q10',
      'assess-q11',
      'assess-q12',
    ],
    'section-c': [
      'assess-q13',
      'assess-q14',
      'assess-q15',
      'assess-q16',
      'assess-q17',
      'assess-q18',
      'assess-q19',
      'assess-q20',
      'assess-q21',
    ],
    'section-d': ['assess-q22', 'assess-q23', 'assess-q24', 'assess-q25', 'assess-q26'],
    'section-e': [
      'assess-q27',
      'assess-q28',
      'assess-q29',
      'assess-q30',
      'assess-q31',
      'assess-q32',
      'assess-q33',
      'assess-q34',
      'assess-q35',
      'assess-q36',
    ],
    'section-f': ['assess-q37', 'assess-q38', 'assess-q39'],
    'section-g': ['assess-q40', 'assess-q41', 'assess-q42', 'assess-q43'],
    'section-h': ['assess-q44', 'assess-q45', 'assess-q46'],
    'section-i': Array.from({ length: 20 }, (_, i) => `assess-q${47 + i}`),
    'assessment-review': [],
  };

  return Object.entries(sectionQuestionMap)
    .filter(
      ([sectionId, questionIds]) =>
        sectionId === 'assessment-review' || questionIds.some((id) => visibleQuestions.has(id)),
    )
    .map(([sectionId]) => sectionId);
}

/**
 * Detect if FRIA banner should be shown.
 */
export function shouldShowFriaBanner(state: AssessmentFormState): boolean {
  const hasEu = state.deploymentRegions?.includes('eu') ?? false;
  const activities = state.businessActivities ?? [];
  const regulatedActivities = [
    'insurance_decisions',
    'investment_decisions',
    'hr_automated_hiring',
    'pricing_underwriting',
  ];
  const hasRegulatedActivity = activities.some((a) => regulatedActivities.includes(a));
  return hasEu && hasRegulatedActivity;
}
